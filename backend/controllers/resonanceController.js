const { parseOffset } = require("../utils/paging");
const mongoose = require("mongoose");
const { MIN_RATED } = require("../utils/resonance");
const { standingOf, suggestionsFor, rankingFor, soulMapFor, comparisonWith, everyonesResonance, lastSweep } = require("../utils/resonanceStore");
const { runSweep } = require("../jobs/resonanceSweep");

// Resonance, for the logged-in member (utils/resonanceStore.js applies
// everyone's settings and privacy). All of it needs a login.

// Whether they can use it: { on, icon, rated, needed, eligible, waiting }.
async function getMyResonance(req, res) {
    res.json(await standingOf(req.user._id));
}

// The home page's pool of strong matches: { matches }. Empty when they
// can't use Resonance or have no match strong enough.
async function getSuggestions(req, res) {
    res.json({ matches: await suggestionsFor(req.user._id) });
}

// The Resonance page: ?side=resonance (the default) or dissonance, a page
// at a time from ?offset, only the names with ?q in them if it's given.
async function getRanking(req, res) {
    const side = req.query.side === "dissonance" ? "dissonance" : "resonance";
    const search = typeof req.query.q === "string" ? req.query.q.slice(0, 50) : "";
    res.json(await rankingFor(req.user._id, side, parseOffset(req.query.offset), search));
}

// { [member id]: { percent, icon } } for everyone they have a Soul
// Resonance with, for the glow on review cards and the icon after names.
async function getSoulResonance(req, res) {
    res.json(await soulMapFor(req.user._id));
}

// Their ratings side by side with another member's: { match, films }
// (resonanceStore comparisonWith). 404 unless they have a Resonance with
// that member that they may see.
async function getComparison(req, res) {
    const { userId } = req.params;
    const comparison = mongoose.isValidObjectId(userId) ? await comparisonWith(req.user._id, userId) : null;

    if (!comparison) {
        return res.status(404).json({ error: "You have no Resonance with this member." });
    }

    res.json(comparison);
}

// /SECRETresonance, moderators and admins only: every pair, ?min=20
// (members with enough rated films, the default) or ?min=any (anyone who
// has rated something), ?member=<id> for one member's, a page at a time
// from ?offset. With `updatedAt`, when members' stored Resonance was last
// worked out (null if nothing's stored).
async function getEveryonesResonance(req, res) {
    const memberId = mongoose.isValidObjectId(req.query.member) ? String(req.query.member) : null;

    const [everyone, last] = await Promise.all([
        everyonesResonance({
            minRated: req.query.min === "any" ? 1 : MIN_RATED,
            memberId,
            offset: parseOffset(req.query.offset),
        }),
        lastSweep(),
    ]);

    res.json({ ...everyone, updatedAt: last?.at ?? null });
}

// /SECRETresonance's "Update Resonance now", moderators and admins only:
// works everyone's stored Resonance out again straight away, instead of
// waiting for 04:00 (which still runs). If a sweep is already running, it
// waits for that one. { members, pairs, updatedAt }.
async function updateResonanceNow(req, res) {
    const result = await runSweep();

    if (!result) {
        return res.status(500).json({ error: "Couldn't update Resonance. Try again." });
    }

    res.json({ members: result.members, pairs: result.pairs, updatedAt: result.at });
}

module.exports = { getMyResonance, getSuggestions, getRanking, getSoulResonance, getComparison, getEveryonesResonance, updateResonanceNow };
