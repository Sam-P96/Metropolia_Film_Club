const mongoose = require("mongoose");
const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");
const FilmLog = require("../../models/filmLogModel");
const Follow = require("../../models/followModel");
const GameBan = require("../../models/gameBanModel");
const StealAttack = require("../../models/stealAttackModel");
const StealPlayer = require("../../models/stealPlayerModel");
const StealItem = require("../../models/stealItemModel");
const { STEAL } = require("../../../shared/steal/config.js");
const rules = require("../../games/steal/rules");
const { itemDef, isStone, combinedEffects } = require("../../games/steal/items");
const { quizSetup, buildQuiz, isCorrect, publicQuestion, answerText } = require("../../games/steal/quiz");
const { changeWallet } = require("../wallet");
const { areFriends, listAccess } = require("../follows");
const { MEMBER_FIELDS, userSummary } = require("../serialize");
const { noteStealAttacked, noteStealResult, noteStealCrit } = require("../notify");
const { inSession } = require("./tx");
const { equippedOf, wear, destroyAll, itemView } = require("./inventory");
const { playerOf, unfollowsOf } = require("./players");
const { activeBansOf, banFor, banMessage, recordSighting, checkSteal, checkDebt } = require("./moderation");

const { StealError } = rules;

// Steal and Defend's attacks (spec §5 to §8), all on the server: who can
// attack whom, starting one (the snapshot, the freeze, durability, the
// Invisibility Cloak), the quiz question by question with its timers, and
// the result: rolls, payouts, fines, debt and durability. The page only
// shows what it's sent and sends back answers.

const ACTIVE = ["quiz", "resolving"];
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const COUNTDOWN_MS = STEAL.quiz.countdownSeconds * 1000;
const GRACE_MS = STEAL.quiz.graceMs;

// Defense items whose effect is used as the quiz is set up, so they wear
// down even if they're swapped out before the end (otherwise a defender
// could use a Time Stone for free by unequipping it mid-attack).
const START_EFFECTS = ["fewerQuestions", "mathMax", "reshuffleSeconds", "foggyQuestions", "timerOverride", "typedMatch", "fizzle"];

// Where the success, crit, Neuralyzer and Invisibility Cloak rolls come
// from: crypto.randomInt, which can't be predicted. Only the tests swap it.
let random = rules.defaultRandom;
function useRandomSource(source) {
    random = source ?? rules.defaultRandom;
}

const same = (a, b) => a != null && b != null && String(a) === String(b);
const netWorth = (user) => (user?.wallet?.pp ?? 0) + (user?.wallet?.ppp ?? 0);
const joinedAt = (user) => user.joinedAt ?? user._id.getTimestamp();

// What one side's equipped items do: attack items when attacking, defense
// items when defending. With `stonesOnly`, only Infinity Stones count (a
// Power or Soul Stone attack ignores everything else).
function sideEffects(entries, side, stonesOnly = false) {
    return combinedEffects(entries.filter((entry) => entry.def.type === side).map((entry) => entry.def), { stonesOnly });
}

// --- an admin giving everyone their attack back ---

// The admin page's "Reset steal timer": everyone can attack again straight
// away, and everyone can be stolen from again, as if the day and the week
// had just started over. Every limit counts only from the moment it was
// pressed (kept in the `stealjobs` collection, with the daily jobs' marks):
// the attack a day, each victim once a week, and how often a victim can be
// robbed a day and a week. Soul Stone protection and follow times stay.
const RESET_ID = "attacksReset";
const resets = () => mongoose.connection.collection("stealjobs");

async function lastAttackReset() {
    const doc = await resets().findOne({ _id: RESET_ID });
    return doc ? { at: doc.at, by: doc.by ?? null } : null;
}

// Where the limits count from: the last 12:00 for the day and Monday 12:00
// for the week, or a reset since either.
async function limitWindows(now = new Date()) {
    const reset = (await lastAttackReset())?.at ?? null;
    const since = (start) => (reset && reset > start && reset <= now ? reset : start);
    return { dayStart: since(rules.lastDailyResetAt(now)), weekStart: since(rules.lastWeeklyResetAt(now)) };
}

async function resetAttacksForEveryone(adminId) {
    const at = new Date();
    await resets().updateOne({ _id: RESET_ID }, { $set: { at, by: adminId } }, { upsert: true });
    // The day's claims (startAttack) start over too.
    const cleared = await StealPlayer.updateMany({ attackCount: { $gt: 0 } }, { $set: { attackCount: 0 } });
    return { at, players: cleared.modifiedCount };
}

// --- who can attack whom ---

// Everything about the attacker that decides whether they can attack at all
// (spec §3, §5). `refusal`: a StealError if they can't.
async function attackerStanding(userId, now = new Date()) {
    const { dayStart, weekStart } = await limitWindows(now);
    const [user, player, bans, active, thisWeek] = await Promise.all([
        User.findById(userId).select("username joinedAt wallet").lean(),
        playerOf(userId),
        activeBansOf(userId),
        StealAttack.findOne({ attacker: userId, status: { $in: ACTIVE } }).select("_id victim").lean(),
        StealAttack.find({ attacker: userId, startedAt: { $gte: weekStart } }).select("victim startedAt").lean(),
    ]);
    const attacksToday = thisWeek.filter((attack) => attack.startedAt >= dayStart).length;
    const ageDays = (now - joinedAt(user)) / DAY_MS;

    let refusal = null;
    const ban = banFor(bans, "steal");
    if (!player.enabled) refusal = new StealError("Requires you to turn on PvP from your profile page", 403, "PVP_OFF");
    else if (ban) refusal = new StealError(banMessage(ban, "steal"), 403, "BANNED");
    else if (ageDays < STEAL.eligibility.accountAgeDays) {
        const left = Math.ceil(STEAL.eligibility.accountAgeDays - ageDays);
        refusal = new StealError(`Your account needs to be ${STEAL.eligibility.accountAgeDays} days old to attack: ${left} more day${left === 1 ? "" : "s"}.`, 403, "TOO_NEW");
    } else if (netWorth(user) < 0) refusal = new StealError("You can't attack while your balance is negative.", 403, "IN_DEBT");
    else if (active) refusal = new StealError("You already have an attack going.", 409, "ATTACKING");
    else if (attacksToday >= STEAL.limits.attacksPerDay) {
        refusal = new StealError("You've used today's attack. The next one is at 12:00.", 409, "USED_TODAY");
    }

    return {
        user,
        player,
        refusal,
        active,
        attacksToday,
        attackedThisWeek: new Set(thisWeek.map((attack) => String(attack.victim))),
        nextDailyAt: rules.nextDailyResetAt(now),
        nextWeeklyAt: rules.nextWeeklyResetAt(now),
    };
}

function formatWait(ms) {
    const hours = Math.ceil(ms / HOUR_MS);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

// How each of `victimIds` stands as a target for the attacker in
// `standing` (spec §3 to §5): { user, available, reason, follow }. Victims
// that don't exist are left out. Only people the attacker follows can be
// targets at all.
async function targetStandings(standing, victimIds, now = new Date()) {
    const attackerId = standing.user._id;
    const ids = victimIds.map((id) => new mongoose.Types.ObjectId(String(id)));
    const { dayStart, weekStart } = await limitWindows(now);

    const [users, follows, successes, shields, bans] = await Promise.all([
        User.find({ _id: { $in: ids } }).select(`${MEMBER_FIELDS} wallet pvp`).lean(),
        Follow.find({ follower: attackerId, following: { $in: ids } }).select("following createdAt").lean(),
        StealAttack.aggregate([
            { $match: { victim: { $in: ids }, outcome: "success", resolvedAt: { $gte: weekStart } } },
            { $group: { _id: "$victim", week: { $sum: 1 }, today: { $sum: { $cond: [{ $gte: ["$resolvedAt", dayStart] }, 1, 0] } } } },
        ]),
        StealAttack.find({ attacker: { $in: ids }, victim: attackerId, immunityUntil: { $gt: now } }).select("attacker immunityUntil").lean(),
        GameBan.find({ user: { $in: ids }, scopes: { $in: ["games", "site"] }, liftedAt: null, $or: [{ until: null }, { until: { $gt: now } }] })
            .distinct("user"),
    ]);

    const followedAt = new Map(follows.map((follow) => [String(follow.following), follow.createdAt]));
    const enabled = new Set(users.filter((user) => user.pvp).map((user) => String(user._id)));
    const robbed = new Map(successes.map((row) => [String(row._id), row]));
    const shieldUntil = new Map(shields.map((row) => [String(row.attacker), row.immunityUntil]));
    const banned = new Set(bans.map(String));

    return users.map((user) => {
        const id = String(user._id);
        const since = followedAt.get(id) ?? null;
        const requiredHours = rules.requiredFollowHours(unfollowsOf(standing.player, id));
        const followedHours = since ? (now - since) / HOUR_MS : 0;
        const follow = { following: Boolean(since), since, requiredHours, followedHours: Math.min(followedHours, requiredHours) };
        const wealth = netWorth(user);
        const counts = robbed.get(id) ?? { today: 0, week: 0 };

        let reason = null;
        if (same(user._id, attackerId)) reason = "That's you.";
        else if (!enabled.has(id)) reason = "PvP off";
        else if (banned.has(id)) reason = "Can't be targeted right now";
        else if (wealth <= 0) reason = wealth < 0 ? "Balance is negative" : "Net worth is 0";
        else if (!since) reason = "You don't follow them";
        else if (followedHours < requiredHours) reason = `Follow them for ${formatWait((requiredHours - followedHours) * HOUR_MS)} more`;
        else if (standing.attackedThisWeek.has(id)) reason = "Already attacked this week";
        else if (counts.today >= STEAL.limits.victimPerDay) reason = "Robbed enough for today";
        else if (counts.week >= STEAL.limits.victimPerWeek) reason = "Robbed enough for this week";
        else if (shieldUntil.has(id)) reason = `Protected from you by the Soul Stone for ${formatWait(shieldUntil.get(id) - now)}`;

        return {
            user: userSummary(user),
            available: reason === null,
            reason,
            follow,
            amounts: reason === null
                ? Object.fromEntries(STEAL.percents.map((percent) => [percent, rules.attemptedAmount(percent, wealth)]))
                : null,
        };
    });
}

// The target list (spec §6.1): everyone they follow, available first.
async function targetsFor(userId, now = new Date()) {
    const standing = await attackerStanding(userId, now);
    const rows = await Follow.find({ follower: userId }).sort({ createdAt: -1 }).limit(200).select("following").lean();
    const following = rows.map((row) => row.following);
    const targets = following.length > 0 ? await targetStandings(standing, following, now) : [];
    targets.sort((a, b) => Number(b.available) - Number(a.available) || a.user.username.localeCompare(b.user.username));
    return { standing, targets };
}

// --- the quiz's material ---

// The club's films, for trivia and wrong options: a sample of every film
// anyone has logged, refreshed every 10 minutes.
let siteCache = { at: 0, films: [] };
async function siteFilms() {
    if (Date.now() - siteCache.at < 10 * 60 * 1000) return siteCache.films;
    const films = await FilmLog.aggregate([
        { $group: { _id: "$tmdbId", title: { $first: "$title" }, year: { $first: "$year" } } },
        { $sample: { size: 400 } },
    ]);
    siteCache = { at: Date.now(), films: films.map((film) => ({ tmdbId: film._id, title: film.title, year: film.year ?? null })) };
    return siteCache.films;
}

// What the questions can ask about the victim (games/steal/quiz.js). Only
// what the attacker could see on the site themselves: a private (or
// friends-only, for a non-friend) profile hides their film list and
// favourites, so then only their reviews, which show everywhere, are
// asked about. "Who did they follow" follows their Following list setting.
async function victimData(attackerId, victim) {
    const isFriend = await areFriends(attackerId, victim._id);
    const privacy = victim.privacy ?? "public";
    const visible = privacy === "public" || (privacy === "friends" && isFriend);
    const followsVisible = listAccess(victim, attackerId, isFriend) === "all";

    const [logs, reviews, lastFollowRow] = await Promise.all([
        visible ? FilmLog.find({ user: victim._id }).select("tmdbId title year genres status rating").lean() : [],
        Review.find({ user: victim._id }).sort({ createdAt: -1, _id: -1 }).select("tmdbId filmTitle filmYear genres rating").lean(),
        followsVisible ? Follow.findOne({ follower: victim._id }).sort({ createdAt: -1, _id: -1 }).lean() : null,
    ]);

    const fromReview = (review) => ({ tmdbId: review.tmdbId, title: review.filmTitle, year: review.filmYear ?? null, genres: review.genres ?? [], rating: review.rating ?? null });
    const watched = visible
        ? logs.filter((log) => log.status === "completed").map((log) => ({ tmdbId: log.tmdbId, title: log.title, year: log.year ?? null, genres: log.genres ?? [], rating: log.rating ?? null }))
        : reviews.map(fromReview);
    const lastFollow = lastFollowRow ? await User.findById(lastFollowRow.following).select("username avatarUrl").lean() : null;
    const skip = [victim._id, lastFollow?._id].filter(Boolean);
    const others = await User.aggregate([
        { $match: { _id: { $nin: skip } } },
        { $sample: { size: 12 } },
        { $project: { username: 1, avatarUrl: 1 } },
    ]);

    return {
        watched,
        rated: watched.filter((film) => film.rating !== null),
        reviews: reviews.map((review) => ({ tmdbId: review.tmdbId, title: review.filmTitle })),
        reviewCount: reviews.length,
        favourites: visible ? (victim.favouriteFilms ?? []).map((film) => ({ tmdbId: film.tmdbId, title: film.title })) : [],
        logged: new Set((visible ? logs : reviews).map((entry) => entry.tmdbId)),
        lastFollow,
        others,
        altTitles: new Map(),
    };
}

// "Name a film they rated x/5" also takes TMDB's original titles. Looked
// up after the questions are made, only for that question's films, and
// given up on after a couple of seconds so a slow TMDB can't hold up the
// attack.
async function addOriginalTitles(questions, data) {
    const question = questions.find((entry) => entry.type === "nameRated");
    if (!question) return;
    const films = data.rated.filter((film) => film.rating === question.subject).slice(0, 25);
    const tmdb = require("../../services/tmdbService");
    const lookups = Promise.all(films.map((film) => tmdb.getMovie(film.tmdbId).catch(() => null)));
    const found = await Promise.race([lookups, new Promise((resolve) => setTimeout(() => resolve([]), 2500))]);
    for (const film of found) {
        if (film?.originalTitle && !question.answer.accepted.includes(film.originalTitle)) question.answer.accepted.push(film.originalTitle);
    }
}

// --- starting an attack ---

// Starts an attack on `victimId` for `percent` % of their net worth
// (spec §6.3). Returns the attack's id.
async function startAttack(req, victimId, percentValue) {
    const now = new Date();
    const attackerId = req.user._id;
    const percent = Number(percentValue);
    if (!rules.isPercent(percent)) {
        throw new StealError(`Pick how much to steal: ${STEAL.percents.slice(0, -1).join(", ")} or ${STEAL.percents.at(-1)}%.`);
    }
    if (!mongoose.isValidObjectId(victimId)) throw new StealError("Pick someone to attack.");
    if (same(victimId, attackerId)) throw new StealError("You can't steal from yourself.");

    const standing = await attackerStanding(attackerId, now);
    if (standing.refusal) throw standing.refusal;
    const [target] = await targetStandings(standing, [victimId], now);
    if (!target) throw new StealError("That member doesn't exist any more.", 404);
    if (!target.available) throw new StealError(target.reason, 409, "UNAVAILABLE");

    // Today's attack, claimed in one step: two clicks at once can't both
    // start one. Their settings are made here if they've never played; one
    // that's used today's doesn't match, so making it again fails instead.
    const day = rules.shopDay(now);
    const usedToday = new StealError("You've used today's attack. The next one is at 12:00.", 409, "USED_TODAY");
    const claim = await StealPlayer.updateOne(
        { _id: attackerId, $or: [{ attackDay: { $ne: day } }, { attackCount: { $lt: STEAL.limits.attacksPerDay } }] },
        [{ $set: { attackCount: { $cond: [{ $eq: ["$attackDay", day] }, { $add: [{ $ifNull: ["$attackCount", 0] }, 1] }, 1] }, attackDay: day } }],
        { updatePipeline: true, upsert: true }
    ).catch((error) => {
        if (error.code === 11000) throw usedToday;
        throw error;
    });
    if (claim.modifiedCount + claim.upsertedCount === 0) throw usedToday;

    let attack;
    try {
        attack = await createAttack({ attackerId, victimId, percent, standing, now });
    } catch (error) {
        await StealPlayer.updateOne({ _id: attackerId, attackDay: day }, { $inc: { attackCount: -1 } }).catch(() => {});
        throw error;
    }

    await recordSighting(req, attackerId).catch(() => {});
    await noteStealAttacked(victimId, attackerId, attack._id).catch((error) => console.error("Steal and Defend couldn't notify a defender:", error.message));
    announce(victimId, { kind: "attacked", attackId: String(attack._id) });

    // The Invisibility Cloak's roll, then a Power or Soul Stone needs no quiz.
    if (attack.fizzle?.fizzled) await resolveAttack(attack._id, { fizzleRoll: attack.fizzle.roll });
    else if (attack.stone) await resolveAttack(attack._id);
    return attack._id;
}

async function createAttack({ attackerId, victimId, percent, standing, now }) {
    const victim = await User.findById(victimId).select("username privacy followPrivacy favouriteFilms wallet").lean();
    const [attackerItems, defenderItems, victimPlayer] = await Promise.all([
        equippedOf(attackerId),
        equippedOf(victimId),
        playerOf(victimId),
    ]);

    // A Power or Soul Stone: no quiz, and only Infinity Stones count.
    const attackItems = attackerItems.filter((entry) => entry.def.type === "attack");
    const stones = combinedEffects(attackItems.map((entry) => entry.def), { stonesOnly: true });
    const auto = Boolean(stones.autoSuccess);
    const stone = auto ? (stones.destroyDefenderItems ? "power" : "soul") : null;
    const attackFx = sideEffects(attackerItems, "attack", auto);
    const defendFx = sideEffects(defenderItems, "defense", auto);

    const wealth = netWorth(victim);
    const attempted = rules.attemptedAmount(percent, wealth);
    const classes = { attacker: standing.player.playerClass, defender: victimPlayer.playerClass };
    const potentialFine = rules.fineBill({ attempted, attacker: attackFx, defender: defendFx, attackerClass: classes.attacker }).bill;

    let setup = null;
    let questions = [];
    if (!auto) {
        setup = quizSetup({ attacker: attackFx, defender: defendFx });
        const data = await victimData(attackerId, victim);
        questions = buildQuiz({ data, site: { films: await siteFilms() }, setup });
        await addOriginalTitles(questions, data);
    }

    const opensAt = new Date(now.getTime() + COUNTDOWN_MS);
    const perQuestion = COUNTDOWN_MS + (setup?.seconds ?? 0) * 1000 + GRACE_MS;
    const expiresAt = new Date(now.getTime() + (auto ? 60 * 1000 : (questions.length + setup.retries) * perQuestion + 30 * 1000));

    const [created] = await StealAttack.create([{
        attacker: attackerId,
        victim: victimId,
        percent,
        netWorth: wealth,
        attempted,
        potentialFine,
        stone,
        startedAt: now,
        expiresAt,
        classes,
        attackerItems: attackerItems.map((entry) => ({ item: entry.item._id, key: entry.key })),
        defenderItemsAtStart: defenderItems.map((entry) => ({ item: entry.item._id, key: entry.key })),
        seesDefenderItems: Boolean(attackFx.seeDefenderItems),
        setup,
        questions,
        opensAt: auto ? null : opensAt,
        closesAt: auto ? null : new Date(opensAt.getTime() + setup.seconds * 1000),
        retriesLeft: setup?.retries ?? 0,
    }]);

    // Both wallets freeze until it's over (or its time is up).
    await User.updateMany({ _id: { $in: [attackerId, victimId] } }, { $max: { "wallet.frozenUntil": expiresAt } }, { timestamps: false });

    // The attacker's attack items lose 1 as it starts (spec §10.4).
    const worn = await wear(attackItems.map((entry) => ({ item: entry.item, loss: 1 })));
    if (worn.length > 0) await StealAttack.updateOne({ _id: created._id }, { $push: { durability: { $each: worn } } });

    return {
        _id: created._id,
        stone,
        fizzle: auto ? null : rules.rollFizzle(defendFx, random),
    };
}

// --- the quiz, question by question ---

// The quiz after one question is done at `at`: right or wrong. A wrong one
// with the DeLorean still unused is asked again with a fresh timer; anything
// else moves on. Either way the next opens after the countdown.
function nextState(attack, right, at) {
    const opensAt = new Date(at.getTime() + COUNTDOWN_MS);
    const closesAt = new Date(opensAt.getTime() + attack.setup.seconds * 1000);
    if (!right && !attack.retrying && attack.retriesLeft > 0) {
        return { ...pickState(attack), retrying: true, retriesLeft: attack.retriesLeft - 1, opensAt, closesAt };
    }
    return {
        ...pickState(attack),
        current: attack.current + 1,
        retrying: false,
        correct: attack.correct + (right ? 1 : 0),
        wrong: attack.wrong + (right ? 0 : 1),
        opensAt,
        closesAt,
    };
}

const pickState = (attack) => ({
    current: attack.current,
    retrying: attack.retrying,
    retriesLeft: attack.retriesLeft,
    correct: attack.correct,
    wrong: attack.wrong,
    opensAt: attack.opensAt,
    closesAt: attack.closesAt,
});

// Questions whose time ran out by `now` count as wrong: everything the
// quiz did while nobody was answering (spec §6.6). Pure: returns the new
// state and the answers to record.
function timeoutsUntil(attack, now) {
    let state = { ...pickState(attack), setup: attack.setup };
    const answers = [];
    while (state.current < attack.questions.length && now.getTime() > state.closesAt.getTime() + GRACE_MS) {
        answers.push({ index: state.current, input: null, correct: false, timedOut: true, retry: state.retrying, at: state.closesAt });
        state = { ...nextState(state, false, state.closesAt), setup: attack.setup };
    }
    const { setup: _setup, ...rest } = state;
    return { state: rest, answers };
}

// Saves a step of the quiz, but only if nothing else saved one first.
function saveStep(attack, state, answers) {
    return StealAttack.updateOne(
        { _id: attack._id, status: "quiz", current: attack.current, retrying: attack.retrying, answers: { $size: attack.answers.length } },
        { $set: state, $push: { answers: { $each: answers } } }
    );
}

// Brings an attack up to `now`: unanswered questions time out, and a quiz
// with every question done is resolved. Returns the attack as it is then.
async function catchUp(attackId, now = new Date()) {
    for (let tries = 0; tries < 5; tries++) {
        const attack = await StealAttack.findById(attackId).lean();
        if (!attack || attack.status !== "quiz") return attack;
        if (attack.stone || attack.current >= attack.questions.length) {
            await resolveAttack(attack._id);
            return StealAttack.findById(attackId).lean();
        }
        const { state, answers } = timeoutsUntil(attack, now);
        if (answers.length === 0) return attack;
        const saved = await saveStep(attack, state, answers);
        if (saved.modifiedCount === 0) continue;
        if (state.current >= attack.questions.length) await resolveAttack(attack._id);
        return StealAttack.findById(attackId).lean();
    }
    return StealAttack.findById(attackId).lean();
}

// The attacker answers question `index` (spec §7). Only while it's open,
// once. Returns { right, retry }: whether it was right, and whether the
// DeLorean is giving them another go.
async function answerQuestion(userId, attackId, index, input) {
    if (!mongoose.isValidObjectId(attackId)) throw new StealError("That attack doesn't exist.", 404);
    const now = new Date();
    const attack = await catchUp(attackId, now);
    if (!attack || !same(attack.attacker, userId)) throw new StealError("That attack doesn't exist.", 404);
    if (attack.status !== "quiz") throw new StealError("This attack is over.", 409, "OVER");
    if (Number(index) !== attack.current) throw new StealError("That question has already closed.", 409, "MOVED_ON");
    if (now < attack.opensAt) throw new StealError("That question isn't open yet.", 409, "NOT_OPEN");

    const question = attack.questions[attack.current];
    const text = typeof input === "string" || typeof input === "number" ? String(input).slice(0, 200) : null;
    const right = isCorrect(question, text, attack.setup.typedMatch);
    const state = nextState(attack, right, now);
    const saved = await saveStep(attack, state, [{ index: attack.current, input: text, correct: right, timedOut: false, retry: attack.retrying, at: now }]);
    if (saved.modifiedCount === 0) throw new StealError("That answer is already in.", 409, "ALREADY_ANSWERED");
    if (state.current >= attack.questions.length) await resolveAttack(attack._id);
    return { right, retry: state.retrying && !attack.retrying };
}

// --- the result ---

// Works out a finished attack's freeze for one member again: until the
// latest attack still being played that they could pay into (as the
// attacker, or a victim whose attack isn't doomed), or none.
async function refreeze(userId, session = null) {
    const going = await StealAttack.find({
        status: { $in: ACTIVE },
        $or: [{ attacker: userId }, { victim: userId, doomed: false }],
    })
        .select("expiresAt")
        .session(session)
        .lean();
    const until = going.length > 0 ? new Date(Math.max(...going.map((attack) => attack.expiresAt.getTime()))) : null;
    await User.updateOne({ _id: userId }, { $set: { "wallet.frozenUntil": until } }, { timestamps: false, session });
}

// Takes up to `amount` from a wallet, PP first, never below 0. Returns
// what it actually took.
async function takeUpTo(userId, amount, options) {
    const taken = await changeWallet(
        userId,
        (wallet) => {
            const can = Math.min(amount, Math.max(0, wallet.pp + wallet.ppp));
            if (can <= 0) return null;
            const fromPp = Math.min(Math.max(0, wallet.pp), can);
            return { pp: 0 - fromPp, ppp: 0 - (can - fromPp) };
        },
        { ...options, steal: true }
    );
    return taken ? 0 - (taken.pp + taken.ppp) : 0;
}

const pay = (userId, amount, options) => (amount > 0 ? changeWallet(userId, () => ({ ppp: amount }), { ...options, steal: true }) : null);

// Finishes an attack (spec §8): the success formula and rolls, then the
// payouts, durability, and the freeze lifting. Runs once: whoever claims
// it first does it. `fizzleRoll`: it fizzled as it started.
async function resolveAttack(attackId, { fizzleRoll = null } = {}) {
    const finished = await inSession(async (session, after) => {
        const attack = await StealAttack.findOneAndUpdate(
            { _id: attackId, status: "quiz" },
            { $set: { status: "resolving" } },
            { returnDocument: "after", session }
        ).lean();
        if (!attack) return null;

        const now = new Date();
        const auto = Boolean(attack.stone);
        const ref = { stealRef: attack._id, session };
        const defenderNow = await equippedOf(attack.victim, session);
        const attackerDefs = attack.attackerItems.map((slot) => itemDef(slot.key)).filter(Boolean);
        const attackFx = combinedEffects(attackerDefs.filter((def) => def.type === "attack"), { stonesOnly: auto });
        const defendFx = sideEffects(defenderNow, "defense", auto);

        const set = {
            status: "done",
            resolvedAt: now,
            defenderItemsAtEnd: defenderNow.map((entry) => ({ item: entry.item._id, key: entry.key })),
        };
        const amounts = {};
        const durability = [];
        let outcome;
        let crit = false;
        let rates = null;
        let rolls = {};

        if (fizzleRoll !== null) {
            outcome = "fizzle";
            rolls = { fizzle: fizzleRoll };
        } else {
            if (!auto) {
                rates = rules.successChance({
                    correct: attack.correct,
                    wrong: attack.wrong,
                    attacker: attackFx,
                    defender: defendFx,
                    attackerClass: attack.classes?.attacker,
                    defenderClass: attack.classes?.defender,
                });
            }
            ({ outcome, crit, rolls } = rules.rollOutcome({ chance: rates?.success ?? 100, auto, doomed: attack.doomed, attacker: attackFx, defender: defendFx, random }));
        }

        let destroyed = new Set();
        if (outcome === "success") {
            const payout = rules.successPayout({
                attempted: attack.attempted,
                percent: attack.percent,
                crit,
                attackerClass: attack.classes?.attacker,
                noLoss: Boolean(defendFx.noLoss),
            });
            const lost = payout.victimLoses > 0 ? await takeUpTo(attack.victim, payout.victimLoses, { reason: "stealLoss", other: attack.attacker, ...ref }) : 0;
            await pay(attack.attacker, payout.attackerGets, { reason: "stealWin", other: attack.victim, ...ref });
            const wilson = rules.wilsonRefund(lost, defendFx.wilson ?? 0);
            await pay(attack.victim, wilson, { reason: "stealWilson", ...ref });
            Object.assign(amounts, { victimLost: lost, attackerGot: payout.attackerGets, critBonus: payout.critBonus, rogueBonus: payout.rogueBonus, wilson });

            if (attackFx.immunityDays) set.immunityUntil = new Date(now.getTime() + attackFx.immunityDays * DAY_MS);

            // The Power Stone breaks everything a defender with no Infinity Stone has on.
            if (attackFx.destroyDefenderItems && !defenderNow.some((entry) => isStone(entry.def))) {
                const records = await destroyAll(defenderNow.map((entry) => entry.item), session);
                durability.push(...records);
                destroyed = new Set(records.map((record) => String(record.item)));
            }
        } else if (outcome === "fail") {
            const bill = rules.fineBill({ attempted: attack.attempted, attacker: attackFx, defender: defendFx, attackerClass: attack.classes?.attacker });
            let settled = rules.settleBill(bill.bill, 0);
            await changeWallet(
                attack.attacker,
                (wallet) => {
                    settled = rules.settleBill(bill.bill, wallet.pp + wallet.ppp);
                    const fromPp = Math.min(Math.max(0, wallet.pp), settled.paid);
                    return { pp: 0 - fromPp, ppp: 0 - (settled.paid - fromPp) - settled.debt };
                },
                { reason: "stealFine", other: attack.victim, allowDebt: true, steal: true, ...ref }
            );
            const split = rules.splitPaid(settled.paid, bill.toDefender);
            await pay(attack.victim, split.defenderGets, { reason: "stealFineWon", other: attack.attacker, ...ref });
            Object.assign(amounts, {
                fine: bill.fine,
                revenge: bill.revenge,
                bill: bill.bill,
                paid: settled.paid,
                defenderGot: split.defenderGets,
                burned: split.burned,
                debt: settled.debt,
                forgiven: settled.forgiven,
            });

            // The Hattori Hanzo Katana: the thief's equipped items lose more.
            if (defendFx.extraDurabilityLoss) {
                const theirs = await equippedOf(attack.attacker, session);
                durability.push(...(await wear(theirs.map((entry) => ({ item: entry.item, loss: defendFx.extraDurabilityLoss })), session)));
            }
        }

        // The defender's defense items wear down as it ends, fizzles
        // included, and so do quiz items they had on at the start.
        const atEnd = defenderNow.filter((entry) => entry.def.type === "defense" && !destroyed.has(String(entry.item._id)));
        const endIds = new Set(atEnd.map((entry) => String(entry.item._id)));
        const usedAtStart = attack.defenderItemsAtStart.filter((slot) => {
            const def = itemDef(slot.key);
            return def?.type === "defense" && !endIds.has(String(slot.item)) && START_EFFECTS.some((key) => key in def.effects);
        });
        const swappedOut = usedAtStart.length > 0
            ? await StealItem.find({ _id: { $in: usedAtStart.map((slot) => slot.item) }, owner: attack.victim }).session(session).lean()
            : [];
        durability.push(...(await wear([...atEnd.map((entry) => entry.item), ...swappedOut].map((item) => ({ item, loss: 1 })), session)));

        // The first attack on a victim to finish decides it: any others on
        // them still being played now fail (spec §5). A fizzle never got
        // going, and a doomed one was already decided.
        if (outcome !== "fizzle" && !attack.doomed) {
            await StealAttack.updateMany({ victim: attack.victim, status: "quiz", _id: { $ne: attack._id } }, { $set: { doomed: true } }, { session });
        }

        const defaults = { victimLost: 0, attackerGot: 0, critBonus: 0, rogueBonus: 0, wilson: 0, fine: 0, revenge: 0, bill: 0, paid: 0, defenderGot: 0, burned: 0, debt: 0, forgiven: 0 };
        await StealAttack.updateOne(
            { _id: attack._id },
            { $set: { ...set, outcome, crit, rates, rolls, amounts: { ...defaults, ...amounts } }, $push: { durability: { $each: durability } } },
            { session }
        );
        await refreeze(attack.attacker, session);
        await refreeze(attack.victim, session);

        const done = { ...attack, outcome, crit, amounts: { ...defaults, ...amounts } };
        after(() => noteStealResult(done));
        if (crit) after(() => noteStealCrit(done));
        if (outcome === "success") after(() => checkSteal(attack.attacker, attack.victim));
        if (amounts.debt > 0) after(() => checkDebt(attack.attacker));
        after(async () => {
            announce(attack.attacker, { kind: "resolved", attackId: String(attack._id) });
            announce(attack.victim, { kind: "resolved", attackId: String(attack._id) });
        });
        return done;
    });
    return finished;
}

function announce(userId, event) {
    try {
        require("../../games/farkle/live").announceSteal(userId, event);
    } catch (error) {
        console.error("Steal and Defend couldn't announce an attack:", error.message);
    }
}

// Every attack still being played whose question timed out, or whose time
// is up altogether: moved on (and finished if that was the last one). For
// the sweep (jobs/stealSweep.js).
async function sweepAttacks(now = new Date()) {
    const stale = await StealAttack.find({
        status: "quiz",
        $or: [{ closesAt: { $lt: new Date(now.getTime() - GRACE_MS) } }, { expiresAt: { $lt: now } }, { stone: { $ne: null } }],
    })
        .select("_id")
        .lean();
    for (const { _id } of stale) {
        await catchUp(_id, now).catch((error) => console.error("Steal and Defend couldn't move an attack on:", error.message));
    }
    return stale.length;
}

// --- what the pages see ---

async function membersById(ids) {
    const users = await User.find({ _id: { $in: ids } }).select(MEMBER_FIELDS).lean();
    return new Map(users.map((user) => [String(user._id), userSummary(user)]));
}

function durabilityView(records) {
    return records.map((record) => ({
        owner: record.owner,
        key: record.key,
        name: itemDef(record.key)?.name ?? "Unknown item",
        before: record.before,
        after: record.after,
        destroyed: Boolean(record.destroyed),
    }));
}

// An attack as `viewerId` sees it: the attacker gets the quiz (one question
// at a time, never an answer) and afterwards every question with the right
// answer; the defender sees how far along it is, then the result. Nobody
// else can see it, except admins.
async function attackView(attackId, viewer) {
    if (!mongoose.isValidObjectId(attackId)) throw new StealError("That attack doesn't exist.", 404);
    const attack = await catchUp(attackId);
    const isAttacker = attack && same(attack.attacker, viewer._id);
    const isDefender = attack && same(attack.victim, viewer._id);
    if (!attack || (!isAttacker && !isDefender && viewer.role !== "admin")) throw new StealError("That attack doesn't exist.", 404);

    const now = new Date();
    const people = await membersById([attack.attacker, attack.victim]);
    const view = {
        _id: attack._id,
        role: isAttacker ? "attacker" : isDefender ? "defender" : "admin",
        status: attack.status === "done" ? "done" : "playing",
        outcome: attack.outcome,
        crit: attack.crit,
        stone: attack.stone,
        percent: attack.percent,
        attempted: attack.attempted,
        potentialFine: attack.potentialFine,
        startedAt: attack.startedAt,
        expiresAt: attack.expiresAt,
        resolvedAt: attack.resolvedAt,
        attacker: people.get(String(attack.attacker)) ?? null,
        victim: people.get(String(attack.victim)) ?? null,
        questionCount: attack.questions.length,
        answered: Math.min(attack.current, attack.questions.length),
        serverNow: now,
    };

    if (isAttacker && attack.seesDefenderItems) {
        view.defenderItems = attack.defenderItemsAtStart.map((slot) => {
            const def = itemDef(slot.key);
            return { key: slot.key, name: def?.name ?? "Unknown item", tier: def?.tier ?? null, effect: def?.effect ?? "" };
        });
    }

    if (attack.status !== "done") {
        if (isAttacker && attack.questions.length > 0) {
            const last = attack.answers[attack.answers.length - 1] ?? null;
            const open = now >= attack.opensAt;
            view.quiz = {
                index: attack.current,
                opensAt: attack.opensAt,
                closesAt: attack.closesAt,
                seconds: attack.setup.seconds,
                reshuffleSeconds: attack.setup.reshuffleSeconds,
                retrying: attack.retrying,
                retriesLeft: attack.retriesLeft,
                correct: attack.correct,
                question: open ? publicQuestion(attack.questions[attack.current]) : null,
                last: last ? { correct: last.correct, timedOut: last.timedOut } : null,
            };
        }
        return view;
    }

    view.result = {
        amounts: attack.amounts,
        rates: attack.rates,
        correct: attack.correct,
        wrong: attack.wrong,
        takenBack: Boolean(attack.takenBackAt),
        durability: durabilityView(attack.durability),
    };
    if (isAttacker || viewer.role === "admin") {
        view.review = attack.questions.map((question, index) => {
            const tries = attack.answers.filter((answer) => answer.index === index);
            return {
                prompt: question.prompt,
                foggy: Boolean(question.foggy),
                answers: tries.map((answer) => ({ input: answer.input, correct: answer.correct, timedOut: answer.timedOut })),
                rightAnswer: answerText(question),
                correct: tries.some((answer) => answer.correct),
            };
        });
    }
    return view;
}

// The public feed (spec §8.3): the newest successful steals.
async function publicFeed() {
    const steals = await StealAttack.find({ outcome: "success" })
        .sort({ resolvedAt: -1 })
        .limit(STEAL.feedSize)
        .select("attacker victim amounts crit stone percent resolvedAt takenBackAt")
        .lean();
    const people = await membersById(steals.flatMap((attack) => [attack.attacker, attack.victim]));
    return steals
        .map((attack) => ({
            _id: attack._id,
            attacker: people.get(String(attack.attacker)) ?? null,
            victim: people.get(String(attack.victim)) ?? null,
            stolen: attack.amounts?.attackerGot ?? 0,
            lost: attack.amounts?.victimLost ?? 0,
            crit: attack.crit,
            stone: attack.stone,
            percent: attack.percent,
            at: attack.resolvedAt,
            takenBack: Boolean(attack.takenBackAt),
        }))
        .filter((row) => row.attacker && row.victim);
}

// Their own recent attacks, either side, newest first.
async function historyOf(userId) {
    const attacks = await StealAttack.find({ $or: [{ attacker: userId }, { victim: userId }] })
        .sort({ startedAt: -1 })
        .limit(20)
        .select("attacker victim status outcome crit stone percent attempted amounts startedAt resolvedAt")
        .lean();
    const people = await membersById(attacks.flatMap((attack) => [attack.attacker, attack.victim]));
    return attacks.map((attack) => {
        const mine = same(attack.attacker, userId);
        return {
            _id: attack._id,
            role: mine ? "attacker" : "defender",
            other: people.get(String(mine ? attack.victim : attack.attacker)) ?? null,
            status: attack.status === "done" ? "done" : "playing",
            outcome: attack.outcome,
            crit: attack.crit,
            stone: attack.stone,
            percent: attack.percent,
            attempted: attack.attempted,
            amounts: attack.amounts,
            startedAt: attack.startedAt,
            resolvedAt: attack.resolvedAt,
        };
    });
}

// Attacks on them being played right now, for the hub's warning.
async function incomingAttacks(userId) {
    const attacks = await StealAttack.find({ victim: userId, status: { $in: ACTIVE } }).select("attacker startedAt expiresAt").lean();
    const people = await membersById(attacks.map((attack) => attack.attacker));
    return attacks.map((attack) => ({ _id: attack._id, attacker: people.get(String(attack.attacker)) ?? null, startedAt: attack.startedAt, expiresAt: attack.expiresAt }));
}

module.exports = {
    useRandomSource,
    lastAttackReset,
    resetAttacksForEveryone,
    attackerStanding,
    targetStandings,
    targetsFor,
    victimData,
    siteFilms,
    startAttack,
    nextState,
    timeoutsUntil,
    catchUp,
    answerQuestion,
    resolveAttack,
    refreeze,
    sweepAttacks,
    attackView,
    publicFeed,
    historyOf,
    incomingAttacks,
    itemView,
};
