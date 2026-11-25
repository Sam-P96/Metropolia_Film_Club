const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const CatflixPet = require("../models/catflixPetModel");
const User = require("../models/userModel");
const { requireAuth } = require("../middleware/auth");
const { MEMBER_FIELDS, userSummary } = require("../utils/serialize");
const forge = require("../utils/petForge");
const pets = require("../utils/catflix/pets");
const shop = require("../utils/catflix/shop");
const toys = require("../utils/catflix/toys");
const visits = require("../utils/catflix/visits");
const trades = require("../utils/catflix/trades");
const ruinRun = require("../utils/catflix/ruinRun");
const kittyRace = require("../utils/catflix/kittyRace");
const { WalletError } = require("../utils/wallet");
const { CATFLIX } = require("../../shared/catflix/rules.js");

// Catflix No Chill, for logged-in members (utils/catflix/): your pet, its
// care, the Room Room, the shop and the Spell Deck. Every answer that
// changes something comes back with the new state to show.
//   /app/                       the game's page, for anyone (it's only code):
//                               Pet Forge's page (public/pet-forge/), which
//                               plays the real game when it's opened here
//   GET  /me                    { pet, player, prices, points }: yours,
//                               caught up, and the PP and P-PP you have
//   GET  /forms                 every pet's looks (Pet Forge's forms), for anyone
//   GET  /pets?users=a,b        pets of those members, for profiles and the
//                               leaderboard: { pets: { userId: pet } }
//   POST /egg/crack             the free egg's 100 taps done: { skinId }
//   POST /egg/hatch  { name }   the free egg, hatched
//   POST /care       { petId, kind }   feed, brush, scoop, praise, scold
//   GET  /visit/:petId          another member's pet, for a Play Date (and you're
//                               in its room: its owner sees your cat there)
//   POST /visit/:petId/here     still in its room (every few seconds)
//   POST /visit/:petId/leave    gone home
//   GET  /guests                the cats visiting yours right now: { pets }
//   GET  /trades                Trade Spell: your open trades and your friends
//   GET  /trades/:id            one of your trades (open or not): { trade }
//   POST /trades  { to, card, points }        offer a friend a card (and points)
//   POST /trades/:id/counter { card, points } answer an offer
//   POST /trades/:id/accept                   take the answer
//   POST /trades/:id/decline                  turn it down, or take your offer back
//   (each move answers with your trades and friends, and `player` and `points`)
//   GET  /room?map=             a visit to the Room Room
//   POST /room/act   { targetId, action }   play, pet or bully
//   POST /shop/buy   { item, kind | aura | style }   (a ball: { item: "ball", kind })
//   POST /toy/knock  { petId, ball }   a pet in the room knocked your ball
//                               about: +5 happiness for it, a knock off the
//                               ball (utils/catflix/toys.js): { pet, player, left }
//   POST /packs/open { kind }
//   POST /deck/forge { ids }    POST /deck/legendary { formId }
//   POST /deck/cast  { formId }
//   POST /pet/style  { style }  POST /pet/aura { aura | null }
//   POST /settings   { aurasOn }
// Ruin Run (utils/catflix/ruinRun.js): every answer carries `status` (cash-
// outs left today, a run waiting, their best) and `points`.
//   GET  /run                   where they stand
//   POST /run        { bet }    a new run (0: free play): its id and seed
//   POST /run/:id/finish { inputs, endTick }   played again here: { run, pet }
//   POST /run/:id/cashout       POST /run/:id/discard
// Nekomusume: Kitty Race (utils/catflix/kittyRace.js): every answer carries
// `races` ({ mine, open, live }), `points` and the race's `rules`.
//   GET  /race                  their race, their friends' open ones, and races on now to watch
//   POST /race       { bet, solo }   open one, on a random track (solo: it starts at once)
//   POST /race/:id/join { bet } POST /race/:id/leave   POST /race/:id/start
//   GET  /race/:id              one race, to watch (polled while it plays): { race }
//   POST /race/:id/throw { item, lane }   a cheat item thrown at a cat: { race, player }
const router = express.Router();
router.use("/app", express.static(path.join(__dirname, "..", "public", "pet-forge"), { maxAge: 0 }));
// Every pet's looks, for anyone too: the Games page shows the game's logo (the
// first registered form) to visitors who aren't logged in. Only looks.
router.get("/forms", (req, res, next) => forge.everything().then((forms) => res.json(forms), next));
router.use(requireAuth);

// Runs `work`, and answers with what it gives, or with why not.
const handle = (work) => async (req, res) => {
    try {
        res.json((await work(req)) ?? { ok: true });
    } catch (error) {
        if (error instanceof pets.CatflixError || error instanceof WalletError) return res.status(error.status ?? 400).json({ error: error.message });
        throw error;
    }
};

// Aura prices right now (half in the Black Friday Sale).
const prices = () => Object.fromEntries(Object.keys(CATFLIX.auras).map((key) => [key, shop.auraPrice(key)]));

// Theirs: their pet (or null: they have the egg to hatch), their things, and
// the points they have (PP and P-PP together), for the shop.
async function me(userId) {
    const [pet, player, user] = await Promise.all([pets.petOf(userId), shop.playerOf(userId), User.findById(userId).select("wallet").lean()]);
    return { pet: pets.petView(pet, userId), player: shop.playerView(player), prices: prices(), points: (user?.wallet?.pp ?? 0) + (user?.wallet?.ppp ?? 0) };
}

router.get("/me", handle((req) => me(req.user._id)));

router.get(
    "/pets",
    handle(async (req) => {
        const ids = String(req.query.users ?? "").split(",").filter((id) => mongoose.isValidObjectId(id)).slice(0, 50);
        const found = await CatflixPet.find({ owner: { $in: ids } }).select("owner name skinId aura").lean();
        return { pets: Object.fromEntries(found.map((pet) => [String(pet.owner), { _id: pet._id, name: pet.name, skinId: pet.skinId, aura: pet.aura }])) };
    })
);

router.post("/egg/crack", handle((req) => pets.crackEgg(req.user._id)));
router.post(
    "/egg/hatch",
    handle(async (req) => {
        await pets.hatch(req.user._id, req.body?.name);
        return me(req.user._id);
    })
);

router.post(
    "/care",
    handle(async (req) => {
        const pet = await pets.care(req.user._id, req.body?.petId, req.body?.kind);
        return { pet: pets.petView(pet, req.user._id), player: shop.playerView(await shop.playerOf(req.user._id)) };
    })
);

router.get(
    "/visit/:petId",
    handle(async (req) => {
        if (!mongoose.isValidObjectId(req.params.petId)) throw new pets.CatflixError("That pet doesn't exist.", 404);
        const found = await CatflixPet.findById(req.params.petId).select("owner").lean();
        if (!found) throw new pets.CatflixError("That pet doesn't exist.", 404);
        const [pet, owner] = await Promise.all([pets.petOf(found.owner), User.findById(found.owner).select(MEMBER_FIELDS).lean()]);
        await visits.here(req.user._id, found._id);
        return { pet: pets.petView(pet, req.user._id, owner ? userSummary(owner) : null) };
    })
);
router.post("/visit/:petId/here", handle(async (req) => (await visits.here(req.user._id, req.params.petId), {})));
router.post("/visit/:petId/leave", handle(async (req) => (await visits.leave(req.user._id, req.params.petId), {})));
router.get("/guests", handle(async (req) => ({ pets: await visits.guestsOf(req.user._id) })));

// ---- Trade Spell ----
const withTrades = (work) =>
    handle(async (req) => {
        await work(req);
        const [list, player, points] = await Promise.all([trades.tradesOf(req.user._id), shop.playerOf(req.user._id), ruinRun.pointsOf(req.user._id)]);
        return { ...list, player: shop.playerView(player), points };
    });
router.get("/trades", withTrades(() => null));
router.get(
    "/trades/:id",
    handle(async (req) => {
        const trade = await trades.tradeOf(req.user._id, req.params.id);
        if (!trade) throw new pets.CatflixError("That trade isn't there any more.", 404);
        return { trade };
    })
);
router.post("/trades", withTrades((req) => trades.offer(req.user._id, req.body ?? {})));
router.post("/trades/:id/counter", withTrades((req) => trades.counter(req.user._id, req.params.id, req.body ?? {})));
router.post("/trades/:id/accept", withTrades((req) => trades.accept(req.user._id, req.params.id)));
router.post("/trades/:id/decline", withTrades((req) => trades.decline(req.user._id, req.params.id)));

router.get("/room", handle((req) => pets.roomVisit(req.user._id, String(req.query.map ?? ""))));

router.post(
    "/room/act",
    handle(async (req) => {
        const { mine, theirs, outcome } = await pets.act(req.user._id, req.body?.targetId, req.body?.action);
        return { mine: pets.petView(mine, req.user._id), theirs: pets.petView(theirs, req.user._id), outcome };
    })
);

router.post("/shop/buy", handle(async (req) => ({ player: await shop.buy(req.user._id, req.body ?? {}) })));
router.post(
    "/toy/knock",
    handle(async (req) => {
        const { pet, left } = await toys.knock(req.user._id, req.body?.petId, req.body?.ball);
        return { pet: pets.petView(pet, req.user._id), player: shop.playerView(await shop.playerOf(req.user._id)), left };
    })
);
router.post("/packs/open", handle((req) => shop.openPack(req.user._id, req.body?.kind)));
router.post("/deck/forge", handle((req) => shop.forgeCards(req.user._id, req.body?.ids)));
router.post("/deck/legendary", handle(async (req) => ({ player: await shop.takeLegendary(req.user._id, String(req.body?.formId ?? "")) })));

// The rest change their pet's looks: answered with everything, as /me.
const andMe = (work) =>
    handle(async (req) => {
        await work(req);
        return me(req.user._id);
    });
router.post("/deck/cast", andMe((req) => shop.cast(req.user._id, String(req.body?.formId ?? ""))));
router.post("/pet/style", andMe((req) => shop.setStyle(req.user._id, String(req.body?.style ?? ""))));
router.post("/pet/aura", andMe((req) => shop.setAura(req.user._id, req.body?.aura === null ? null : String(req.body?.aura ?? ""))));
router.post("/settings", andMe((req) => shop.setAurasOn(req.user._id, req.body?.aurasOn)));

// ---- Ruin Run ----
const withRun = (work) =>
    handle(async (req) => {
        const result = (await work(req)) ?? {};
        const [status, points] = await Promise.all([ruinRun.statusOf(req.user._id), ruinRun.pointsOf(req.user._id)]);
        return { ...result, status, points };
    });
router.get("/run", withRun(() => ({})));
router.post("/run", withRun(async (req) => ({ run: await ruinRun.startRun(req.user._id, Number(req.body?.bet)) })));
router.post("/run/:id/finish", withRun((req) => ruinRun.finishRun(req.user._id, req.params.id, { inputs: req.body?.inputs, endTick: req.body?.endTick })));
router.post("/run/:id/cashout", withRun((req) => ruinRun.cashOut(req.user._id, req.params.id)));
router.post("/run/:id/discard", withRun(async (req) => ({ run: await ruinRun.discard(req.user._id, req.params.id) })));

// ---- Nekomusume: Kitty Race ----
const withRaces = (work) =>
    handle(async (req) => {
        await work(req);
        const [races, points] = await Promise.all([kittyRace.racesFor(req.user._id), ruinRun.pointsOf(req.user._id)]);
        const { racers, maxBet, bets, pays, lobbyMinutes, winnerMs, cheats } = kittyRace.RULES;
        return { races, points, rules: { racers, maxBet, bets, pays, lobbyMinutes, winnerMs, cheats } };
    });
router.get("/race", withRaces(() => null));
router.post("/race", withRaces((req) => kittyRace.openRace(req.user._id, { bet: Number(req.body?.bet), solo: req.body?.solo === true })));
router.post("/race/:id/join", withRaces((req) => kittyRace.joinRace(req.user._id, req.params.id, Number(req.body?.bet))));
router.post("/race/:id/leave", withRaces((req) => kittyRace.leaveRace(req.user._id, req.params.id)));
router.post(
    "/race/:id/start",
    withRaces((req) => {
        if (!mongoose.isValidObjectId(req.params.id)) throw new pets.CatflixError("That race isn't waiting to start.", 404);
        return kittyRace.startRace(req.params.id, { by: req.user._id });
    })
);
router.get("/race/:id", handle(async (req) => ({ race: await kittyRace.watchRace(req.params.id) })));
router.post(
    "/race/:id/throw",
    handle(async (req) => {
        const race = await kittyRace.throwItem(req.user._id, req.params.id, { item: req.body?.item, lane: req.body?.lane });
        return { race: kittyRace.raceView(race), player: shop.playerView(await shop.playerOf(req.user._id)) };
    })
);

module.exports = router;
