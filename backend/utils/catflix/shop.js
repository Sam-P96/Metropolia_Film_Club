const CatflixPet = require("../../models/catflixPetModel");
const CatflixPlayer = require("../../models/catflixPlayerModel");
const PetForm = require("../../models/petFormModel");
const { WalletError, spend } = require("../wallet");
const { salePrice } = require("../../../shared/events.js");
const { CATFLIX, nextRarity, rollRarity } = require("../../../shared/catflix/rules.js");
const { CatflixError } = require("./pets");

// Catflix No Chill's shop and Spell Deck (shared/catflix/rules.js has the
// prices): booster packs and their cards, aura crystals (half price in the
// Black Friday Sale), pet food, room styles, casting a card on your pet, and
// the Spell Forge. Everything here is cosmetic: PP buys looks, never points.
// Each buy takes PP first, then P-PP (utils/wallet.js spend), with a
// "catflixShop" receipt. Whatever's bought is claimed before the PP is
// taken, and handed back if the PP can't be, so two taps never pay twice.

const RECEIPT = { reason: "catflixShop" };

// A member's shop record (made the first time).
function playerOf(userId) {
    return CatflixPlayer.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).lean();
}

// What the page sees: food, packs, cards (only those they have), auras,
// room styles (Cozy always), and a Legendary choice waiting, if any.
function playerView(player) {
    const cards = Object.fromEntries(Object.entries(player.cards instanceof Map ? Object.fromEntries(player.cards) : (player.cards ?? {})).filter(([, count]) => count > 0));
    return {
        food: player.food,
        packs: { single: player.packs?.single ?? 0, triple: player.packs?.triple ?? 0, blackGold: player.packs?.blackGold ?? 0 },
        cards,
        auras: player.auras ?? [],
        styles: ["cozy", ...(player.styles ?? []).filter((style) => style !== "cozy")],
        aurasOn: player.aurasOn !== false,
        pending: player.pending ? { options: player.pending.options } : null,
    };
}

// Takes `price` for something already claimed; if the PP can't be taken,
// `undo` gives the claim back and the reason is thrown.
async function pay(userId, price, undo) {
    if (price <= 0) return;
    try {
        await spend(userId, price, RECEIPT);
    } catch (error) {
        await undo();
        throw error instanceof WalletError ? new CatflixError(error.message, error.status ?? 400) : error;
    }
}

// An aura crystal's price now: half in the Black Friday Sale.
const auraPrice = (key, now = new Date()) => salePrice({ id: `catflix.aura.${key}`, price: CATFLIX.auras[key].price }, now);

// Buys `item`: { item: "pack", kind } | { item: "aura", aura } |
// { item: "food" } | { item: "style", style }. Resolves to the player.
async function buy(userId, { item, kind, aura, style } = {}, now = new Date()) {
    await playerOf(userId);
    if (item === "pack") {
        const pack = CATFLIX.packs[kind];
        if (!pack) throw new CatflixError("There's no pack like that.");
        await CatflixPlayer.updateOne({ user: userId }, { $inc: { [`packs.${kind}`]: 1 } });
        await pay(userId, pack.price, () => CatflixPlayer.updateOne({ user: userId }, { $inc: { [`packs.${kind}`]: -1 } }));
    } else if (item === "aura") {
        if (!CATFLIX.auras[aura]) throw new CatflixError("There's no aura like that.");
        const claimed = await CatflixPlayer.updateOne({ user: userId, auras: { $ne: aura } }, { $addToSet: { auras: aura } });
        if (claimed.modifiedCount === 0) throw new CatflixError("You have that aura already.", 409);
        await pay(userId, auraPrice(aura, now), () => CatflixPlayer.updateOne({ user: userId }, { $pull: { auras: aura } }));
    } else if (item === "food") {
        const { price, servings, max } = CATFLIX.food;
        const claimed = await CatflixPlayer.updateOne({ user: userId, food: { $lte: max - servings } }, { $inc: { food: servings } });
        if (claimed.modifiedCount === 0) throw new CatflixError(`You can hold ${max} servings of food at most.`, 409);
        await pay(userId, price, () => CatflixPlayer.updateOne({ user: userId }, { $inc: { food: -servings } }));
    } else if (item === "style") {
        const info = CATFLIX.roomStyles[style];
        if (!info) throw new CatflixError("There's no room style like that.");
        if (info.price === 0) throw new CatflixError("That style is everyone's already.", 409);
        const claimed = await CatflixPlayer.updateOne({ user: userId, styles: { $ne: style } }, { $addToSet: { styles: style } });
        if (claimed.modifiedCount === 0) throw new CatflixError("You have that room style already.", 409);
        await pay(userId, info.price, () => CatflixPlayer.updateOne({ user: userId }, { $pull: { styles: style } }));
    } else {
        throw new CatflixError("The shop doesn't sell that.");
    }
    return playerView(await playerOf(userId));
}

// Every registered form's id, name and rarity, for rolling cards.
const allForms = () => PetForm.find().select("name rarity").lean();

// A card of `rarity` from `forms`, or of the nearest rarity that has any
// (the Spell Forge); `strict` false falls back to a Common, then to anything
// (booster packs).
function cardOf(forms, rarity, random, { nearest = false } = {}) {
    const of = (key) => forms.filter((form) => (form.rarity || "common") === key);
    if (nearest) {
        const order = CATFLIX.rarities;
        const at = order.indexOf(rarity);
        for (let distance = 0; distance < order.length; distance++) {
            for (const index of [at - distance, at + distance]) {
                const pool = index >= 0 && index < order.length ? of(order[index]) : [];
                if (pool.length) return pool[Math.floor(random() * pool.length)];
            }
        }
        return null;
    }
    const pool = of(rarity).length ? of(rarity) : of("common").length ? of("common") : forms;
    return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}

const cardView = (form, had) => ({ _id: form._id, name: form.name, rarity: form.rarity || "common", isNew: !had });

// Opens one of their `kind` packs: each card rolled on its own (CATFLIX.odds)
// from the registered forms, into their deck. Resolves to { cards, player }.
async function openPack(userId, kind, { random = Math.random } = {}) {
    const pack = CATFLIX.packs[kind];
    if (!pack) throw new CatflixError("There's no pack like that.");
    const forms = await allForms();
    if (forms.length === 0) throw new CatflixError("There are no pets to pull yet: come back soon.", 409);
    const player = await CatflixPlayer.findOneAndUpdate({ user: userId, [`packs.${kind}`]: { $gte: 1 } }, { $inc: { [`packs.${kind}`]: -1 } }, { returnDocument: "before" }).lean();
    if (!player) throw new CatflixError(`You have no ${pack.name}s to open.`, 409);
    const had = new Map(Object.entries(player.cards ?? {}));
    const cards = [];
    for (let i = 0; i < pack.cards; i++) {
        const form = cardOf(forms, rollRarity(random), random);
        cards.push(cardView(form, (had.get(form._id) ?? 0) > 0 || cards.some((card) => card._id === form._id)));
    }
    const inc = {};
    for (const card of cards) inc[`cards.${card._id}`] = (inc[`cards.${card._id}`] ?? 0) + 1;
    await CatflixPlayer.updateOne({ user: userId }, { $inc: inc });
    return { cards, player: playerView(await playerOf(userId)) };
}

// The Spell Forge: three of their cards (any, the same one up to as many
// times as they have it) for one random card a rarity above the lowest of
// them (or the nearest rarity with any forms). Three Legendaries: up to 10
// random Legendaries offered instead, to keep the one they choose
// (takeLegendary). Resolves to { card, player } or { options, player }.
async function forgeCards(userId, ids, { random = Math.random } = {}) {
    if (!Array.isArray(ids) || ids.length !== CATFLIX.forgeCards || !ids.every((id) => typeof id === "string" && /^[a-z0-9]{4,40}$/i.test(id))) {
        throw new CatflixError(`Put in ${CATFLIX.forgeCards} cards.`);
    }
    const before = await playerOf(userId);
    if (before.pending) throw new CatflixError("Choose your Legendary first.", 409);
    const forms = await allForms();
    const formById = new Map(forms.map((form) => [form._id, form]));
    if (!ids.every((id) => formById.has(id))) throw new CatflixError("One of those cards is gone.");
    const need = {};
    for (const id of ids) need[id] = (need[id] ?? 0) + 1;
    const filter = { user: userId, pending: null };
    const inc = {};
    for (const [id, count] of Object.entries(need)) {
        filter[`cards.${id}`] = { $gte: count };
        inc[`cards.${id}`] = -count;
    }
    const taken = await CatflixPlayer.updateOne(filter, { $inc: inc });
    if (taken.modifiedCount === 0) throw new CatflixError("You don't have those cards any more.", 409);

    const rarities = ids.map((id) => formById.get(id).rarity || "common");
    if (rarities.every((rarity) => rarity === "legendary")) {
        const legendaries = forms.filter((form) => form.rarity === "legendary").map((form) => form._id);
        const options = legendaries.sort(() => random() - 0.5).slice(0, 10);
        await CatflixPlayer.updateOne({ user: userId }, { $set: { pending: { options, at: new Date() } } });
        return { options, player: playerView(await playerOf(userId)) };
    }
    const lowest = CATFLIX.rarities[Math.min(...rarities.map((rarity) => CATFLIX.rarities.indexOf(rarity)))];
    const form = cardOf(forms, nextRarity(lowest) ?? "legendary", random, { nearest: true });
    const had = (before.cards?.[form._id] ?? 0) - (need[form._id] ?? 0) > 0;
    await CatflixPlayer.updateOne({ user: userId }, { $inc: { [`cards.${form._id}`]: 1 } });
    return { card: cardView(form, had), player: playerView(await playerOf(userId)) };
}

// Keeps the Legendary they chose from the ones offered; the rest are gone.
async function takeLegendary(userId, formId) {
    const player = await CatflixPlayer.findOneAndUpdate(
        { user: userId, "pending.options": formId },
        { $set: { pending: null }, $inc: { [`cards.${formId}`]: 1 } },
        { returnDocument: "after" }
    ).lean();
    if (!player) throw new CatflixError("That isn't one of the Legendaries on offer.", 409);
    return playerView(player);
}

// ---- Their pet's looks ----

async function petOrThrow(userId) {
    const pet = await CatflixPet.findOne({ owner: userId }).select("_id").lean();
    if (!pet) throw new CatflixError("You need a pet first: hatch your egg.", 409);
    return pet;
}

// Casts one of their cards: their pet looks like it from now on (the card
// stays in the deck).
async function cast(userId, formId) {
    await petOrThrow(userId);
    const player = await playerOf(userId);
    if (!((player.cards?.[formId] ?? 0) > 0)) throw new CatflixError("That card isn't in your deck.");
    if (!(await PetForm.exists({ _id: formId }))) throw new CatflixError("That card's pet is gone.");
    await CatflixPet.updateOne({ owner: userId }, { $set: { skinId: formId } });
}

// Their pet's room style: Cozy, or one they've bought.
async function setStyle(userId, style) {
    await petOrThrow(userId);
    const player = await playerOf(userId);
    if (!playerView(player).styles.includes(style)) throw new CatflixError("Buy that room style in the shop first.");
    await CatflixPet.updateOne({ owner: userId }, { $set: { roomStyle: style } });
}

// Their pet's aura: one they've bought, or none (null).
async function setAura(userId, aura) {
    await petOrThrow(userId);
    if (aura !== null) {
        const player = await playerOf(userId);
        if (!(player.auras ?? []).includes(aura)) throw new CatflixError("Buy that aura crystal in the shop first.");
    }
    await CatflixPet.updateOne({ owner: userId }, { $set: { aura } });
}

// Whether they see auras in the game.
async function setAurasOn(userId, on) {
    await playerOf(userId);
    await CatflixPlayer.updateOne({ user: userId }, { $set: { aurasOn: on === true } });
}

module.exports = { playerOf, playerView, auraPrice, buy, openPack, forgeCards, takeLegendary, cast, setStyle, setAura, setAurasOn };
