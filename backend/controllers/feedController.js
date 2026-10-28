const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const Comment = require("../models/commentModel");
const Notification = require("../models/notificationModel");
const Follow = require("../models/followModel");
const { AUTHOR_FIELDS, MEMBER_FIELDS, userSummary, reviewWithUser } = require("../utils/serialize");
const { withAuthorStanding } = require("../utils/level");
const { parseOffset } = require("../utils/paging");

// The Feed shows a member's newest notifications, this many at most, a page
// at a time. Older ones are deleted after 90 days (models/notificationModel.js).
const FEED_SIZE = 100;
const PAGE_SIZE = 10;

// Turns notifications into what the Feed draws: each review as a full review
// card, the members involved, a reply's text, and for a new follower
// whether you follow them back. Leaves out any whose review, comment or
// members have since been deleted.
async function hydrate(rows, viewer) {
    const idsOf = (pick) => [...new Set(rows.flatMap(pick).filter(Boolean).map(String))];
    const followers = idsOf((row) => (row.type === "follow" ? row.actors : []));

    const [reviews, actors, comments, followedBack] = await Promise.all([
        Review.find({ _id: { $in: idsOf((row) => row.review) } }).populate("user", AUTHOR_FIELDS).lean(),
        User.find({ _id: { $in: idsOf((row) => row.actors) } }).select(MEMBER_FIELDS).lean(),
        Comment.find({ _id: { $in: idsOf((row) => row.comment) } }).select("text parent").lean(),
        Follow.find({ follower: viewer._id, following: { $in: followers } }).distinct("following"),
    ]);
    const following = new Set(followedBack.map(String));

    const cards = await Review.withMyVote(
        await withAuthorStanding(reviews.filter((review) => review.user).map(reviewWithUser)),
        viewer
    );

    const byId = (list) => new Map(list.map((item) => [String(item._id), item]));
    const reviewById = byId(cards);
    const memberById = byId(actors.map(userSummary));
    const commentById = byId(comments);

    return rows.flatMap((row) => {
        const review = reviewById.get(String(row.review));
        const members = row.actors.map((id) => memberById.get(String(id))).filter(Boolean);
        const comment = row.comment ? commentById.get(String(row.comment)) : null;

        if (members.length === 0) return [];

        if (row.type === "follow") {
            return [{
                _id: row._id,
                type: row.type,
                at: row.at,
                actors: members,
                followingBack: following.has(String(members[0]._id)),
            }];
        }

        if (!review || (row.type === "reply" && !comment)) return [];

        return [{
            _id: row._id,
            type: row.type,
            at: row.at,
            review,
            actors: members,
            ...(comment && {
                reply: { _id: comment._id, text: comment.text, toComment: Boolean(comment.parent) },
            }),
        }];
    });
}

// ?skip=n. { items, hasMore, next, background }: `next` is the skip for the
// next page, and `background` the member's Notifications background setting.
async function getFeed(req, res) {
    const skip = Math.min(parseOffset(req.query.skip), FEED_SIZE);
    const limit = Math.min(PAGE_SIZE, FEED_SIZE - skip);
    const mine = { recipient: req.user._id };

    const [rows, total] = await Promise.all([
        limit > 0
            ? Notification.find(mine).sort({ at: -1, _id: -1 }).skip(skip).limit(limit).lean()
            : [],
        Notification.countDocuments(mine),
    ]);

    res.json({
        items: await hydrate(rows, req.user),
        hasMore: skip + rows.length < Math.min(total, FEED_SIZE),
        next: skip + rows.length,
        background: req.user.feedBackground ?? "default",
    });
}

module.exports = { getFeed };
