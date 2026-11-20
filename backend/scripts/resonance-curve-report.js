// A one-off report: what the Resonance gap curve (utils/resonance.js
// GAP_CURVE) does to everyone's matches. Every pair of eligible members is
// worked out twice, with a straight line (curve 1, how it was) and with
// the curve the site uses now (2), and it prints:
//   - how many pairs land in each tier, under each curve
//   - how many reach 75%+ (the home page's suggestions)
//   - each member's top 3 matches under each curve, old % -> new %
//
// It only reads: nothing is stored, changed or removed. Members are loaded
// as the nightly sweep loads them (utils/resonanceStore.js
// recalculateResonance): MIN_RATED+ rated films, accounts that still
// exist, whatever their Resonance and privacy settings.
//
// From backend/, with MONGO_URI in .env:
//   node scripts/resonance-curve-report.js
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const FilmLog = require("../models/filmLogModel");
const User = require("../models/userModel");
const { GAP_CURVE, MIN_RATED, SUGGEST_FROM, tasteOf, resonanceBetween } = require("../utils/resonance");
const { RESONANCE_TIERS } = require("../../shared/resonance.js");

const OLD_CURVE = 1;
const NEW_CURVE = GAP_CURVE;
const TOP = 3;

// What recalculateResonance reads: a rated film is watched, with a rating.
const RATED = { status: "completed", rating: { $ne: null } };

// Every eligible member, as the sweep finds them: [{ id, username, rated,
// taste }], by id.
async function eligibleMembers() {
    const logs = await FilmLog.find(RATED).select("user tmdbId title posterPath rating genres year certification").lean();

    const byMember = new Map();
    for (const log of logs) {
        const id = String(log.user);
        if (!byMember.has(id)) byMember.set(id, []);
        byMember.get(id).push(log);
    }

    const enough = [...byMember].filter(([, films]) => films.length >= MIN_RATED).map(([id]) => id);
    const users = await User.find({ _id: { $in: enough } }).select("username").lean();
    const names = new Map(users.map((user) => [String(user._id), user.username]));

    return enough
        .filter((id) => names.has(id))
        .sort()
        .map((id) => ({ id, username: names.get(id), rated: byMember.get(id).length, taste: tasteOf(byMember.get(id)) }));
}

const SOUL = RESONANCE_TIERS.soul;
const RESONANCE = RESONANCE_TIERS.resonance;
const TIERS = [
    { label: `Soul Resonance (${SOUL}-100%)`, has: (percent) => percent >= SOUL },
    { label: `Resonance (${RESONANCE}-${SOUL - 1}%)`, has: (percent) => percent >= RESONANCE && percent < SOUL },
    { label: `Dissonance (below ${RESONANCE}%)`, has: (percent) => percent < RESONANCE },
];
const EXTRA = [
    { label: "90%+", has: (percent) => percent >= 90 },
    { label: `${SUGGEST_FROM}%+ (home page suggestions)`, has: (percent) => percent >= SUGGEST_FROM },
];

const share = (count, total) => (total ? `${((count / total) * 100).toFixed(1)}%` : "-");
const pad = (text, width) => String(text).padEnd(width);
const padLeft = (text, width) => String(text).padStart(width);

async function report() {
    const members = await eligibleMembers();
    const pairs = [];
    for (let a = 0; a < members.length; a++) {
        for (let b = a + 1; b < members.length; b++) {
            pairs.push({
                a: members[a],
                b: members[b],
                old: resonanceBetween(members[a].taste, members[b].taste, { gapCurve: OLD_CURVE }).percent,
                now: resonanceBetween(members[a].taste, members[b].taste, { gapCurve: NEW_CURVE }).percent,
            });
        }
    }

    console.log(`Resonance gap curve report: ${members.length} eligible members (${MIN_RATED}+ rated films), ${pairs.length} pairs.`);
    console.log(`Old: GAP_CURVE = ${OLD_CURVE} (straight line). New: GAP_CURVE = ${NEW_CURVE} (what the site uses).\n`);

    const width = Math.max(...[...TIERS, ...EXTRA].map((row) => row.label.length)) + 2;
    const line = (label, old, now) => `${pad(label, width)}${padLeft(old, 14)}${padLeft(now, 14)}`;
    const counts = (has) => {
        const old = pairs.filter((pair) => has(pair.old)).length;
        const now = pairs.filter((pair) => has(pair.now)).length;
        return [`${old} (${share(old, pairs.length)})`, `${now} (${share(now, pairs.length)})`];
    };

    console.log(line("Pairs by tier", "old (curve 1)", "new (curve 2)"));
    for (const tier of TIERS) console.log(line(tier.label, ...counts(tier.has)));
    console.log("");
    for (const row of EXTRA) console.log(line(row.label, ...counts(row.has)));

    const moved = { up: 0, same: 0, down: 0 };
    for (const pair of pairs) moved[pair.now > pair.old ? "up" : pair.now < pair.old ? "down" : "same"] += 1;
    const change = pairs.reduce((sum, pair) => sum + (pair.now - pair.old), 0);
    console.log(`\nPairs that went up: ${moved.up}, stayed the same: ${moved.same}, went down: ${moved.down}. Average change: ${pairs.length ? (change / pairs.length).toFixed(1) : 0} points.`);

    // Each member's matches, best first (by name on a tie).
    console.log(`\nEach member's top ${TOP}, old % -> new %:`);
    for (const member of [...members].sort((x, y) => x.username.localeCompare(y.username))) {
        const theirs = pairs
            .filter((pair) => pair.a === member || pair.b === member)
            .map((pair) => ({ other: pair.a === member ? pair.b : pair.a, old: pair.old, now: pair.now }));
        const top = (key) =>
            [...theirs]
                .sort((x, y) => y[key] - x[key] || x.other.username.localeCompare(y.other.username))
                .slice(0, TOP)
                .map((match) => `${match.other.username} ${match.old}% -> ${match.now}%`)
                .join(", ") || "(nobody)";

        console.log(`\n  ${member.username} (${member.rated} rated)`);
        console.log(`    old curve: ${top("old")}`);
        console.log(`    new curve: ${top("now")}`);
    }
}

// No index builds or new collections on connecting (Mongoose's defaults):
// this only ever reads.
mongoose
    .connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false })
    .then(report)
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
