const mongoose = require("mongoose");
const User = require("../../models/userModel");
const CatflixPet = require("../../models/catflixPetModel");
const CatflixPlayer = require("../../models/catflixPlayerModel");
const CatflixTrade = require("../../models/catflixTradeModel");
const Notification = require("../../models/notificationModel");
const PetForm = require("../../models/petFormModel");
const { WalletError, changeWallet } = require("../wallet");
const { MEMBER_FIELDS, userSummary } = require("../serialize");
const { CATFLIX } = require("../../../shared/catflix/rules.js");
const { CatflixError, friendIdsOf } = require("./pets");
const { playerOf } = require("./shop");

// Trade Spell (the Spell Deck's trades): a member offers a friend a card
// (and points, if they like); the friend has 3 days to answer with what
// they'll give for it (a card, a card and points, or just points); then the
// one who offered has 3 days to take it. Only friends (members who follow
// each other). Each side's card and points are held in the trade from the
// moment they're put in (out of the deck and the wallet: "catflixTrade"
// receipts), handed across if it's taken (points always arrive as P-PP,
// however they were paid, like every other win on the site), and back
// ("catflixTradeBack", in the coins they were paid in) if it isn't: turned
// down, taken back, or not answered in time. Pinned
// notifications tell each side when it's their turn (utils/notify.js).

const RULES = CATFLIX.trades;
const DAY = 24 * 60 * 60 * 1000;
const OPEN = ["offered", "countered"];
const isCard = (id) => typeof id === "string" && /^[a-z0-9]{4,40}$/i.test(id);

const asCatflix = (error) => (error instanceof WalletError ? new CatflixError(error.message, error.status ?? 400) : error);

// ---- Putting things in, and giving them out ----

// Takes one `card` out of their deck for a trade: never the last copy of the
// card their pet is wearing.
async function takeCard(userId, card) {
    if (!(await PetForm.exists({ _id: card }))) throw new CatflixError("That card's pet is gone.");
    await playerOf(userId);
    const pet = await CatflixPet.findOne({ owner: userId }).select("skinId").lean();
    const wearing = pet?.skinId === card;
    const taken = await CatflixPlayer.updateOne({ user: userId, [`cards.${card}`]: { $gte: wearing ? 2 : 1 } }, { $inc: { [`cards.${card}`]: -1 } });
    if (taken.modifiedCount === 0) {
        throw new CatflixError(wearing ? "Your cat's wearing your only copy of that card: cast another one first." : "That card isn't in your deck.", 409);
    }
}

async function giveCard(userId, card) {
    if (!card) return;
    await playerOf(userId);
    await CatflixPlayer.updateOne({ user: userId }, { $inc: { [`cards.${card}`]: 1 } });
}

// Takes `points` from their wallet for a trade, PP first, then P-PP.
// Resolves to how it was paid: { pp, ppp }.
async function takePoints(userId, points, { other, trade }) {
    if (!points) return { pp: 0, ppp: 0 };
    const taken = await changeWallet(
        userId,
        (wallet) => {
            if (wallet.pp + wallet.ppp < points) throw new WalletError(`You need ${points} points for that, and you have ${wallet.pp + wallet.ppp}.`);
            const fromPp = Math.min(wallet.pp, points);
            return { pp: 0 - fromPp, ppp: 0 - (points - fromPp) };
        },
        { reason: "catflixTrade", other, catflix: trade }
    ).catch((error) => {
        throw asCatflix(error);
    });
    return { pp: 0 - taken.pp, ppp: 0 - taken.ppp };
}

// Gives points held in a trade: `across` to the other side, all as P-PP
// (100 PP and 200 P-PP put in: 300 P-PP); back to whoever put them in, as
// they paid them.
async function givePoints(userId, paid, { reason, other, trade, across = false }) {
    if (!paid || paid.pp + paid.ppp <= 0) return;
    const change = across ? { pp: 0, ppp: paid.pp + paid.ppp } : { pp: paid.pp, ppp: paid.ppp };
    await changeWallet(userId, () => change, { reason, other, catflix: trade });
}

// Puts a side in: its card, then its points (the card back if the points
// can't be had). Resolves to the side as kept: { card, points, paid }.
async function putIn(userId, { card, points }, { other, trade }) {
    if (card) await takeCard(userId, card);
    try {
        const paid = await takePoints(userId, points, { other, trade });
        return { card: card || null, points, paid };
    } catch (error) {
        if (card) await giveCard(userId, card);
        throw error;
    }
}

// Hands a side to `userId`: back to whoever put it in, or `across` to the
// other side (its points as P-PP).
async function hand(userId, side, { reason, other, trade, across = false }) {
    if (!side) return;
    await giveCard(userId, side.card);
    await givePoints(userId, side.paid, { reason, other, trade, across });
}

// What a side says: a card (a registered form's id, or none) and points
// (a whole number, 0 for none).
function sideFrom({ card, points } = {}, { cardNeeded }) {
    const wanted = card === undefined || card === null || card === "" ? null : card;
    if (wanted !== null && !isCard(wanted)) throw new CatflixError("That isn't a card.");
    const amount = points === undefined || points === null || points === "" ? 0 : Number(points);
    if (!Number.isInteger(amount) || amount < 0 || amount > RULES.maxPoints) throw new CatflixError(`Points are a whole number from 0 to ${RULES.maxPoints.toLocaleString("en-US")}.`);
    if (cardNeeded && !wanted) throw new CatflixError("Pick a card to offer.");
    if (!wanted && amount === 0) throw new CatflixError("Put in a card, points, or both.");
    return { card: wanted, points: amount };
}

// ---- Notifications ----

const note = (recipient, type, trade, actor, pinned = false) => Notification.create({ recipient, type, trade: trade._id, actors: [actor], ...(pinned && { pinned: true }) });
const clearPinned = (trade) => Notification.deleteMany({ trade: trade._id, type: { $in: ["tradeOffer", "tradeCounter"] } });

// ---- What the page sees ----

// Each trade as the page shows it, to `viewerId`: who's who, both sides
// (with each card's name and rarity), whose turn it is, and when it ends.
async function tradeViews(trades, viewerId) {
    const cards = [...new Set(trades.flatMap((trade) => [trade.offer?.card, trade.counter?.card]).filter(Boolean))];
    const people = [...new Set(trades.flatMap((trade) => [String(trade.from), String(trade.to)]))];
    const [forms, users] = await Promise.all([
        PetForm.find({ _id: { $in: cards } }).select("name rarity").lean(),
        User.find({ _id: { $in: people } }).select(MEMBER_FIELDS).lean(),
    ]);
    const formBy = new Map(forms.map((form) => [form._id, form]));
    const userBy = new Map(users.map((user) => [String(user._id), userSummary(user)]));
    const side = (s) =>
        s ? { card: s.card, cardName: s.card ? (formBy.get(s.card)?.name ?? "A card that's gone") : null, rarity: s.card ? (formBy.get(s.card)?.rarity ?? "common") : null, points: s.points } : null;
    return trades.map((trade) => {
        const mine = String(trade.from) === String(viewerId);
        return {
            id: String(trade._id),
            status: trade.status,
            mine,
            from: userBy.get(String(trade.from)) ?? { _id: trade.from, username: "Someone" },
            to: userBy.get(String(trade.to)) ?? { _id: trade.to, username: "Someone" },
            offer: side(trade.offer),
            counter: side(trade.counter),
            // Whose move it is: the friend answering an offer, or the one who offered taking the answer.
            yourTurn: (trade.status === "offered" && !mine) || (trade.status === "countered" && mine),
            expiresAt: trade.expiresAt,
            createdAt: trade.createdAt,
        };
    });
}

// Their open trades (started by them or offered to them), soonest to end
// first, and their friends to offer one to (A to Z).
async function tradesOf(userId) {
    const [trades, friendIds] = await Promise.all([
        CatflixTrade.find({ $or: [{ from: userId }, { to: userId }], status: { $in: OPEN } }).sort({ expiresAt: 1 }).lean(),
        friendIdsOf(userId),
    ]);
    const friends = await User.find({ _id: { $in: friendIds } }).select(MEMBER_FIELDS).collation({ locale: "en", strength: 2 }).sort({ username: 1 }).lean();
    return { trades: await tradeViews(trades, userId), friends: friends.map(userSummary) };
}

// One trade, if it's theirs (either side): its view, or null.
async function tradeOf(userId, tradeId) {
    if (!mongoose.isValidObjectId(tradeId)) return null;
    const trade = await CatflixTrade.findOne({ _id: tradeId, $or: [{ from: userId }, { to: userId }] }).lean();
    return trade ? (await tradeViews([trade], userId))[0] : null;
}

// ---- The moves ----

// `fromId` offers friend `to` a card (and points). Their card and points
// are held from now. Resolves to the trade.
async function offer(fromId, { to, card, points } = {}, now = new Date()) {
    if (!mongoose.isValidObjectId(to)) throw new CatflixError("Pick a friend to trade with.");
    if (String(to) === String(fromId)) throw new CatflixError("You can't trade with yourself.");
    const friends = (await friendIdsOf(fromId)).map(String);
    if (!friends.includes(String(to))) throw new CatflixError("You can only trade with friends: members you follow who follow you back.", 403);
    const wanted = sideFrom({ card, points }, { cardNeeded: true });
    if ((await CatflixTrade.countDocuments({ from: fromId, status: { $in: OPEN } })) >= RULES.openMax) {
        throw new CatflixError(`You have ${RULES.openMax} trades open: wait for one to finish first.`, 409);
    }

    const _id = new mongoose.Types.ObjectId();
    const side = await putIn(fromId, wanted, { other: to, trade: _id });
    const trade = await CatflixTrade.create({ _id, from: fromId, to, offer: side, expiresAt: new Date(now.getTime() + RULES.answerDays * DAY) });
    await note(to, "tradeOffer", trade, fromId, true);
    return trade;
}

// The friend answers an offer: what they'll give for it. Held from now;
// the one who offered then has 3 days to take it.
async function counter(userId, tradeId, { card, points } = {}, now = new Date()) {
    if (!mongoose.isValidObjectId(tradeId)) throw new CatflixError("That trade isn't there any more.", 404);
    const trade = await CatflixTrade.findOne({ _id: tradeId, to: userId, status: "offered", expiresAt: { $gt: now } }).lean();
    if (!trade) throw new CatflixError("That trade isn't waiting on you any more.", 404);
    const wanted = sideFrom({ card, points }, { cardNeeded: false });

    const side = await putIn(userId, wanted, { other: trade.from, trade: trade._id });
    const answered = await CatflixTrade.findOneAndUpdate(
        { _id: trade._id, status: "offered", expiresAt: { $gt: now } },
        { $set: { status: "countered", counter: side, counteredAt: now, expiresAt: new Date(now.getTime() + RULES.answerDays * DAY) } },
        { returnDocument: "after" }
    ).lean();
    if (!answered) {
        await hand(userId, side, { reason: "catflixTradeBack", other: trade.from, trade: trade._id });
        throw new CatflixError("That trade isn't waiting on you any more.", 404);
    }
    await clearPinned(answered);
    await note(answered.from, "tradeCounter", answered, userId, true);
    return answered;
}

// The one who offered takes the answer: each gets the other's side.
async function accept(userId, tradeId, now = new Date()) {
    if (!mongoose.isValidObjectId(tradeId)) throw new CatflixError("That trade isn't there any more.", 404);
    const trade = await CatflixTrade.findOneAndUpdate(
        { _id: tradeId, from: userId, status: "countered", expiresAt: { $gt: now } },
        { $set: { status: "accepted", settledAt: now } },
        { returnDocument: "after" }
    ).lean();
    if (!trade) throw new CatflixError("That trade isn't waiting on you any more.", 404);
    await hand(trade.from, trade.counter, { reason: "catflixTrade", other: trade.to, trade: trade._id, across: true });
    await hand(trade.to, trade.offer, { reason: "catflixTrade", other: trade.from, trade: trade._id, across: true });
    await clearPinned(trade);
    await note(trade.to, "tradeDone", trade, userId);
    return trade;
}

// Turns a trade down, or takes it back: the friend turning down an offer,
// the one who offered turning down the answer, or taking back an offer
// that hasn't been answered (cancelled). Everything held goes back.
async function decline(userId, tradeId, now = new Date()) {
    if (!mongoose.isValidObjectId(tradeId)) throw new CatflixError("That trade isn't there any more.", 404);
    const found = await CatflixTrade.findOne({ _id: tradeId, $or: [{ from: userId }, { to: userId }], status: { $in: OPEN } }).lean();
    if (!found) throw new CatflixError("That trade's already over.", 404);
    const mine = String(found.from) === String(userId);
    if (!mine && found.status === "countered") throw new CatflixError("You've answered: it's up to them now.", 409);
    const status = mine && found.status === "offered" ? "cancelled" : "declined";
    const trade = await CatflixTrade.findOneAndUpdate({ _id: found._id, status: found.status }, { $set: { status, settledAt: now } }, { returnDocument: "after" }).lean();
    if (!trade) throw new CatflixError("That trade's already over.", 404);
    await giveBack(trade);
    await clearPinned(trade);
    // The other side hears it was turned down (not that an offer was taken back before they answered).
    if (status === "declined") await note(mine ? trade.to : trade.from, "tradeDeclined", trade, userId);
    return trade;
}

// Everything held in a trade that didn't happen goes back where it came from.
async function giveBack(trade) {
    await hand(trade.from, trade.offer, { reason: "catflixTradeBack", other: trade.to, trade: trade._id });
    await hand(trade.to, trade.counter, { reason: "catflixTradeBack", other: trade.from, trade: trade._id });
}

// Every minute (jobs/catflixSweep.js): trades not answered in time end,
// everything held goes back, and whoever was waiting hears. Resolves to
// how many.
async function sweepTrades(now = new Date()) {
    const due = await CatflixTrade.find({ status: { $in: OPEN }, expiresAt: { $lte: now } }).select("_id status").lean();
    let count = 0;
    for (const { _id, status } of due) {
        const trade = await CatflixTrade.findOneAndUpdate({ _id, status }, { $set: { status: "expired", settledAt: now } }, { returnDocument: "after" }).lean();
        if (!trade) continue;
        await giveBack(trade);
        await clearPinned(trade);
        // Waiting on the friend's answer: the one who offered hears; waiting on them to take it: the friend does.
        if (status === "offered") await note(trade.from, "tradeExpired", trade, trade.to);
        else await note(trade.to, "tradeExpired", trade, trade.from);
        count += 1;
    }
    return count;
}

// A member deleting their account: their open trades end, and the other
// side gets back what they'd put in. Then every trade of theirs goes.
async function forgetTrades(userId) {
    const open = await CatflixTrade.find({ $or: [{ from: userId }, { to: userId }], status: { $in: OPEN } }).lean();
    for (const trade of open) {
        const ended = await CatflixTrade.findOneAndUpdate({ _id: trade._id, status: trade.status }, { $set: { status: "cancelled", settledAt: new Date() } }, { returnDocument: "after" }).lean();
        if (!ended) continue;
        const theyFrom = String(ended.from) !== String(userId);
        await hand(theyFrom ? ended.from : ended.to, theyFrom ? ended.offer : ended.counter, { reason: "catflixTradeBack", other: null, trade: ended._id });
    }
    const all = await CatflixTrade.find({ $or: [{ from: userId }, { to: userId }] }).select("_id").lean();
    await Notification.deleteMany({ trade: { $in: all.map((trade) => trade._id) } });
    await CatflixTrade.deleteMany({ $or: [{ from: userId }, { to: userId }] });
}

module.exports = { tradesOf, tradeOf, tradeViews, offer, counter, accept, decline, sweepTrades, forgetTrades };
