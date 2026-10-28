const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const Comment = require("../models/commentModel");
const Follow = require("../models/followModel");
const Notification = require("../models/notificationModel");

// A review is trending once it has more likes than this. It then goes out,
// once, to the Feed of every member who doesn't already follow its author.
const TRENDING_LIKES = 5;

const VOTE_TYPES = ["like", "dislike"];
const FROM_ONE_MEMBER = ["review", "trending", "reply", "follow"];

// `voter` changed their vote on `review` (anything with _id and user) to
// "like", "dislike" or null. Likes and dislikes are grouped per review, so
// they come off whichever group they were in, and onto the new one at the
// front, which moves it to the top of the Feed. Voting on your own review
// tells nobody.
async function noteReviewVote(review, voter, vote) {
    if (String(review.user) === String(voter._id)) return;

    const group = { recipient: review.user, review: review._id };

    await Notification.updateMany(
        { ...group, type: { $in: VOTE_TYPES } },
        { $pull: { actors: voter._id } }
    );
    await Notification.deleteMany({ ...group, type: { $in: VOTE_TYPES }, actors: { $size: 0 } });

    if (vote) {
        await Notification.updateOne(
            { ...group, type: vote },
            { $push: { actors: { $each: [voter._id], $position: 0 } }, $set: { at: new Date() } },
            { upsert: true }
        );
    }
}

function sendToEach(recipients, notification) {
    if (recipients.length === 0) return null;
    return Notification.insertMany(recipients.map((recipient) => ({ ...notification, recipient })));
}

// A member posted a new review: tell everyone who follows them.
async function noteNewReview(review) {
    const followers = await Follow.find({ following: review.user }).distinct("follower");
    await sendToEach(followers, { type: "review", review: review._id, actors: [review.user] });
}

// After a like: if the review has just passed the trending line, mark it so
// it only goes out once, and send it to everyone but its author and the
// members who follow them (they got it as a new review).
async function noteTrending(reviewId) {
    const review = await Review.findOneAndUpdate(
        { _id: reviewId, trendingAt: null, likeCount: { $gt: TRENDING_LIKES } },
        { $set: { trendingAt: new Date() } },
        { timestamps: false }
    ).select("user").lean();

    if (!review) return;

    const [members, followers] = await Promise.all([
        User.find().distinct("_id"),
        Follow.find({ following: review.user }).distinct("follower"),
    ]);
    const skip = new Set([String(review.user), ...followers.map(String)]);

    await sendToEach(
        members.filter((id) => !skip.has(String(id))),
        { type: "trending", review: review._id, actors: [review.user] }
    );
}

// A new comment: tell whoever it answers. That's the comment it replies to,
// or the review's author for one straight under the review. Not yourself.
async function noteReply(comment, review) {
    const parent = comment.parent
        ? await Comment.findById(comment.parent).select("user").lean()
        : null;
    const recipient = parent ? parent.user : review.user;

    if (!recipient || String(recipient) === String(comment.user)) return;

    await Notification.create({
        recipient,
        type: "reply",
        review: review._id,
        comment: comment._id,
        actors: [comment.user],
    });
}

// `followerId` started following `followingId`. Unfollowing takes it back
// without a word, so following again doesn't leave two.
async function noteFollow(followerId, followingId) {
    await forgetFollow(followerId, followingId);
    await Notification.create({ recipient: followingId, type: "follow", actors: [followerId] });
}

function forgetFollow(followerId, followingId) {
    return Notification.deleteMany({ recipient: followingId, type: "follow", actors: followerId });
}

// A review or comment was deleted, so its notifications go too.
function forgetReview(reviewId) {
    return Notification.deleteMany({ review: reviewId });
}

function forgetComment(commentId) {
    return Notification.deleteMany({ comment: commentId });
}

// An account was deleted: their own Feed, everything about their reviews,
// the notifications they set off, and their name in vote groups.
async function forgetMember(userId, reviewIds) {
    await Notification.deleteMany({
        $or: [
            { recipient: userId },
            { review: { $in: reviewIds } },
            { type: { $in: FROM_ONE_MEMBER }, actors: userId },
        ],
    });
    await Notification.updateMany({ actors: userId }, { $pull: { actors: userId } });
    await Notification.deleteMany({ type: { $in: VOTE_TYPES }, actors: { $size: 0 } });
}

module.exports = {
    TRENDING_LIKES,
    noteReviewVote,
    noteNewReview,
    noteTrending,
    noteReply,
    noteFollow,
    forgetFollow,
    forgetReview,
    forgetComment,
    forgetMember,
};
