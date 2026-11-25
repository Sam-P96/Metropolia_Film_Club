const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const CatflixPet = require("../../models/catflixPetModel");
const CatflixRace = require("../../models/catflixRaceModel");
const PetForm = require("../../models/petFormModel");
const { WalletError, changeWallet, spend } = require("../wallet");
const { splitPayout } = require("../forrest");
const { feedFromKittyRace } = require("../jackpotFeed");
const { CatflixError, friendIdsOf } = require("./pets");
const { CATFLIX, weatherFor, weatherSlot } = require("../../../shared/catflix/rules.js");

// Nekomusume: Kitty Race (shared/catflix/rules.js kittyRace). Ten cats race;
// each member in it bets on their own pet. Every cat has the same chance:
// the server picks the winner (and the whole finishing order) at the start,
// and pays it there and then: `pays` times the bet, the bet back in the
// coins it was paid in, the rest in P-PP. Of every bet lost, a share goes to
// the Box Office Scratch jackpots (config/jackpotFeed.js). Every page then
// plays the same race from the seed and the order (forge.js planRace), so
// everyone watching sees the same thing.
//
// Alone: a race with 9 house cats, started at once. With friends: the host
// opens it, friends (members who follow each other with the host) join with
// their own bets, and it starts when the host says, or by itself after
// `lobbyMinutes`. Bets are taken as members join, and given back to anyone
// who leaves before the start (the host leaving calls it off for everyone).

const RULES = CATFLIX.kittyRace;
const isId = (id) => mongoose.isValidObjectId(id);
const same = (a, b) => String(a) === String(b);

// When a started race has finished playing, and how long after that it's
// still "theirs" (so a page opened then shows the results).
const SHOW_AFTER_MS = 60 * 1000;

function checkBet(bet) {
    if (!Number.isInteger(bet) || bet < 1 || bet > RULES.maxBet) throw new CatflixError(`Bet a whole number of points from 1 to ${RULES.maxBet.toLocaleString("en-US")}.`);
}

// A race for the page. `now` for its phase: open, countdown (the cats on
// the line), racing, done, or cancelled.
function raceView(race, now = new Date()) {
    const t = now.getTime();
    let phase = race.status;
    if (race.status === "started") {
        const go = race.startAt.getTime() + RULES.countdownMs;
        phase = t < go ? "countdown" : t < race.endsAt.getTime() ? "racing" : "done";
    }
    return {
        id: String(race._id),
        host: String(race.host),
        solo: race.solo,
        status: race.status,
        phase,
        map: race.map,
        weather: race.weather,
        entries: race.entries.map((entry) => ({ user: String(entry.user), username: entry.username, name: entry.name, skinId: entry.skinId, bet: entry.bet, payout: entry.payout })),
        racers: race.racers.map((racer) => ({ owner: racer.owner ? String(racer.owner) : null, username: racer.username, name: racer.name, skinId: racer.skinId })),
        order: race.order,
        mishaps: race.mishaps ?? null,
        seed: race.seed,
        startAt: race.startAt,
        endsAt: race.endsAt,
        // An open race starts by itself then.
        autoStartAt: race.status === "open" ? new Date(race.createdAt.getTime() + RULES.lobbyMinutes * 60 * 1000) : null,
        serverNow: now,
    };
}

// Their pet, which runs for them.
async function petFor(userId) {
    const pet = await CatflixPet.findOne({ owner: userId }).select("name skinId").lean();
    if (!pet) throw new CatflixError("Hatch your egg first: your pet does the racing.", 409);
    return pet;
}

// The open race they're in, if any: one at a time. (A started race is
// already settled, so they can start the next while it plays.)
function currentRaceOf(userId) {
    return CatflixRace.findOne({ "entries.user": userId, status: "open" }).lean();
}

async function refund(userId, paid, raceId) {
    if (!userId || paid.pp + paid.ppp <= 0) return;
    try {
        await changeWallet(userId, () => ({ pp: paid.pp, ppp: paid.ppp }), { reason: "kittyRaceRefund", catflix: raceId });
    } catch (error) {
        console.error("Kitty Race couldn't give a bet back:", error.message);
    }
}

// Takes their bet and makes their entry (not saved yet).
async function enter(userId, raceId, bet) {
    const [pet, user] = await Promise.all([petFor(userId), User.findById(userId).select("username").lean()]);
    const taken = await spend(userId, bet, { reason: "kittyRaceBet", catflix: raceId });
    return { user: userId, username: user?.username ?? "", pet: pet._id, name: pet.name, skinId: pet.skinId, bet, paid: { pp: 0 - taken.pp, ppp: 0 - taken.ppp }, payout: 0, joinedAt: new Date() };
}

// Opens a race: alone (`solo`: started at once, against house cats) or for
// friends to join, on a track picked at random. Resolves to the race.
async function openRace(userId, { bet, solo = false } = {}, options = {}) {
    checkBet(bet);
    if (await currentRaceOf(userId)) throw new CatflixError("You're in a race already.", 409);
    const tracks = Object.keys(RULES.maps);
    const map = tracks[crypto.randomInt(tracks.length)];
    const id = new mongoose.Types.ObjectId();
    const entry = await enter(userId, id, bet);
    const now = options.now ?? new Date();
    let race;
    try {
        race = await CatflixRace.create({ _id: id, host: userId, solo: Boolean(solo), map, weather: weatherFor(map, weatherSlot(now), RULES.maps), entries: [entry] });
    } catch (error) {
        await refund(userId, entry.paid, id);
        throw error;
    }
    if (solo) return startRace(race._id, { by: userId, ...options });
    return race.toObject();
}

// Joins a friend's open race with `bet`.
async function joinRace(userId, raceId, bet) {
    checkBet(bet);
    if (!isId(raceId)) throw new CatflixError("That race isn't open.", 404);
    const race = await CatflixRace.findById(raceId).lean();
    if (!race || race.status !== "open" || race.solo) throw new CatflixError("That race isn't open any more.", 409);
    if (race.entries.some((entry) => same(entry.user, userId))) throw new CatflixError("You're in it already.", 409);
    if (race.entries.length >= RULES.racers) throw new CatflixError("That race is full.", 409);
    const friends = await friendIdsOf(race.host);
    if (!friends.some((id) => same(id, userId))) throw new CatflixError("Only the host's friends (members who follow each other) can join.", 403);
    if (await currentRaceOf(userId)) throw new CatflixError("You're in a race already.", 409);

    const entry = await enter(userId, race._id, bet);
    const joined = await CatflixRace.findOneAndUpdate(
        { _id: race._id, status: "open", "entries.user": { $ne: userId }, [`entries.${RULES.racers - 1}`]: { $exists: false } },
        { $push: { entries: entry }, $inc: { version: 1 } },
        { new: true }
    ).lean();
    if (!joined) {
        await refund(userId, entry.paid, race._id);
        throw new CatflixError("That race started or filled up just now. Your bet's back.", 409);
    }
    return joined;
}

// Leaves an open race, the bet back. The host leaving calls it off: every
// bet back. Resolves to the race as it is now.
async function leaveRace(userId, raceId) {
    if (!isId(raceId)) throw new CatflixError("That race isn't open.", 404);
    const race = await CatflixRace.findById(raceId).lean();
    if (!race || race.status !== "open") throw new CatflixError("That race has started: no leaving now.", 409);
    if (same(race.host, userId)) {
        const cancelled = await CatflixRace.findOneAndUpdate({ _id: race._id, status: "open" }, { $set: { status: "cancelled" }, $inc: { version: 1 } }, { new: true }).lean();
        if (!cancelled) throw new CatflixError("That race has started: no leaving now.", 409);
        for (const entry of cancelled.entries) await refund(entry.user, entry.paid, race._id);
        return cancelled;
    }
    const entry = race.entries.find((e) => same(e.user, userId));
    if (!entry) throw new CatflixError("You're not in that race.", 404);
    const left = await CatflixRace.findOneAndUpdate({ _id: race._id, status: "open", "entries.user": userId }, { $pull: { entries: { user: userId } }, $inc: { version: 1 } }, { new: true }).lean();
    if (!left) throw new CatflixError("That race has started: no leaving now.", 409);
    await refund(userId, entry.paid, race._id);
    return left;
}

// A shuffled copy of `list`, with `random(n)` (0 to n - 1).
function shuffled(list, random) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// A race's mishaps (shared/catflix/rules.js kittyRace.mishaps), by lane,
// never the `winner`'s lane: so they don't change who wins, and every cat
// keeps the same chance. A brawl: two cats in lanes next to each other, one
// attacking the other, some way into the race. Celebrating too soon: one of
// the rest.
function mishapsFor(lanes, winner, random) {
    const odds = RULES.mishaps;
    let brawl = null;
    if (random(100) < odds.brawl * 100) {
        const pairs = [];
        for (let lane = 0; lane + 1 < lanes; lane++) if (lane !== winner && lane + 1 !== winner) pairs.push(lane);
        if (pairs.length) {
            const lane = pairs[random(pairs.length)];
            const [attacker, victim] = random(2) === 0 ? [lane, lane + 1] : [lane + 1, lane];
            brawl = { attacker, victim, atMs: odds.brawlFrom + random(odds.brawlTo - odds.brawlFrom + 1) };
        }
    }
    let celebrate = null;
    if (random(100) < odds.celebrate * 100) {
        const left = [];
        for (let lane = 0; lane < lanes; lane++) if (lane !== winner && lane !== brawl?.attacker && lane !== brawl?.victim) left.push(lane);
        if (left.length) celebrate = { lane: left[random(left.length)] };
    }
    return brawl || celebrate ? { brawl, celebrate } : null;
}

// Starts an open race: house cats fill the field, the lanes are shuffled,
// the winner is picked (every cat the same chance), and the winner's owner
// paid, all at once. `by`: the host starting it (anyone else can't); null
// for the sweep starting it when it's due. `random(n)`: 0 to n - 1 (tests
// pass their own). Resolves to the race.
async function startRace(raceId, { by = null, random = crypto.randomInt, now = new Date() } = {}) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const race = await CatflixRace.findById(raceId).lean();
        if (!race || race.status !== "open") throw new CatflixError("That race isn't waiting to start.", 409);
        if (by && !same(race.host, by)) throw new CatflixError("Only the host can start it.", 403);

        // The winner first: a place in the field of `racers` cats (the
        // members' cats, then the house cats), every place the same chance.
        const winnerAt = random(RULES.racers);
        const forms = await PetForm.find().select("_id").lean();
        const players = race.entries.map((entry) => ({ owner: entry.user, username: entry.username, name: entry.name, skinId: entry.skinId }));
        const names = shuffled(RULES.houseCats.filter((name) => !players.some((p) => p.name === name)), random);
        const house = names.slice(0, RULES.racers - players.length).map((name) => ({ owner: null, username: "", name, skinId: forms.length ? String(forms[random(forms.length)]._id) : null }));
        const field = [...players, ...house];
        const racers = shuffled(field, random);
        const winner = racers.indexOf(field[winnerAt]);
        // The rest of the order around any mishaps: whoever celebrated too
        // soon comes in behind the others, and a brawl's two are last.
        const mishaps = mishapsFor(racers.length, winner, random);
        const unlucky = [mishaps?.celebrate?.lane, mishaps?.brawl?.attacker, mishaps?.brawl?.victim].filter((lane) => lane !== undefined);
        const order = [winner, ...shuffled(racers.map((_, lane) => lane).filter((lane) => lane !== winner && !unlucky.includes(lane)), random), ...unlucky];
        const owner = racers[winner].owner;
        const entries = race.entries.map((entry) => ({ ...entry, payout: owner && same(entry.user, owner) ? entry.bet * RULES.pays : 0 }));
        const startAt = new Date(now.getTime() + RULES.leadMs);
        const endsAt = new Date(startAt.getTime() + RULES.countdownMs + RULES.raceMs);

        const started = await CatflixRace.findOneAndUpdate(
            { _id: race._id, status: "open", version: race.version },
            { $set: { status: "started", racers, order, mishaps, entries, seed: random(0x7fffffff), startAt, endsAt }, $inc: { version: 1 } },
            { new: true }
        ).lean();
        if (!started) continue; // someone joined or left in between: again

        // Pay the winner, and the jackpots their share of what was lost.
        let lost = 0;
        for (const entry of started.entries) {
            if (entry.payout > 0) {
                try {
                    await changeWallet(entry.user, () => splitPayout(entry.paid, entry.payout), { reason: "kittyRaceWin", catflix: started._id });
                } catch (error) {
                    console.error("Kitty Race couldn't pay a winner:", error.message);
                }
            } else lost += entry.paid.pp + entry.paid.ppp;
        }
        await feedFromKittyRace(lost);
        await CatflixRace.updateOne({ _id: started._id }, { $set: { settledAt: new Date() } });
        return started;
    }
    throw new CatflixError("That race is busy: try again.", 409);
}

// Open races that have waited `lobbyMinutes` start by themselves (the
// sweep, and anyone looking). Resolves to how many.
async function startDue(now = new Date()) {
    const due = await CatflixRace.find({ status: "open", createdAt: { $lte: new Date(now.getTime() - RULES.lobbyMinutes * 60 * 1000) } }).select("_id").lean();
    let count = 0;
    for (const { _id } of due) {
        try {
            await startRace(_id, { now });
            count += 1;
        } catch (error) {
            if (!(error instanceof CatflixError)) throw error;
        }
    }
    return count;
}

// What the page shows: { mine: the race they're in (open, playing, or
// finished in the last minute), open: their friends' open races they could
// join }.
async function racesFor(userId, now = new Date()) {
    await startDue(now);
    const [mine, friends] = await Promise.all([
        CatflixRace.findOne({ "entries.user": userId, $or: [{ status: "open" }, { status: "started", endsAt: { $gt: new Date(now.getTime() - SHOW_AFTER_MS) } }] })
            .sort({ createdAt: -1 })
            .lean(),
        friendIdsOf(userId),
    ]);
    const open = await CatflixRace.find({ status: "open", solo: false, host: { $in: friends }, "entries.user": { $ne: userId } })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    return { mine: mine ? raceView(mine, now) : null, open: open.map((race) => raceView(race, now)) };
}

module.exports = { WalletError, RULES, mishapsFor, raceView, openRace, joinRace, leaveRace, startRace, startDue, racesFor };
