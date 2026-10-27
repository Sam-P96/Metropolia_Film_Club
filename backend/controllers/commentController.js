const mongoose = require("mongoose");
const Comment = require("../models/commentModel");
const Review = require("../models/reviewModel");
const { parseVote } = require("../models/votable");
const { userSummary } = require("../utils/serialize");
const { hasRole } = require("../middleware/auth");
const { dislikeRefusal } = require("../utils/pvp");

const MAX_COMMENT_LENGTH = 1000;

// The fields userSummary needs to draw the commenter.
const AUTHOR_FIELDS = "username role memberTitle avatarUrl reviewCardBanner pvp value";

const COMMENTS_OFF = "Comments are turned off for this review.";

// A comment as the review page reads it: its author attached, and never who
// voted.
function shape(comment) {
    const { likedBy, dislikedBy, ...rest } = comment;
    return { ...rest, user: userSummary(comment.user) };
}

// Whether review `id` takes comments: its author allows them on all their
// reviews and hasn't turned them off for this one. Null if there's no such
// review.
async function commentsOpen(id) {
    const review = mongoose.isValidObjectId(id)
        ? await Review.findById(id).select("user allowComments").populate("user", "allowComments").lean()
        : null;

    if (!review) return null;
    return (review.allowComments ?? true) && (review.user?.allowComments ?? true);
}

// Everything under one review, oldest first; the page flips it for "Recent".
// Turned-off comments are kept but not shown.
async function getComments(req, res) {
    const { id } = req.params;
    const open = await commentsOpen(id);

    if (open === null) {
        return res.status(404).json({ error: "Review not found." });
    }

    if (!open) {
        return res.status(403).json({ error: COMMENTS_OFF });
    }

    const comments = await Comment.find({ review: id })
        .sort({ createdAt: 1 })
        .limit(500)
        .populate("user", AUTHOR_FIELDS)
        .lean();

    const shown = comments.filter((comment) => comment.user).map(shape);
    res.json(await Comment.withMyVote(shown, req.user));
}

// Any logged-in member, under any review that takes comments.
async function addComment(req, res) {
    const { id } = req.params;
    const text = String(req.body?.text ?? "").trim();

    if (!text || text.length > MAX_COMMENT_LENGTH) {
        return res.status(400).json({ error: `Comments are 1 to ${MAX_COMMENT_LENGTH} characters.` });
    }

    const open = await commentsOpen(id);

    if (open === null) {
        return res.status(404).json({ error: "Review not found." });
    }

    if (!open) {
        return res.status(403).json({ error: COMMENTS_OFF });
    }

    const created = await Comment.create({ review: id, user: req.user._id, text });
    const comment = await Comment.findById(created._id).populate("user", AUTHOR_FIELDS).lean();

    res.status(201).json({ ...shape(comment), myVote: null });
}

// The thumbs up and thumbs down, as on reviews (dislikes only between
// members with PVP on). Resolves to { likeCount, dislikeCount, myVote }.
async function setCommentVote(req, res) {
    const vote = parseVote(req.body?.vote);

    if (vote === undefined) {
        return res.status(400).json({ error: "Vote like, dislike, or neither." });
    }

    const comment = mongoose.isValidObjectId(req.params.id)
        ? await Comment.findById(req.params.id).select("user").lean()
        : null;

    if (!comment) {
        return res.status(404).json({ error: "Comment not found." });
    }

    const refusal = vote === "dislike" && (await dislikeRefusal(req.user, comment.user, "comment"));

    if (refusal) {
        return res.status(403).json({ error: refusal });
    }

    const result = await Comment.castVote(comment._id, req.user, vote);

    if (!result) {
        return res.status(404).json({ error: "Comment not found." });
    }

    res.json(result);
}

// The member who wrote it, or a moderator or admin.
async function deleteComment(req, res) {
    const { id } = req.params;
    const comment = mongoose.isValidObjectId(id)
        ? await Comment.findById(id).select("user").lean()
        : null;

    if (!comment) {
        return res.status(404).json({ error: "Comment not found." });
    }

    const isAuthor = String(comment.user) === String(req.user._id);

    if (!isAuthor && !hasRole(req.user, "moderator")) {
        return res.status(403).json({ error: "You can only delete your own comments." });
    }

    await Comment.deleteOne({ _id: id });
    res.json({ ok: true });
}

module.exports = {
    getComments,
    addComment,
    setCommentVote,
    deleteComment,
};
