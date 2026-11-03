const { parseOffset } = require("../utils/paging");
const mongoose = require("mongoose");
const { MIN_RATED } = require("../utils/resonance");
const { standingOf, suggestionsFor, rankingFor, soulMapFor, everyonesResonance } = require("../utils/resonanceStore");

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

// /SECRETresonance, admins only: every pair, ?min=20 (members with enough
// rated films, the default) or ?min=any (anyone who has rated something),
// ?member=<id> for one member's, a page at a time from ?offset.
async function getEveryonesResonance(req, res) {
    const memberId = mongoose.isValidObjectId(req.query.member) ? String(req.query.member) : null;

    res.json(
        await everyonesResonance({
            minRated: req.query.min === "any" ? 1 : MIN_RATED,
            memberId,
            offset: parseOffset(req.query.offset),
        })
    );
}

module.exports = { getMyResonance, getSuggestions, getRanking, getSoulResonance, getEveryonesResonance };
