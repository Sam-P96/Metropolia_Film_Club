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
//   gift            `actors[0]` gifted them `amount` P-PP ("Gift PP" in the
//                   Wallet). No review.
//   scratchWin      `actors[0]`, whom they follow, won `tier` (a key in
//                   shared/scratch/config.js) on Box Office Scratch: `amount`
//                   P-PP, or for the refund tier, the ticket price back.
//   scratchJackpot  `actors[0]` won the Box Office Scratch jackpot, `amount`
//                   P-PP. Goes to every member.
//   doublePlay      `actors[0]`, whom they follow, played Double or Nothing
//                   and didn't win (`doubleGame`: how it went).
//   doubleWin       `actors[0]` won Double or Nothing: `amount` P-PP in all,
//                   the bonus pot included (`doubleGame`: how it went).
//                   Goes to every member, the winner included.
//   slotTriple      `actors[0]` tripled the credits they put in the Slot
//                   Machine this session. Goes to every member.
//   slotJackpot     `actors[0]` hit the Slot Machine jackpot, winning
//                   `amount` PP on that spin. Goes to every member.
//   pokerWin        `actors[0]` left the Kino Poker table `amount` P-PP up
//                   (`poker`: how many hands they won, and their best at a
//                   showdown, or null). Goes to every member, the winner
//                   included.
// Farkle against `actors[0]`, about `match` (utils/notify.js). No review.
//   farkleChallenge  their challenge or counter, waiting on an answer. Pinned.
//   farkleTurn       no longer sent: games being played are listed at the
//                    top of Notifications by the page itself
//   farkleAccepted   they accepted your challenge: the game's on
//   farkleDeclined   they turned your challenge down
//   farkleExpired    your challenge to them went unanswered for three days
//   farkleOver       the game ended: `match` says who won and how
//   farkleResult     a game ended for a member you follow (`actors`: the
//                    one you follow, or both if you follow both): who won
//                    how much from whom. Against the bot too.
const FARKLE_TYPES = ["farkleChallenge", "farkleTurn", "farkleAccepted", "farkleDeclined", "farkleExpired", "farkleOver", "farkleResult"];

// Steal and Defend (utils/steal/), about `stealAttack`. No review.
//   stealAttacked  `actors[0]` has started an attack on them: there's still
//                  time to swap items
//   stealResult    an attack they were in ended (`actors`: the attacker,
//                  then the defender): success, failure or fizzle. Only the
//                  two of them hear about a failure.
//   stealCrit      `actors[0]` landed a Critical Hit on `actors[1]`,
//                  winning `amount` P-PP. Goes to every member, in gold.
//   stealFlag      for admins: the game spotted something suspicious
//                  (`stealFlag`, with the members in `actors`)
const STEAL_TYPES = ["stealAttacked", "stealResult", "stealCrit", "stealFlag"];

// The game ones: unread, they make the bell blink red rather than just
// glow purple (controllers/feedController.js). farkleTurn isn't shown any
// more, so it never counts as unread at all.
const GAME_TYPES = [
    ...FARKLE_TYPES.filter((type) => type !== "farkleTurn"),
    "scratchWin", "scratchJackpot", "doublePlay", "doubleWin", "slotTriple", "slotJackpot", "pokerWin",
    "stealAttacked", "stealResult", "stealCrit",
];

const notificationSchema = new Schema({
    recipient: {type: Schema.Types.ObjectId, ref: "User", required: true},
    type: {
        type: String,
        enum: ["like", "dislike", "review", "trending", "reply", "follow", "event", "pvp", "cut", "cutReply", "payout", "gift", "scratchWin", "scratchJackpot", "doublePlay", "doubleWin", "slotTriple", "slotJackpot", "pokerWin", ...FARKLE_TYPES, ...STEAL_TYPES],
        required: true,
    },
    review: {
        type: Schema.Types.ObjectId,
        ref: "Review",
        default: null,
        required() {
            return !["follow", "event", "pvp", "cut", "cutReply", "payout", "gift", "scratchWin", "scratchJackpot", "doublePlay", "doubleWin", "slotTriple", "slotJackpot", "pokerWin", ...FARKLE_TYPES, ...STEAL_TYPES].includes(this.type);
        },
    },
    match: {type: Schema.Types.ObjectId, ref: "FarkleMatch", default: null},
    // Double or Nothing: the game it's about.
    doubleGame: {type: Schema.Types.ObjectId, ref: "DoubleGame", default: null},
    // Steal and Defend: the attack it's about, or the admin flag.
    stealAttack: {type: Schema.Types.ObjectId, ref: "StealAttack", default: null},
    stealFlag: {type: Schema.Types.ObjectId, ref: "StealFlag", default: null},
    amount: {type: Number, default: null},
    // Kino Poker: a win's hands won and best hand.
    poker: {
        hands: {type: Number},
        best: {type: String},
    },
    // Box Office Scratch: the tier won, by its key in shared/scratch/config.js.
    tier: {type: String, default: null},
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
notificationSchema.index({doubleGame: 1});
notificationSchema.index({stealAttack: 1});
// The Notifications page: pinned first, then newest first.
notificationSchema.index({recipient: 1, pinned: -1, at: -1});

const Notification = mongoose.model("Notification", notificationSchema);
Notification.FARKLE_TYPES = FARKLE_TYPES;
Notification.GAME_TYPES = GAME_TYPES;
Notification.STEAL_TYPES = STEAL_TYPES;

module.exports = Notification;
