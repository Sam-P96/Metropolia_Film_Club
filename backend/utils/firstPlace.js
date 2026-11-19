const User = require("../models/userModel");
const StealItem = require("../models/stealItemModel");
const { leaderboardStages } = require("./wallet");
const { rankCritics, everyCritic } = require("./critics");
const { levelOf, xpOf } = require("./level");
const { STONE_IDS, firstPlaceFxOf, firstPlaceFxProblem } = require("../../shared/firstPlace/config.js");
const { FIRST_PLACE_EFFECT, STONE_NAMES, STONE_NAME_IDS, isNameEffect, stoneOfItem } = require("../../shared/stoneNames/config.js");

// First Place: whoever is #1 on a ranking gets the First Place name effect
// (frontend/src/components/firstPlace/). Each title is one entry here; to
// add one, add an entry.
//   id     its key in getFirstPlaceHolders() and GET /api/first-place
//   label  how the name's tooltip and the editor say it
//   top2   the first two of its ranking, best first, as [{ userId, value }],
//          ranked exactly as its leaderboard ranks them
// #1 holds the title only when their value is above 0 and strictly above
// #2's: a tie for first, or a #1 at 0, and nobody holds it. Only #1: being
// #2 behind someone who holds this or other titles gets nothing.
const TITLES = [
    { id: "pp", label: "#1 PP", top2: topPp },
    { id: "critics", label: "#1 Critic", top2: topCritics },
    { id: "controversial", label: "#1 Controversial", top2: topControversial },
    { id: "level", label: "#1 Level", top2: topLevel },
];

// The PP Leaderboard (controllers/walletController.js): PP and P-PP
// together, members at 0 left out.
async function topPp() {
    const rows = await User.aggregate([
        ...leaderboardStages({ username: 1 }),
        { $match: { pp: { $ne: 0 } } },
        { $limit: 2 },
    ]);
    return rows.map((row) => ({ userId: row._id, value: row.pp }));
}

// The Critics Leaderboard's Top view (utils/critics.js): likes on their
// reviews.
async function topCritics() {
    const rows = await rankCritics({ limit: 2 });
    return rows.map((row) => ({ userId: row._id, value: row.likes }));
}

// The Critics Leaderboard's Controversial view (utils/critics.js): dislikes
// on their reviews, members with PVP on only.
async function topControversial() {
    const rows = await rankCritics({ controversial: true, limit: 2 });
    return rows.map((row) => ({ userId: row._id, value: row.dislikes }));
}

// The highest level (utils/level.js), as the Level view counts it (nobody
// at level 0), but compared by how far along each is within their level,
// so two members on the same level only tie when they're exactly level.
async function topLevel() {
    const rows = await everyCritic();
    return rows
        .map((row) => ({ userId: row._id, level: levelOf(row.user[0], row), value: xpOf(row.user[0], row) }))
        .filter((row) => row.level > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 2);
}

function holderOf([first, second]) {
    if (!first || !(first.value > 0)) return null;
    if (second && !(first.value > second.value)) return null;
    return String(first.userId);
}

// Who holds each title: { pp, critics, controversial, level }, each a member id string or
// null. Everything that needs the holders asks this, so it's worked out in
// one place; it's kept for a few seconds, since every leaderboard and review
// card asks. A new #1 takes over at the next ask after that.
const CACHE_MS = 5000;
let cached = null;

function getFirstPlaceHolders() {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.holders;

    const holders = Promise.all(TITLES.map(async (title) => [title.id, holderOf(await title.top2())])).then(Object.fromEntries);
    cached = { at: Date.now(), holders };
    holders.catch(() => {
        if (cached?.holders === holders) cached = null;
    });
    return holders;
}

// Who holds each Infinity Stone in Steal and Defend, for the stones' name
// effects (shared/stoneNames/config.js): { space, mind, reality, power,
// time, soul }, each a member id string or null. A stone up for sale or
// held in a trade offer is still theirs. Kept as long as the titles.
let cachedStones = null;

function getStoneHolders() {
    if (cachedStones && Date.now() - cachedStones.at < CACHE_MS) return cachedStones.holders;

    const holders = StealItem.find({ unique: true }).select("key owner").lean().then((items) => {
        const found = Object.fromEntries(STONE_NAME_IDS.map((id) => [id, null]));
        for (const item of items) {
            const stone = stoneOfItem(item.key);
            if (stone && item.owner) found[stone] = String(item.owner);
        }
        return found;
    });
    cachedStones = { at: Date.now(), holders };
    holders.catch(() => {
        if (cachedStones?.holders === holders) cachedStones = null;
    });
    return holders;
}

// Forget the kept holders, so the next ask works them out again (tests).
function forgetFirstPlaceHolders() {
    cached = null;
    cachedStones = null;
}

// GET /api/first-place: every title with its holder ({ userId, username,
// label }, or null), and the effect settings of each holder, keyed by id
// (theirs, or the defaults if they've never saved any). Then the stones:
// each one's holder's id (or null), and `chosen`, the name effect each
// holder of a title or a stone has picked (null if none).
async function firstPlaceView() {
    const [holders, stoneHolders] = await Promise.all([getFirstPlaceHolders(), getStoneHolders()]);
    const titleIds = new Set(Object.values(holders).filter(Boolean));
    const ids = [...new Set([...titleIds, ...Object.values(stoneHolders).filter(Boolean)])];
    const users = ids.length ? await User.find({ _id: { $in: ids } }).select("username firstPlaceFx nameEffect").lean() : [];
    const byId = new Map(users.map((user) => [String(user._id), user]));

    const titles = Object.fromEntries(
        TITLES.map((title) => {
            const user = byId.get(holders[title.id]);
            return [title.id, user ? { userId: String(user._id), username: user.username, label: title.label } : null];
        })
    );
    const settings = Object.fromEntries(
        users.filter((user) => titleIds.has(String(user._id))).map((user) => [String(user._id), firstPlaceFxOf(user.firstPlaceFx)])
    );
    // A stone whose holder's account has gone shows on nobody.
    const stones = Object.fromEntries(STONE_NAME_IDS.map((id) => [id, byId.has(stoneHolders[id]) ? stoneHolders[id] : null]));
    const chosen = Object.fromEntries(users.map((user) => [String(user._id), isNameEffect(user.nameEffect) ? user.nameEffect : null]));

    return { titles, settings, stones, chosen };
}

class FirstPlaceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Saves `userId`'s effect settings, only while they hold a title. Resolves
// to the settings as saved. They're kept for good, title or not.
async function saveFirstPlaceFx(userId, fx) {
    const holders = await getFirstPlaceHolders();
    if (!Object.values(holders).includes(String(userId))) {
        throw new FirstPlaceError("Only a member in first place can change this.", 403);
    }

    const problem = firstPlaceFxProblem(fx);
    if (problem) throw new FirstPlaceError(problem);

    const saved = {
        enabled: fx.enabled,
        stones: STONE_IDS.filter((id) => fx.stones.includes(id)),
        order: [...fx.order],
        intervals: Object.fromEntries(STONE_IDS.map((id) => [id, fx.intervals[id]])),
        random: fx.random,
    };
    await User.updateOne({ _id: userId }, { $set: { firstPlaceFx: saved } });
    return firstPlaceFxOf(saved);
}

// Saves which name effect `userId` shows (shared/stoneNames/config.js):
// First Place, only while they hold a title, or a stone, only while they
// hold it. Resolves to the effect saved.
async function saveNameEffect(userId, effect) {
    if (!isNameEffect(effect)) throw new FirstPlaceError("Pick First Place or one of the six stones.");

    if (effect === FIRST_PLACE_EFFECT) {
        const holders = await getFirstPlaceHolders();
        if (!Object.values(holders).includes(String(userId))) {
            throw new FirstPlaceError("Only a member in first place can show the First Place effect.", 403);
        }
    } else if (!(await StealItem.exists({ unique: true, key: STONE_NAMES[effect].item, owner: userId }))) {
        throw new FirstPlaceError(`You don't hold the ${STONE_NAMES[effect].name} any more.`, 403);
    }

    await User.updateOne({ _id: userId }, { $set: { nameEffect: effect } });
    return effect;
}

module.exports = {
    TITLES,
    FirstPlaceError,
    getFirstPlaceHolders,
    getStoneHolders,
    forgetFirstPlaceHolders,
    firstPlaceView,
    saveFirstPlaceFx,
    saveNameEffect,
};
