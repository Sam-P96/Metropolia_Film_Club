const mongoose = require("mongoose");
const Cut = require("../models/cutModel");
const Comment = require("../models/commentModel");
const { parseVote } = require("../models/votable");
const { hasRole } = require("../middleware/auth");
const { noteNewCut, noteViralCut, forgetCut } = require("../utils/notify");
const { banRefusal } = require("../utils/bans");
const { dislikeRefusal } = require("../utils/pvp");
const { MEMBER_FIELDS } = require("../utils/serialize");
const { CUT_FIELDS, cutItems } = require("../utils/cuts");
const { parseOffset } = require("../utils/paging");

const MAX_CUT_LENGTH = 280;
const PAGE_SIZE = 10;

// "Show all cuts" on the Notifications page, for moderators and admins; the
// router checks. Every member's cuts, newest first, a page at a time, each
// shaped like a cut in the Feed. ?skip=n. { items, hasMore, next }.
async function getAllCuts(req, res) {
    const skip = parseOffset(req.query.skip);

    const [cuts, total] = await Promise.all([
        Cut.find()
            .select(CUT_FIELDS)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(PAGE_SIZE)
            .populate("user", MEMBER_FIELDS)
            .lean(),
        Cut.countDocuments(),
    ]);

    res.json({
        items: await cutItems(cuts, req.user),
        hasMore: skip + cuts.length < total,
        next: skip + cuts.length,
    });
}

// One cut, shaped like a cut in the Feed, for its own page (where Feed
// links to a reply under it go). Any logged-in member.
async function getCut(req, res) {
    const { id } = req.params;
    const cut = mongoose.isValidObjectId(id)
        ? await Cut.findById(id).select(CUT_FIELDS).populate("user", MEMBER_FIELDS).lean()
        : null;
    const [item] = cut ? await cutItems([cut], req.user) : [];

    if (!item) {
        return res.status(404).json({ error: "Cut not found." });
    }

    res.json(item);
}

// Any logged-in member, from the box at the top of their Notifications. It
// goes to their followers' Notifications and their own.
async function postCut(req, res) {
    const text = String(req.body?.text ?? "").trim();

    if (!text || text.length > MAX_CUT_LENGTH) {
        return res.status(400).json({ error: `Cuts are 1 to ${MAX_CUT_LENGTH} characters.` });
    }

    const banned = banRefusal(req.user, "cuts");
    if (banned) {
        return res.status(403).json({ error: banned });
    }

    const cut = await Cut.create({ user: req.user._id, text });
    await noteNewCut(cut);

    res.status(201).json({ _id: cut._id, text: cut.text, createdAt: cut.createdAt });
}

// The thumbs up and thumbs down, as on comments (dislikes only between
// members with PVP on, and the comment dislike ban stops them too). They
// don't count towards levels, but enough likes make it a viral take (see
// noteViralCut). Resolves to { likeCount, dislikeCount, myVote }.
async function setCutVote(req, res) {
    const vote = parseVote(req.body?.vote);

    if (vote === undefined) {
        return res.status(400).json({ error: "Vote like, dislike, or neither." });
    }

    const cut = mongoose.isValidObjectId(req.params.id)
        ? await Cut.findById(req.params.id).select("user").lean()
        : null;

    if (!cut) {
        return res.status(404).json({ error: "Cut not found." });
    }

    const refusal =
        vote === "dislike" &&
        (banRefusal(req.user, "dislikeComments") || (await dislikeRefusal(req.user, cut.user, "cut")));

    if (refusal) {
        return res.status(403).json({ error: refusal });
    }

    const result = await Cut.castVote(cut._id, req.user, vote);

    if (!result) {
        return res.status(404).json({ error: "Cut not found." });
    }

    if (vote === "like") await noteViralCut(cut._id);

    res.json(result);
}

// The member who posted it, or a moderator or admin. It leaves everyone's
// Notifications, and its replies go with it.
async function deleteCut(req, res) {
    const { id } = req.params;
    const cut = mongoose.isValidObjectId(id) ? await Cut.findById(id).select("user").lean() : null;

    if (!cut) {
        return res.status(404).json({ error: "Cut not found." });
    }

    const isAuthor = String(cut.user) === String(req.user._id);

    if (!isAuthor && !hasRole(req.user, "moderator")) {
        return res.status(403).json({ error: "You can only delete your own cuts." });
    }

    await Cut.deleteOne({ _id: id });
    await Comment.deleteMany({ cut: id });
    await forgetCut(id);
    res.json({ ok: true });
}

module.exports = { getAllCuts, getCut, postCut, setCutVote, deleteCut };
