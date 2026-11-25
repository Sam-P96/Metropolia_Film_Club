const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const CatflixPet = require("../../models/catflixPetModel");
const CatflixPlayer = require("../../models/catflixPlayerModel");
const CatflixRace = require("../../models/catflixRaceModel");
const PetForm = require("../../models/petFormModel");
const { WalletError, changeWallet, spend } = require("../wallet");
const { splitPayout } = require("../forrest");
const { feedFromKittyRace } = require("../jackpotFeed");
const { CatflixError, friendIdsOf } = require("./pets");
const { CATFLIX, weatherFor, weatherSlot } = require("../../../shared/catflix/rules.js");

// Nekomusume: Kitty Race (shared/catflix/rules.js kittyRace). Ten cats race;
// each member in it bets on their own pet. Every cat has the same chance:
// the server picks the winner (and the whole finishing order) at the start.
// Every page then plays the same race from the seed and the order (forge.js
// planRace), so everyone watching sees the same thing.
//
// Cheat items (TNT or a Banana Peel, from the pet shop) thrown while it runs
// can knock a cat out, and if that's the one that was going to win, the next
// cat in line wins instead: each throw goes to every page (they poll the
// race while it plays), and lands there at the same moment. House cats
// throw too, rolled at the start. Once nothing thrown can change the result
// (the last 15 s before the winner's finish, when items always miss), the
// winner's paid: `pays` times the bet, the bet back in the coins it was paid
// in, the rest in P-PP. Of every bet lost, a share goes to the Box Office
// Scratch jackpots (config/jackpotFeed.js). Anyone can watch a race.
//
// Alone: a race with 9 house cats, started at once. With friends: the host
// opens it, friends (members who follow each other with the host) join with
// their own bets, and it starts when the host says, or by itself after
// `lobbyMinutes`. Bets are taken as members join, and given back to anyone
// who leaves before the start (the host leaving calls it off for everyone).

const RULES = CATFLIX.kittyRace;
const CHEATS = RULES.cheats;
const isId = (id) => mongoose.isValidObjectId(id);
const same = (a, b) => String(a) === String(b);

// When a started race has finished playing, and how long after that it's
// still "theirs" (so a page opened then shows the results).
const SHOW_AFTER_MS = 60 * 1000;

// When a race's clock (0 at the off, after the countdown) reads 0, and when
// its winner gets paid: cheat items can't change anything after that.
const offAt = (race) => race.startAt.getTime() + RULES.countdownMs;
const SETTLE_MS = RULES.winnerMs - CHEATS.lateMs;

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
        racers: race.racers.map((racer) => ({ owner: racer.owner ? String(racer.owner) : null, username: racer.username, name: racer.name, skinId: racer.skinId, pvp: Boolean(racer.pvp) })),
        order: race.order,
        // After the cheat items: the order to show and pay (`order` scripts the race).
        finish: race.finish?.length ? race.finish : race.order,
        throws: (race.throws ?? []).map((t) => ({ by: t.by ? String(t.by) : null, username: t.username, from: t.from, item: t.item, target: t.target, atMs: t.atMs, landsMs: t.landsMs, hit: t.hit })),
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

// The open race they're in, if any: one at a time. (Their next can start
// while a started one plays.)
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
// never the `winner`'s lane and never two to one cat: so they don't change
// who wins, and every cat keeps the same chance. Any of them can happen in
// the same race. Brawls: two cats in lanes next to each other, one
// attacking the other, any time from early on to late (so anywhere on the
// track); sometimes a second brawl, two other cats, at its own time.
// Celebrating too soon: one of the rest. Struck by lightning, if it's
// raining on the track (`weather`): another of the rest, any time too.
// Giving up: another, which takes the lead at its time, is overtaken by
// two cats, and stops.
function mishapsFor(lanes, winner, random, weather = null) {
    const odds = RULES.mishaps;
    const taken = new Set([winner]);
    const sometime = (from, to) => from + random(to - from + 1);
    const free = () => [...Array(lanes).keys()].filter((lane) => !taken.has(lane));
    const brawls = [];
    for (const chance of [odds.brawl, odds.secondBrawl]) {
        if (random(100) >= chance * 100) break;
        const pairs = [];
        for (let lane = 0; lane + 1 < lanes; lane++) if (!taken.has(lane) && !taken.has(lane + 1)) pairs.push(lane);
        if (!pairs.length) break;
        const lane = pairs[random(pairs.length)];
        const [attacker, victim] = random(2) === 0 ? [lane, lane + 1] : [lane + 1, lane];
        brawls.push({ attacker, victim, atMs: sometime(odds.brawlFrom, odds.brawlTo) });
        taken.add(lane).add(lane + 1);
    }
    let celebrate = null;
    if (random(100) < odds.celebrate * 100) {
        const left = free();
        if (left.length) taken.add((celebrate = { lane: left[random(left.length)] }).lane);
    }
    let lightning = null;
    if (odds.rainy.includes(weather) && random(100) < odds.lightning * 100) {
        const left = free();
        if (left.length) taken.add((lightning = { lane: left[random(left.length)], atMs: sometime(odds.lightningFrom, odds.lightningTo) }).lane);
    }
    let quit = null;
    if (random(100) < odds.quit * 100) {
        const left = free();
        if (left.length) taken.add((quit = { lane: left[random(left.length)], atMs: sometime(odds.quitFrom, odds.quitTo) }).lane);
    }
    return brawls.length || celebrate || lightning || quit ? { brawls, celebrate, lightning, quit } : null;
}

// When a mishap stops the cat in `lane` for good (a brawl, a lightning
// strike), or never. (One giving up stops some time after it leads.)
function stoppedAt(mishaps, lane) {
    const brawl = mishaps?.brawls?.find((b) => b.attacker === lane || b.victim === lane);
    if (brawl) return brawl.atMs;
    return mishaps?.lightning?.lane === lane ? mishaps.lightning.atMs : Infinity;
}

// The cats that will still cross the line: not stopped by a mishap (a
// brawl, lightning, giving up), not knocked out by a cheat item.
function finishersLeft(order, mishaps, throws) {
    const never = new Set([...(mishaps?.brawls ?? []).flatMap((b) => [b.attacker, b.victim]), mishaps?.lightning?.lane, mishaps?.quit?.lane]);
    return order.filter((lane) => !never.has(lane) && !throws.some((t) => t.hit && t.target === lane));
}

// The finishing order after cheat items: every cat one knocked out moved to
// the back, in the order they were hit. If it was going to win, the next
// cat in line wins.
function finishOrder(order, throws) {
    const out = [];
    for (const t of [...throws].sort((a, b) => a.landsMs - b.landsMs)) if (t.hit && !out.includes(t.target)) out.push(t.target);
    return [...order.filter((lane) => !out.includes(lane)), ...out];
}

// Each member's payout for that finish: `pays` times the bet if theirs won.
function withPayouts(entries, racers, finish) {
    const owner = racers[finish[0]].owner;
    return entries.map((entry) => ({ ...entry, payout: owner && same(entry.user, owner) ? entry.bet * RULES.pays : 0 }));
}

// Where a throw lands: it gets there `flightMs` later. Thrown in the last
// `lateMs` before the winner's finish (or once the race is settled), it
// misses; before that, it hits in `hit` of throws, unless that would leave
// no cat to cross the line.
function resolveThrow(t, race, earlier, random) {
    const late = t.atMs >= SETTLE_MS || Boolean(race.settledAt);
    let hit = !late && random(100) < CHEATS.hit * 100;
    if (hit && !finishersLeft(race.order, race.mishaps, [...earlier, { ...t, hit: true }]).length) hit = false;
    return { ...t, landsMs: t.atMs + CHEATS.flightMs, hit };
}

// The house cats' cheat items, rolled at the start: each throws one in
// `houseCat` of races (a roll of 70 to 99 out of 100), TNT or a Banana Peel,
// at any time from `houseFrom` ms to the winner's finish, at a cat still
// running when it gets there (not one of theirs that a mishap stopped
// before it could throw).
function houseThrows(race, random) {
    const thrown = [];
    race.racers.forEach((racer, lane) => {
        if (racer.owner || random(100) < 100 - CHEATS.houseCat * 100) return;
        const atMs = CHEATS.houseFrom + random(RULES.winnerMs - CHEATS.houseFrom);
        const item = random(2) === 0 ? "tnt" : "banana";
        if (stoppedAt(race.mishaps, lane) <= atMs) return;
        const targets = race.racers.map((_, i) => i).filter((i) => i !== lane && stoppedAt(race.mishaps, i) > atMs + CHEATS.flightMs);
        if (targets.length) thrown.push({ by: null, username: "", from: lane, item, target: targets[random(targets.length)], atMs });
    });
    thrown.sort((a, b) => a.atMs - b.atMs);
    const done = [];
    for (const t of thrown) done.push(resolveThrow(t, race, done, random));
    return done;
}

// Starts an open race: house cats fill the field, the lanes are shuffled,
// the winner is picked (every cat the same chance), and the house cats'
// cheat items rolled, all at once (the winner's paid once nothing thrown
// can change it: settleRace). `by`: the host starting it (anyone else
// can't); null for the sweep starting it when it's due. `random(n)`: 0 to
// n - 1 (tests pass their own). Resolves to the race.
async function startRace(raceId, { by = null, random = crypto.randomInt, now = new Date() } = {}) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const race = await CatflixRace.findById(raceId).lean();
        if (!race || race.status !== "open") throw new CatflixError("That race isn't waiting to start.", 409);
        if (by && !same(race.host, by)) throw new CatflixError("Only the host can start it.", 403);

        // The winner first: a place in the field of `racers` cats (the
        // members' cats, then the house cats), every place the same chance.
        const winnerAt = random(RULES.racers);
        const forms = await PetForm.find().select("_id").lean();
        const pvp = new Set((await User.find({ _id: { $in: race.entries.map((entry) => entry.user) }, pvp: true }).select("_id").lean()).map((user) => String(user._id)));
        const players = race.entries.map((entry) => ({ owner: entry.user, username: entry.username, name: entry.name, skinId: entry.skinId, pvp: pvp.has(String(entry.user)) }));
        const names = shuffled(RULES.houseCats.filter((name) => !players.some((p) => p.name === name)), random);
        const house = names.slice(0, RULES.racers - players.length).map((name) => ({ owner: null, username: "", name, skinId: forms.length ? String(forms[random(forms.length)]._id) : null }));
        const field = [...players, ...house];
        const racers = shuffled(field, random);
        const winner = racers.indexOf(field[winnerAt]);
        // The rest of the order around any mishaps: whoever celebrated too
        // soon comes in behind the others; then the ones who never finish:
        // the one that gave up, the one struck by lightning, and the brawls'
        // cats last.
        const mishaps = mishapsFor(racers.length, winner, random, race.weather);
        const unlucky = [mishaps?.celebrate?.lane, mishaps?.quit?.lane, mishaps?.lightning?.lane, ...(mishaps?.brawls ?? []).flatMap((brawl) => [brawl.attacker, brawl.victim])].filter((lane) => lane !== undefined);
        const order = [winner, ...shuffled(racers.map((_, lane) => lane).filter((lane) => lane !== winner && !unlucky.includes(lane)), random), ...unlucky];
        const throws = houseThrows({ racers, order, mishaps, settledAt: null }, random);
        const finish = finishOrder(order, throws);
        const entries = withPayouts(race.entries, racers, finish);
        const startAt = new Date(now.getTime() + RULES.leadMs);
        const endsAt = new Date(startAt.getTime() + RULES.countdownMs + RULES.raceMs);

        const started = await CatflixRace.findOneAndUpdate(
            { _id: race._id, status: "open", version: race.version },
            { $set: { status: "started", racers, order, mishaps, throws, finish, entries, seed: random(0x7fffffff), startAt, endsAt }, $inc: { version: 1 } },
            { returnDocument: "after" }
        ).lean();
        if (!started) continue; // someone joined or left in between: again
        return started;
    }
    throw new CatflixError("That race is busy: try again.", 409);
}

// Pays a started race's winner, `pays` times the bet (the bet back in the
// coins it was paid in, the rest in P-PP), and the jackpots their share of
// what was lost: once. Resolves to whether it did.
async function settleRace(raceId) {
    const race = await CatflixRace.findOneAndUpdate({ _id: raceId, status: "started", settledAt: null }, { $set: { settledAt: new Date() }, $inc: { version: 1 } }, { returnDocument: "after" }).lean();
    if (!race) return false;
    let lost = 0;
    for (const entry of race.entries) {
        if (entry.payout > 0) {
            try {
                await changeWallet(entry.user, () => splitPayout(entry.paid, entry.payout), { reason: "kittyRaceWin", catflix: race._id });
            } catch (error) {
                console.error("Kitty Race couldn't pay a winner:", error.message);
            }
        } else lost += entry.paid.pp + entry.paid.ppp;
    }
    await feedFromKittyRace(lost);
    return true;
}

// Started races that cheat items can't change any more get paid (the sweep,
// and anyone looking). Resolves to how many.
async function settleDue(now = new Date()) {
    const due = await CatflixRace.find({ status: "started", settledAt: null, startAt: { $lte: new Date(now.getTime() - RULES.countdownMs - SETTLE_MS) } }).select("_id").lean();
    let count = 0;
    for (const { _id } of due) count += (await settleRace(_id)) ? 1 : 0;
    return count;
}

// A member throws a cheat item (`item`: "tnt" or "banana", one of theirs)
// at the cat in `lane`, `now`: one a race. In the race, at any cat but
// their own; watching, only at members' cats whose owners have PvP on.
// Resolves to the race.
async function throwItem(userId, raceId, { item, lane } = {}, { now = new Date(), random = crypto.randomInt } = {}) {
    const info = typeof item === "string" && Object.hasOwn(CHEATS.items, item) ? CHEATS.items[item] : null;
    if (!info) throw new CatflixError("Throw TNT or a Banana Peel.");
    if (!isId(raceId)) throw new CatflixError("That race isn't running.", 404);
    for (let attempt = 0; attempt < 5; attempt++) {
        const race = await CatflixRace.findById(raceId).lean();
        if (!race || race.status !== "started") throw new CatflixError("That race isn't running.", 409);
        const atMs = now.getTime() - offAt(race);
        if (atMs < 0) throw new CatflixError("Wait for the off!", 409);
        if (atMs >= RULES.winnerMs) throw new CatflixError("Too late: the winner's home.", 409);
        if (!Number.isInteger(lane) || lane < 0 || lane >= race.racers.length) throw new CatflixError("Pick a lane to throw it at.");
        const own = race.racers.findIndex((racer) => racer.owner && same(racer.owner, userId));
        if (lane === own) throw new CatflixError("Not at your own cat!");
        if (own < 0 && !race.racers[lane].pvp) throw new CatflixError("Watching, you can only throw at members' cats whose owners have PvP on.", 403);
        if (race.throws.some((t) => t.by && same(t.by, userId))) throw new CatflixError("One cheat item a race: you've thrown yours.", 409);
        // Theirs to throw: taken now, given back if the race changed in between (then again).
        const taken = await CatflixPlayer.updateOne({ user: userId, [`cheats.${item}`]: { $gte: 1 } }, { $inc: { [`cheats.${item}`]: -1 } });
        if (taken.modifiedCount === 0) throw new CatflixError(`You don't have ${info.a}: the pet shop sells them.`, 409);
        const user = await User.findById(userId).select("username").lean();
        const thrown = resolveThrow({ by: userId, username: user?.username ?? "", from: own < 0 ? null : own, item, target: lane, atMs }, race, race.throws, random);
        const throws = [...race.throws, thrown];
        const finish = finishOrder(race.order, throws);
        const saved = await CatflixRace.findOneAndUpdate(
            { _id: race._id, version: race.version },
            { $push: { throws: thrown }, $set: { finish, entries: withPayouts(race.entries, race.racers, finish) }, $inc: { version: 1 } },
            { returnDocument: "after" }
        ).lean();
        if (saved) return saved;
        await CatflixPlayer.updateOne({ user: userId }, { $inc: { [`cheats.${item}`]: 1 } });
    }
    throw new CatflixError("That race is busy: try again.", 409);
}

// One started race, for anyone watching it (the page polls it while it
// plays, for cheat items thrown). Paid first if it's due.
async function watchRace(raceId, now = new Date()) {
    if (!isId(raceId)) throw new CatflixError("There's no race like that.", 404);
    let race = await CatflixRace.findById(raceId).lean();
    if (!race || race.status !== "started") throw new CatflixError("That race isn't running.", 404);
    if (!race.settledAt && now.getTime() >= offAt(race) + SETTLE_MS && (await settleRace(race._id))) race = await CatflixRace.findById(raceId).lean();
    return raceView(race, now);
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
// join, live: races on now that they could watch (anyone's) }.
async function racesFor(userId, now = new Date()) {
    await startDue(now);
    await settleDue(now);
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
    const live = await CatflixRace.find({ status: "started", endsAt: { $gt: now }, "entries.user": { $ne: userId } })
        .sort({ startAt: -1 })
        .limit(10)
        .lean();
    return { mine: mine ? raceView(mine, now) : null, open: open.map((race) => raceView(race, now)), live: live.map((race) => raceView(race, now)) };
}

module.exports = { WalletError, RULES, mishapsFor, houseThrows, finishOrder, raceView, openRace, joinRace, leaveRace, startRace, startDue, settleRace, settleDue, throwItem, watchRace, racesFor };
