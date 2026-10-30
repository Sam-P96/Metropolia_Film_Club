const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// MongoDB deletes a notification this long after its last activity. The
// reviews and comments it points at stay.
const KEEP_FOR_DAYS = 90;

// One entry in a member's Feed.
//   like / dislike  votes on their review: one per review and kind, with
//                   everyone who voted in `actors`, newest first.
//   review          someone they follow (`actors[0]`) posted `review`.
//   trending        `review`, by someone they don't follow, passed the
//                   trending line (see utils/notify.js).
//   reply           `actors[0]` wrote `comment`, straight under their review
//                   or under one of their comments.
//   follow          `actors[0]` started following them. No review; it goes
//                   again if they unfollow.
//   pvp             `actors[0]` turned PvP on. `variant` picks the line it's
//                   announced with (frontend/src/components/feed/FeedItem.jsx).
//                   It goes again if they turn PvP off. No review.
//   event           `event` was posted: a club event (to every member, its
//                   poster included) or a
//                   member screening by `actors[0]`: to its host, their
//                   followers, and moderators and admins. The event page's
//                   Promote button sends it again, in place of the old one.
//                   No review.
//   cut             `actors[0]` posted `cut`: to them and their followers,
//                   and once it goes viral, to every member in place of
//                   the one they had. No review.
//   cutReply        `actors[0]` wrote `comment`, straight under their `cut`
//                   or under one of their replies there. No review.
//   payout          the 12:00 payout gave them `amount` PP. Each day's
//                   replaces the one before. No review, no actors.
// Farkle against `actors[0]`, about `match` (utils/notify.js). No review.
//   farkleChallenge  their challenge or counter, waiting on an answer. Pinned.
//   farkleTurn       it's your turn in the game. Pinned.
//   farkleAccepted   they accepted your challenge: the game's on
//   farkleDeclined   they turned your challenge down
//   farkleExpired    your challenge to them went unanswered for three days
//   farkleOver       the game ended: `match` says who won and how
const FARKLE_TYPES = ["farkleChallenge", "farkleTurn", "farkleAccepted", "farkleDeclined", "farkleExpired", "farkleOver"];

const notificationSchema = new Schema({
    recipient: {type: Schema.Types.ObjectId, ref: "User", required: true},
    type: {
        type: String,
        enum: ["like", "dislike", "review", "trending", "reply", "follow", "event", "pvp", "cut", "cutReply", "payout", ...FARKLE_TYPES],
        required: true,
    },
    review: {
        type: Schema.Types.ObjectId,
        ref: "Review",
        default: null,
        required() {
            return !["follow", "event", "pvp", "cut", "cutReply", "payout", ...FARKLE_TYPES].includes(this.type);
        },
    },
    match: {type: Schema.Types.ObjectId, ref: "FarkleMatch", default: null},
    amount: {type: Number, default: null},
    // Pinned ones sit at the top of the Notifications page until the member
    // acts on them. Only ever true or missing (never false), so that sorting
    // by it leaves every other notification in date order.
    pinned: {type: Boolean},
    event: {type: Schema.Types.ObjectId, ref: "Event", default: null},
    variant: {type: Number, default: null},
    comment: {type: Schema.Types.ObjectId, ref: "Comment", default: null},
    cut: {type: Schema.Types.ObjectId, ref: "Cut", default: null},
    actors: {type: [{type: Schema.Types.ObjectId, ref: "User"}], default: []},
    // The last activity: when it was made, or when someone last voted.
    at: {type: Date, default: Date.now},
});

notificationSchema.index({recipient: 1, at: -1});
notificationSchema.index({at: 1}, {expireAfterSeconds: KEEP_FOR_DAYS * 24 * 60 * 60});
// Finding a vote group, and clearing up after a deleted review or comment.
notificationSchema.index({recipient: 1, type: 1, review: 1});
notificationSchema.index({review: 1});
notificationSchema.index({comment: 1});
notificationSchema.index({event: 1});
notificationSchema.index({cut: 1});
notificationSchema.index({match: 1});
// The Notifications page: pinned first, then newest first.
notificationSchema.index({recipient: 1, pinned: -1, at: -1});

const Notification = mongoose.model("Notification", notificationSchema);
Notification.FARKLE_TYPES = FARKLE_TYPES;

module.exports = Notification;
