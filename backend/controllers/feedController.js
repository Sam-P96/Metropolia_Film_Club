const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const Comment = require("../models/commentModel");
const Notification = require("../models/notificationModel");
const Follow = require("../models/followModel");
const Event = require("../models/eventModel");
const Cut = require("../models/cutModel");
const Report = require("../models/reportModel");
const FarkleMatch = require("../models/farkleMatchModel");
const DoubleGame = require("../models/doubleGameModel");
const StealAttack = require("../models/stealAttackModel");
const StealFlag = require("../models/stealFlagModel");
const { hasRole } = require("../middleware/auth");
const { catchUp, matchViews } = require("../utils/farkle");
const { AUTHOR_FIELDS, MEMBER_FIELDS, userSummary, reviewWithUser } = require("../utils/serialize");
const { withAuthorStanding } = require("../utils/level");
const { CUT_FIELDS, cutDetails } = require("../utils/cuts");
const { parseOffset } = require("../utils/paging");
const { getTable: getPokerTable } = require("../games/poker/live");

// The Feed shows a member's newest notifications, this many at most, a page
// at a time. Older ones are deleted after 90 days (models/notificationModel.js).
const FEED_SIZE = 100;
const PAGE_SIZE = 10;

// The filters at the top of Notifications, and the notifications each one
// shows. "all" (or anything not listed here) shows everything.
//   events   club events and member screenings
//   reviews  votes on their reviews, replies, new reviews from members they
//            follow, trending reviews, and members turning PvP on (which
//            decides who can dislike reviews)
//   cuts     cuts (theirs, the members they follow, and viral ones) and
//            replies to their cuts
//   games    Farkle, Box Office Scratch, Double or Nothing, the Slot
//            Machine and Kino Poker, and the daily PP payout and gifts
//            (points are only for games)
// New followers are only in "all".
const FEED_FILTERS = {
    events: [],
    reviews: ["like", "dislike", "review", "trending", "reply", "pvp"],
    cuts: ["cut", "cutReply"],
    games: ["payout", "gift", "scratchWin", "scratchJackpot", "doublePlay", "doubleWin", "slotTriple", "slotJackpot", "pokerWin", ...Notification.FARKLE_TYPES, ...Notification.STEAL_TYPES],
};
// What every filter shows whatever else it leaves out: club events, and big
// news (a trending review, a jackpot, a Double or Nothing win, someone
// tripling their Slot Machine credits, a Steal and Defend Critical Hit, and
// a viral cut, found by its cut in feedQuery).
const ALWAYS = ["event", "trending", "scratchJackpot", "doubleWin", "slotTriple", "slotJackpot", "stealCrit"];

// The jackpots, which wait just under the games until they've been seen.
const JACKPOT_TYPES = ["scratchJackpot", "slotJackpot"];

// The filter asked for (?filter=), if it's a real one; "all" otherwise.
const filterOf = (asked) => (Object.hasOwn(FEED_FILTERS, asked) ? asked : "all");

// Which of `viewer`'s notifications `filter` shows, as a MongoDB query.
async function feedQuery(viewer, filter) {
    const mine = { recipient: viewer._id };
    if (filter === "all") return mine;

    // A viral cut is an ordinary cut notification about a cut that went viral.
    const viralCuts = await Cut.distinct("_id", { viralAt: { $ne: null } });
    return {
        ...mine,
        $or: [{ type: { $in: [...new Set([...FEED_FILTERS[filter], ...ALWAYS])] } }, { type: "cut", cut: { $in: viralCuts } }],
    };
}

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
// card, the members involved, a reply's text, each cut with its votes and
// how many replies it has, for a new follower whether you follow them back,
// each event as it is now, and each Farkle game as it is now. Leaves out any
// whose review, comment, cut, event, game or members have since been
// deleted (a Farkle opponent who left the club is fine: the game stays).
async function hydrate(rows, viewer) {
    const idsOf = (pick) => [...new Set(rows.flatMap(pick).filter(Boolean).map(String))];
    const followers = idsOf((row) => (row.type === "follow" ? row.actors : []));

    const matches = await FarkleMatch.find({ _id: { $in: idsOf((row) => row.match) } }).lean();
    const doubleGames = await DoubleGame.find({ _id: { $in: idsOf((row) => row.doubleGame) } }).lean();
    const doubleById = new Map(doubleGames.map((game) => [String(game._id), game]));
    const stealAttacks = await StealAttack.find({ _id: { $in: idsOf((row) => row.stealAttack) } })
        .select("attacker victim status outcome crit stone percent attempted amounts resolvedAt")
        .lean();
    const stealById = new Map(stealAttacks.map((attack) => [String(attack._id), attack]));
    const stealFlags = await StealFlag.find({ _id: { $in: idsOf((row) => row.stealFlag) } }).lean();
    const flagById = new Map(stealFlags.map((flag) => [String(flag._id), flag]));
    const matchById = new Map((await matchViews(matches, viewer._id)).map((match) => [String(match._id), match]));

    const [reviewById, actors, comments, followedBack, events, cuts] = await Promise.all([
        reviewCards(idsOf((row) => row.review), viewer),
        User.find({ _id: { $in: idsOf((row) => row.actors) } }).select(MEMBER_FIELDS).lean(),
        Comment.find({ _id: { $in: idsOf((row) => row.comment) } }).select("text parent").lean(),
        Follow.find({ follower: viewer._id, following: { $in: followers } }).distinct("following"),
        Event.find({ _id: { $in: idsOf((row) => row.event) } })
            .select("title startsAt location description film gifUrl official")
            .lean(),
        Cut.find({ _id: { $in: idsOf((row) => row.cut) } }).select(CUT_FIELDS).lean(),
    ]);
    const following = new Set(followedBack.map(String));

    const byId = (list) => new Map(list.map((item) => [String(item._id), item]));
    const memberById = byId(actors.map(userSummary));
    const commentById = byId(comments);
    const cutById = byId(await cutDetails(cuts, viewer));
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

        if (row.type === "payout") {
            return [{ _id: row._id, type: row.type, at: row.at, amount: row.amount }];
        }

        // Old "your turn" notices: the games list at the top does that now.
        if (row.type === "farkleTurn") return [];

        if (row.type.startsWith("farkle")) {
            const match = matchById.get(String(row.match));
            // A result about someone you follow is no use once they're gone.
            if (!match || (row.type === "farkleResult" && members.length === 0)) return [];
            return [{ _id: row._id, type: row.type, at: row.at, pinned: Boolean(row.pinned), actors: members, match }];
        }

        if (members.length === 0) return [];

        // Steal and Defend: the attack as it is now, from the reader's side.
        if (row.type === "stealAttacked" || row.type === "stealResult" || row.type === "stealCrit") {
            const attack = stealById.get(String(row.stealAttack));
            if (!attack) return [];
            const role = String(attack.attacker) === String(viewer._id) ? "attacker" : String(attack.victim) === String(viewer._id) ? "defender" : null;
            return [{
                _id: row._id,
                type: row.type,
                at: row.at,
                actors: members,
                amount: row.amount,
                attack: {
                    _id: attack._id,
                    role,
                    playing: attack.status !== "done",
                    outcome: attack.outcome,
                    crit: attack.crit,
                    stone: attack.stone,
                    percent: attack.percent,
                    attempted: attack.attempted,
                    // Only the two players see a failure's sums.
                    amounts: role || attack.outcome === "success" ? attack.amounts : null,
                },
            }];
        }

        if (row.type === "stealFlag") {
            const flag = flagById.get(String(row.stealFlag));
            if (!flag) return [];
            return [{
                _id: row._id,
                type: row.type,
                at: row.at,
                actors: members,
                flag: { _id: flag._id, kind: flag.kind, details: flag.details, count: flag.count, status: flag.status },
            }];
        }

        if (row.type === "gift") {
            return [{ _id: row._id, type: row.type, at: row.at, actors: members, amount: row.amount }];
        }

        if (row.type === "pokerWin") {
            return [{ _id: row._id, type: row.type, at: row.at, actors: members, amount: row.amount, poker: { hands: row.poker?.hands ?? 0, best: row.poker?.best ?? null } }];
        }

        if (row.type === "slotTriple" || row.type === "slotJackpot") {
            return [{ _id: row._id, type: row.type, at: row.at, actors: members, amount: row.amount }];
        }

        if (row.type === "scratchWin" || row.type === "scratchJackpot") {
            return [{ _id: row._id, type: row.type, at: row.at, actors: members, amount: row.amount, tier: row.tier, ticketType: row.ticketType ?? null }];
        }

        // Double or Nothing: how the game went, as it ended.
        if (row.type === "doublePlay" || row.type === "doubleWin") {
            const game = doubleById.get(String(row.doubleGame));
            if (!game) return [];
            return [{
                _id: row._id,
                type: row.type,
                at: row.at,
                actors: members,
                amount: row.amount,
                game: {
                    bet: game.bet,
                    results: game.rounds.map((round) => round.result),
                    auto: game.rounds.some((round) => round.auto),
                    outcome: game.outcome,
                    payout: game.payout,
                    bonusWon: game.bonusWon,
                    newBet: game.newBet,
                },
            }];
        }

        if (row.type === "cut") {
            const cut = cutById.get(String(row.cut));
            return cut ? [{ _id: row._id, type: row.type, at: row.at, actors: members, cut }] : [];
        }

        if (row.type === "cutReply") {
            const cut = cutById.get(String(row.cut));
            if (!cut || !comment) return [];

            return [{
                _id: row._id,
                type: row.type,
                at: row.at,
                actors: members,
                cut: { _id: cut._id, text: cut.text },
                reply: { _id: comment._id, text: comment.text, toComment: Boolean(comment.parent) },
            }];
        }

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

// The Farkle games between members they're playing right now, for the very
// top of the page: their turn first, then the rest, latest move first.
// Worked out fresh each time rather than stored as notifications, so it's
// always as the game is now. A game whose three days ran out is ended first
// (utils/farkle.js catchUp), so it doesn't show as still going.
async function ongoingGames(viewer) {
    const found = await FarkleMatch.find({ mode: "pvp", status: "active", "players.user": viewer._id }).lean();
    const going = [];
    for (const match of found) {
        const now = await catchUp(match);
        if (now.status === "active") going.push(now);
    }

    const yourTurnFirst = (a, b) => Number(b.current === b.mySeat) - Number(a.current === a.mySeat)
        || new Date(b.lastMoveAt) - new Date(a.lastMoveAt);
    return (await matchViews(going, viewer._id)).sort(yourTurnFirst);
}

// Unread jackpot notices, newest first, for just under the games: a
// jackpot is big news, so until it's been seen it doesn't wait in line.
async function unreadJackpots(viewer, since) {
    const rows = await Notification.find({ recipient: viewer._id, type: { $in: JACKPOT_TYPES }, at: { $gt: since } })
        .sort({ at: -1, _id: -1 })
        .limit(FEED_SIZE)
        .lean();
    return hydrate(rows, viewer);
}

// Promoted events they haven't seen yet (the Promote button, or a member
// screening made official: utils/notify.js), newest first, for the very top
// of the page. Events show with every filter, so these do too.
async function unseenPromotions(viewer, since) {
    const rows = await Notification.find({ recipient: viewer._id, type: "event", promoted: true, at: { $gt: since } })
        .sort({ at: -1, _id: -1 })
        .limit(FEED_SIZE)
        .lean();
    return hydrate(rows, viewer);
}

// When they last opened Notifications, as a date to compare with: anything
// newer is unread. Never opened counts as "the start of time".
const seenSince = (viewer) => viewer.notificationsSeenAt ?? new Date(0);

// ?skip=n&filter=all|events|reviews|cuts|games. { items, hasMore, next,
// background, filter }: `next` is the skip for the next page, `background`
// the member's Notifications background setting, and `filter` the one used
// (FEED_FILTERS above). The first page also brings:
//   promoted  promoted events they haven't seen yet, for the very top
//             (they're in `items` too, in date order: the page leaves
//             those out)
//   games     the Farkle games they're playing, near the very top (with
//             "all" and "games")
//   poker     the Kino Poker table while members are playing at it, beside
//             the games: who's there, and whether the reader is (table.js
//             liveFor), or null
//   jackpots  jackpot notices they haven't seen yet, just under the games
//             (they're in `items` too, in date order: the page leaves
//             those out)
//   seenAt    when they last opened the page (null if never), and `now`,
//             for marking everything up to it seen (markSeen below)
// Moderators and admins also get `reports`, with "all" and "reviews": the
// open ones, above everything. In `items`, pinned notifications come first
// (Farkle challenges waiting on them), then the rest newest first.
async function getFeed(req, res) {
    const now = new Date();
    const skip = Math.min(parseOffset(req.query.skip), FEED_SIZE);
    const limit = Math.min(PAGE_SIZE, FEED_SIZE - skip);
    const filter = filterOf(req.query.filter);
    const mine = await feedQuery(req.user, filter);

    const [rows, total] = await Promise.all([
        limit > 0
            ? Notification.find(mine).sort({ pinned: -1, at: -1, _id: -1 }).skip(skip).limit(limit).lean()
            : [],
        Notification.countDocuments(mine),
    ]);

    res.json({
        items: await hydrate(rows, req.user),
        hasMore: skip + rows.length < Math.min(total, FEED_SIZE),
        next: skip + rows.length,
        background: req.user.feedBackground ?? "default",
        filter,
        // Only with the first page, so loading more never wipes them.
        ...(skip === 0 && {
            promoted: await unseenPromotions(req.user, seenSince(req.user)),
            games: filter === "all" || filter === "games" ? await ongoingGames(req.user) : [],
            poker: filter === "all" || filter === "games" ? (getPokerTable()?.liveFor(req.user._id) ?? null) : null,
            jackpots: await unreadJackpots(req.user, seenSince(req.user)),
            seenAt: req.user.notificationsSeenAt ?? null,
            now,
        }),
        ...(skip === 0 && hasRole(req.user, "moderator") && {
            reports: filter === "all" || filter === "reviews" ? await openReports(req.user) : [],
        }),
    });
}

// What lights up the bell in the nav: { unread, games }. `unread`: anything
// new since they last opened Notifications (the bell glows purple).
// `games`: some of it is about games (it blinks red instead): a game
// notification, or a Farkle game that's come round to their turn. For
// moderators and admins, new reports count too. The nav asks every minute
// or so, so each check is a quick "is there
// at least one?" rather than loading anything.
async function getUnread(req, res) {
    const viewer = req.user;
    const since = seenSince(viewer);
    const newer = { recipient: viewer._id, at: { $gt: since } };

    const [gameNotice, yourTurn] = await Promise.all([
        Notification.exists({ ...newer, type: { $in: Notification.GAME_TYPES } }),
        FarkleMatch.exists({
            mode: "pvp",
            status: "active",
            "players.user": viewer._id,
            lastMoveAt: { $gt: since },
            $expr: { $eq: [{ $arrayElemAt: ["$players.user", "$current"] }, viewer._id] },
        }),
    ]);
    const games = Boolean(gameNotice || yourTurn);

    let unread = games || Boolean(await Notification.exists({ ...newer, type: { $ne: "farkleTurn" } }));
    if (!unread && hasRole(viewer, "moderator")) {
        unread = Boolean(await Report.exists({ status: "open", createdAt: { $gt: since } }));
    }

    res.json({ unread, games });
}

// { until }: they've opened Notifications, so everything up to `until` (the
// `now` their page came with) is seen. Never later than right now, and
// never earlier than it already was, so an old page can't make things
// unread again.
async function markSeen(req, res) {
    const now = new Date();
    const until = new Date(req.body?.until ?? now);
    const seenAt = Number.isNaN(until.getTime()) || until > now ? now : until;

    await User.updateOne(
        { _id: req.user._id, $or: [{ notificationsSeenAt: null }, { notificationsSeenAt: { $lt: seenAt } }] },
        { $set: { notificationsSeenAt: seenAt } }
    );
    res.json({ ok: true });
}

module.exports = { getFeed, getUnread, markSeen };
