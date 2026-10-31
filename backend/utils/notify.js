const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const Comment = require("../models/commentModel");
const Cut = require("../models/cutModel");
const Follow = require("../models/followModel");
const Notification = require("../models/notificationModel");

// A review is trending once it has more likes than this. It then goes out,
// once, to the Feed of every member who doesn't already follow its author.
const TRENDING_LIKES = 5;

// A cut is a viral take once it has this many likes. It then goes out,
// once, to every member's Feed. Matches VIRAL_LIKES in
// frontend/src/components/feed/FeedItem.jsx.
const VIRAL_LIKES = 5;

const VOTE_TYPES = ["like", "dislike"];
const FROM_ONE_MEMBER = [
    "review", "trending", "reply", "follow", "pvp", "cut", "cutReply", "gift", "scratchWin", "scratchJackpot",
    ...Notification.FARKLE_TYPES,
];

// The Farkle notifications that wait for the member to act, pinned to the
// top of their Notifications page. "farkleTurn" isn't sent any more (games
// being played show at the very top of Notifications by themselves:
// controllers/feedController.js), but is still cleared with the rest.
const FARKLE_PINNED = ["farkleChallenge", "farkleTurn"];

// How many lines a PvP announcement can be made with. Matches PVP_LINES in
// frontend/src/components/feed/FeedItem.jsx.
const PVP_LINES = 10;

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
// or the author of `subject` (the review, or the cut for a reply under a
// cut) for one straight under it. Not yourself.
async function noteReply(comment, subject) {
    const parent = comment.parent
        ? await Comment.findById(comment.parent).select("user").lean()
        : null;
    const recipient = parent ? parent.user : subject.user;

    if (!recipient || String(recipient) === String(comment.user)) return;

    await Notification.create({
        recipient,
        ...(comment.cut ? { type: "cutReply", cut: subject._id } : { type: "reply", review: subject._id }),
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

// `userId` turned PvP on: everyone else hears about it, each with a line
// picked at random. Any earlier announcement goes first, so switching PvP
// off and on can't pile them up.
async function noteEnabledPvp(userId) {
    await forgetPvp(userId);

    const members = await User.find({ _id: { $ne: userId } }).distinct("_id");
    if (members.length === 0) return;

    await Notification.insertMany(members.map((recipient) => ({
        recipient,
        type: "pvp",
        actors: [userId],
        variant: Math.floor(Math.random() * PVP_LINES),
    })));
}

// They turned PvP off again: the announcement quietly goes.
function forgetPvp(userId) {
    return Notification.deleteMany({ type: "pvp", actors: userId });
}

// A new event. A club event goes to every member, whoever posted it
// included. A member screening goes to its host, the members who follow
// them, and every moderator and admin (who look after screenings), each
// once.
async function noteNewEvent(event) {
    if (event.official !== false) {
        const members = await User.find().distinct("_id");
        await sendToEach(members, { type: "event", event: event._id, actors: [event.createdBy] });
        return;
    }

    const [followers, staff] = await Promise.all([
        Follow.find({ following: event.createdBy }).distinct("follower"),
        User.find({ role: { $in: ["moderator", "admin"] } }).distinct("_id"),
    ]);
    const recipients = [...new Map(
        [event.createdBy, ...followers, ...staff].map((id) => [String(id), id])
    ).values()];

    await sendToEach(recipients, { type: "event", event: event._id, actors: [event.createdBy] });
}

// A member screening made official is a new club event for every member
// who hasn't heard about it yet (its host and their followers have),
// whoever promoted it included.
async function notePromotedEvent(event) {
    const [members, told] = await Promise.all([
        User.find().distinct("_id"),
        Notification.find({ type: "event", event: event._id }).distinct("recipient"),
    ]);
    const skip = new Set(told.map(String));

    await sendToEach(
        members.filter((id) => !skip.has(String(id))),
        { type: "event", event: event._id, actors: [event.createdBy] }
    );
}

// The Promote button on an event's page: it goes out again, to every member
// for a club event, or for a member screening to its host and their
// followers. Whoever already had it loses the old one, so it shows once,
// at the top. Returns how many members it went to.
async function noteRepostedEvent(event) {
    let recipients;

    if (event.official !== false) {
        recipients = await User.find().distinct("_id");
    } else {
        // Looked up again so a host who has since deleted their account drops out.
        const followers = await Follow.find({ following: event.createdBy }).distinct("follower");
        recipients = await User.find({ _id: { $in: [event.createdBy, ...followers] } }).distinct("_id");
    }

    await Notification.deleteMany({ type: "event", event: event._id, recipient: { $in: recipients } });
    await sendToEach(recipients, { type: "event", event: event._id, actors: [event.createdBy] });
    return recipients.length;
}

function forgetEvent(eventId) {
    return Notification.deleteMany({ event: eventId });
}

// A member posted a cut: it goes to everyone who follows them, and to them,
// so they see it went out (and can delete it from there). Replies under it
// go through noteReply.
async function noteNewCut(cut) {
    const followers = await Follow.find({ following: cut.user }).distinct("follower");
    await sendToEach([cut.user, ...followers], { type: "cut", cut: cut._id, actors: [cut.user] });
}

// After a like on a cut: if it has just reached the viral line, mark it so
// it only goes out once, and send it to every member, its author included,
// at the top of their Feed. Whoever had it already (its author and their
// followers) loses that copy, so it shows once.
async function noteViralCut(cutId) {
    const cut = await Cut.findOneAndUpdate(
        { _id: cutId, viralAt: null, likeCount: { $gte: VIRAL_LIKES } },
        { $set: { viralAt: new Date() } },
        { timestamps: false }
    ).select("user").lean();

    if (!cut) return;

    const members = await User.find().distinct("_id");
    await Notification.deleteMany({ type: "cut", cut: cut._id });
    await sendToEach(members, { type: "cut", cut: cut._id, actors: [cut.user] });
}

// A cut was deleted: it goes, and so do the replies to it.
function forgetCut(cutId) {
    return Notification.deleteMany({ cut: cutId });
}

// A review or comment was deleted, so its notifications go too.
function forgetReview(reviewId) {
    return Notification.deleteMany({ review: reviewId });
}

function forgetComment(commentId) {
    return Notification.deleteMany({ comment: commentId });
}

// The 12:00 payout gave `userId` `amount` PP. Yesterday's goes first, so
// there's only ever the latest one, not a month of them.
async function notePayout(userId, amount) {
    await Notification.deleteMany({ recipient: userId, type: "payout" });
    await Notification.create({ recipient: userId, type: "payout", amount });
}

// `fromId` gifted `toId` `amount` P-PP (utils/wallet.js giftPpp).
function noteGift(toId, fromId, amount) {
    return Notification.create({ recipient: toId, type: "gift", amount, actors: [fromId] });
}

// Box Office Scratch (utils/scratch.js): `winnerId` won `tier` (its key),
// worth `amount`. Everyone who follows them hears about it.
async function noteScratchWin(winnerId, tier, amount) {
    const followers = await Follow.find({ following: winnerId }).distinct("follower");
    await sendToEach(followers, { type: "scratchWin", tier, amount, actors: [winnerId] });
}

// `winnerId` won the Box Office Scratch jackpot, `amount` P-PP: every
// member hears about it, the winner included, like a club event.
async function noteScratchJackpot(winnerId, amount) {
    const members = await User.find().distinct("_id");
    await sendToEach(members, { type: "scratchJackpot", amount, actors: [winnerId] });
}

// Farkle between members (utils/farkle.js). A challenge waiting on someone
// is pinned: it sits at the top of their Notifications until they answer.
// Each new one for a game takes the place of the last, so there's only
// ever one. Games being played aren't notifications at all: the
// Notifications page lists them above everything, as they are right now.
function unpinFarkle(matchId) {
    return Notification.deleteMany({ match: matchId, type: { $in: FARKLE_PINNED } });
}

// The terms on the table (match.offer) are waiting on `offer.to`.
async function noteFarkleChallenge(match) {
    await unpinFarkle(match._id);
    await Notification.create({
        recipient: match.offer.to,
        type: "farkleChallenge",
        match: match._id,
        actors: [match.offer.by],
        pinned: true,
    });
}

// The challenge was answered, or wasn't: its pinned notice goes, and with
// a `type` ("farkleAccepted", "farkleDeclined", "farkleExpired"), `to`
// hears about it from `from`.
async function noteFarkleAnswer(match, type = null, to = null, from = null) {
    await unpinFarkle(match._id);
    if (type) await Notification.create({ recipient: to, type, match: match._id, actors: [from] });
}

// The game is over: the pinned notice goes, and each player hears how it
// ended, except `skip` (a member who has just left the club).
async function noteFarkleOver(match, skip = null) {
    await unpinFarkle(match._id);

    const [first, second] = match.players.map((player) => player.user);
    const notes = [
        { recipient: first, actors: [second] },
        { recipient: second, actors: [first] },
    ].filter((note) => note.recipient && String(note.recipient) !== String(skip));

    if (notes.length === 0) return;
    await Notification.insertMany(notes.map((note) => ({ ...note, type: "farkleOver", match: match._id })));
}

// The game is over: everyone who follows either player hears who won how
// much from whom, once each, even if they follow both (then `actors` has
// both). Not the players themselves, who got farkleOver, and nothing about
// `skip`, a member who has just left the club.
async function noteFarkleResult(match, skip = null) {
    const players = match.players.map((player) => player.user).filter(Boolean);
    const followed = players.filter((id) => String(id) !== String(skip));
    if (followed.length === 0) return;

    const isPlayer = new Set(players.map(String));
    const follows = await Follow.find({ following: { $in: followed } }).select("follower following").lean();

    const notes = new Map();
    for (const follow of follows) {
        if (isPlayer.has(String(follow.follower))) continue;
        const note = notes.get(String(follow.follower)) ?? { recipient: follow.follower, actors: [] };
        note.actors.push(follow.following);
        notes.set(String(follow.follower), note);
    }

    if (notes.size === 0) return;
    await Notification.insertMany([...notes.values()].map((note) => ({ ...note, type: "farkleResult", match: match._id })));
}

// A game that never got going was deleted.
function forgetFarkleMatch(matchId) {
    return Notification.deleteMany({ match: matchId });
}

// An account was deleted: their own Feed, everything about their reviews
// and cuts, the notifications they set off, and their name in vote groups.
async function forgetMember(userId, reviewIds, cutIds = []) {
    await Notification.deleteMany({
        $or: [
            { recipient: userId },
            { review: { $in: reviewIds } },
            { cut: { $in: cutIds } },
            { type: { $in: FROM_ONE_MEMBER }, actors: userId },
        ],
    });
    await Notification.updateMany({ actors: userId }, { $pull: { actors: userId } });
    await Notification.deleteMany({ type: { $in: VOTE_TYPES }, actors: { $size: 0 } });
}

module.exports = {
    TRENDING_LIKES,
    VIRAL_LIKES,
    noteReviewVote,
    noteNewReview,
    noteTrending,
    noteReply,
    noteFollow,
    forgetFollow,
    noteNewEvent,
    notePromotedEvent,
    noteRepostedEvent,
    noteEnabledPvp,
    forgetPvp,
    forgetEvent,
    forgetReview,
    forgetComment,
    noteNewCut,
    noteViralCut,
    forgetCut,
    forgetMember,
    notePayout,
    noteGift,
    noteScratchWin,
    noteScratchJackpot,
    noteFarkleChallenge,
    noteFarkleAnswer,
    noteFarkleOver,
    noteFarkleResult,
    forgetFarkleMatch,
};
