const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const Comment = require("../models/commentModel");
const Notification = require("../models/notificationModel");
const Follow = require("../models/followModel");
const Event = require("../models/eventModel");
const Report = require("../models/reportModel");
const { hasRole } = require("../middleware/auth");
const { AUTHOR_FIELDS, MEMBER_FIELDS, userSummary, reviewWithUser } = require("../utils/serialize");
const { withAuthorStanding } = require("../utils/level");
const { parseOffset } = require("../utils/paging");

// The Feed shows a member's newest notifications, this many at most, a page
// at a time. Older ones are deleted after 90 days (models/notificationModel.js).
const FEED_SIZE = 100;
const PAGE_SIZE = 10;

// Full review cards (as review lists send them) for `ids`, keyed by id string.
async function reviewCards(ids, viewer) {
    const reviews = await Review.find({ _id: { $in: ids } }).populate("user", AUTHOR_FIELDS).lean();
    const cards = await Review.withMyVote(
        await withAuthorStanding(reviews.filter((review) => review.user).map(reviewWithUser)),
        viewer
    );

    return new Map(cards.map((card) => [String(card._id), card]));
}

// Open reports for moderators and admins, one per review, newest report
// first: the review card and everyone who reported it, with when.
async function openReports(viewer) {
    const groups = await Report.aggregate([
        { $match: { status: "open" } },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: "$review",
                reporters: { $push: { user: "$reporter", at: "$createdAt" } },
                latest: { $max: "$createdAt" },
            },
        },
        { $sort: { latest: -1 } },
    ]);

    if (groups.length === 0) return [];

    const [cards, people] = await Promise.all([
        reviewCards(groups.map((group) => group._id), viewer),
        User.find({ _id: { $in: groups.flatMap((group) => group.reporters.map((r) => r.user)) } })
            .select(MEMBER_FIELDS)
            .lean(),
    ]);
    const personById = new Map(people.map((person) => [String(person._id), userSummary(person)]));

    return groups.flatMap((group) => {
        const review = cards.get(String(group._id));
        if (!review) return [];

        const reporters = group.reporters
            .filter((report) => personById.has(String(report.user)))
            .map((report) => ({ ...personById.get(String(report.user)), reportedAt: report.at }));

        return [{ _id: String(group._id), review, reporters, at: group.latest }];
    });
}

// Turns notifications into what the Feed draws: each review as a full review
// card, the members involved, a reply's text, for a new follower whether
// you follow them back, and each event as it is now. Leaves out any whose
// review, comment, event or members have since been deleted.
async function hydrate(rows, viewer) {
    const idsOf = (pick) => [...new Set(rows.flatMap(pick).filter(Boolean).map(String))];
    const followers = idsOf((row) => (row.type === "follow" ? row.actors : []));

    const [reviewById, actors, comments, followedBack, events] = await Promise.all([
        reviewCards(idsOf((row) => row.review), viewer),
        User.find({ _id: { $in: idsOf((row) => row.actors) } }).select(MEMBER_FIELDS).lean(),
        Comment.find({ _id: { $in: idsOf((row) => row.comment) } }).select("text parent").lean(),
        Follow.find({ follower: viewer._id, following: { $in: followers } }).distinct("following"),
        Event.find({ _id: { $in: idsOf((row) => row.event) } })
            .select("title startsAt location description film gifUrl official")
            .lean(),
    ]);
    const following = new Set(followedBack.map(String));

    const byId = (list) => new Map(list.map((item) => [String(item._id), item]));
    const memberById = byId(actors.map(userSummary));
    const commentById = byId(comments);
    // Events from before member screenings have no `official`; they're official.
    const eventById = byId(events.map((event) => ({ ...event, official: event.official !== false })));

    return rows.flatMap((row) => {
        const review = reviewById.get(String(row.review));
        const members = row.actors.map((id) => memberById.get(String(id))).filter(Boolean);
        const comment = row.comment ? commentById.get(String(row.comment)) : null;

        // The host may have deleted their account since; the event stays.
        if (row.type === "event") {
            const event = eventById.get(String(row.event));
            return event ? [{ _id: row._id, type: row.type, at: row.at, event, actors: members }] : [];
        }

        if (members.length === 0) return [];

        if (row.type === "pvp") {
            return [{ _id: row._id, type: row.type, at: row.at, actors: members, variant: row.variant ?? 0 }];
        }

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
// Moderators and admins also get `reports` with the first page: the open
// ones, pinned above everything else.
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
        ...(skip === 0 && hasRole(req.user, "moderator") && { reports: await openReports(req.user) }),
    });
}

module.exports = { getFeed };
