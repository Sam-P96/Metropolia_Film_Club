const mongoose = require("mongoose");
const Comment = require("../models/commentModel");
const Review = require("../models/reviewModel");
const Cut = require("../models/cutModel");
const { parseVote } = require("../models/votable");
const { userSummary } = require("../utils/serialize");
const { hasRole } = require("../middleware/auth");
const { dislikeRefusal } = require("../utils/pvp");
const { noteReply, forgetComment } = require("../utils/notify");
const { banRefusal } = require("../utils/bans");

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

// Review `id` with its author's id, and whether it takes comments: its
// author allows them on all their reviews and hasn't turned them off for
// this one. Null if there's no such review.
async function findForComments(id) {
    const review = mongoose.isValidObjectId(id)
        ? await Review.findById(id).select("user allowComments").populate("user", "allowComments").lean()
        : null;

    if (!review) return null;

    return {
        _id: review._id,
        user: review.user?._id ?? null,
        open: (review.allowComments ?? true) && (review.user?.allowComments ?? true),
    };
}

// Everything matching `where` (one review's comments, or one cut's
// replies), replies to them included, oldest first, for `viewer`.
async function listComments(where, viewer) {
    const comments = await Comment.find(where)
        .sort({ createdAt: 1 })
        .limit(500)
        .populate("user", AUTHOR_FIELDS)
        .lean();

    const shown = comments.filter((comment) => comment.user).map(shape);
    return Comment.withMyVote(shown, viewer);
}

// A new comment's text, trimmed, or why it can't be posted: it's empty or
// too long, or the member is banned from commenting. { text } or
// { status, error }.
function checkNewComment(req) {
    const text = String(req.body?.text ?? "").trim();

    if (!text || text.length > MAX_COMMENT_LENGTH) {
        return { status: 400, error: `Comments are 1 to ${MAX_COMMENT_LENGTH} characters.` };
    }

    const banned = banRefusal(req.user, "comments");
    if (banned) return { status: 403, error: banned };

    return { text };
}

// Whether `parent` (an id, or null for none) is still there, matching
// `where`: under the same review or cut.
async function parentExists(parent, where) {
    if (parent === null) return true;
    return mongoose.isValidObjectId(parent) && Boolean(await Comment.exists({ _id: parent, ...where }));
}

// A comment just saved, as the page reads it.
async function created(comment) {
    const saved = await Comment.findById(comment._id).populate("user", AUTHOR_FIELDS).lean();
    return { ...shape(saved), myVote: null };
}

// Everything under one review, replies included, oldest first; the page
// builds the threads from each comment's `parent` and flips the order for
// "Recent". Turned-off comments are kept but not shown.
async function getComments(req, res) {
    const { id } = req.params;
    const review = await findForComments(id);

    if (!review) {
        return res.status(404).json({ error: "Review not found." });
    }

    if (!review.open) {
        return res.status(403).json({ error: COMMENTS_OFF });
    }

    res.json(await listComments({ review: id }, req.user));
}

// Any logged-in member, under any review that takes comments. `parent`
// replies to another comment under the same review. Whoever it answers gets
// it in their Feed.
async function addComment(req, res) {
    const { id } = req.params;
    const parent = req.body?.parent ?? null;
    const { text, status, error } = checkNewComment(req);

    if (error) {
        return res.status(status).json({ error });
    }

    const review = await findForComments(id);

    if (!review) {
        return res.status(404).json({ error: "Review not found." });
    }

    if (!review.open) {
        return res.status(403).json({ error: COMMENTS_OFF });
    }

    if (!(await parentExists(parent, { review: id }))) {
        return res.status(404).json({ error: "The comment you're replying to has been deleted." });
    }

    const comment = await Comment.create({ review: id, user: req.user._id, text, parent });
    await noteReply(comment, review);

    res.status(201).json(await created(comment));
}

// Every reply under a cut, oldest first, in the same shape as a review's
// comments.
async function getCutReplies(req, res) {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id) || !(await Cut.exists({ _id: id }))) {
        return res.status(404).json({ error: "Cut not found." });
    }

    res.json(await listComments({ cut: id }, req.user));
}

// Any logged-in member, under any cut, the same as commenting on a review.
// `parent` replies to another reply under the same cut. Whoever it answers
// gets it in their Feed.
async function addCutReply(req, res) {
    const { id } = req.params;
    const parent = req.body?.parent ?? null;
    const { text, status, error } = checkNewComment(req);

    if (error) {
        return res.status(status).json({ error });
    }

    const cut = mongoose.isValidObjectId(id) ? await Cut.findById(id).select("user").lean() : null;

    if (!cut) {
        return res.status(404).json({ error: "Cut not found." });
    }

    if (!(await parentExists(parent, { cut: id }))) {
        return res.status(404).json({ error: "The reply you're answering has been deleted." });
    }

    const comment = await Comment.create({ cut: id, user: req.user._id, text, parent });
    await noteReply(comment, cut);

    res.status(201).json(await created(comment));
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

    const refusal =
        vote === "dislike" &&
        (banRefusal(req.user, "dislikeComments") || (await dislikeRefusal(req.user, comment.user, "comment")));

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

    // Its replies stay, under a "[deleted]" placeholder on the page.
    await Comment.deleteOne({ _id: id });
    await forgetComment(id);
    res.json({ ok: true });
}

module.exports = {
    getComments,
    addComment,
    getCutReplies,
    addCutReply,
    setCommentVote,
    deleteComment,
};
