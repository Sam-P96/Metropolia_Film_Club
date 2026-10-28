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
const notificationSchema = new Schema({
    recipient: {type: Schema.Types.ObjectId, ref: "User", required: true},
    type: {
        type: String,
        enum: ["like", "dislike", "review", "trending", "reply", "follow"],
        required: true,
    },
    review: {
        type: Schema.Types.ObjectId,
        ref: "Review",
        default: null,
        required() {
            return this.type !== "follow";
        },
    },
    comment: {type: Schema.Types.ObjectId, ref: "Comment", default: null},
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

module.exports = mongoose.model("Notification", notificationSchema);
