const mongoose = require("mongoose");
const {votable} = require("./votable");

const Schema = mongoose.Schema;

// A member's cut: a short post, written at the top of their Notifications
// page, that goes to their followers' Notifications (see utils/notify.js).
// Members reply to it with comments (a Comment with `cut` set). Deleted
// along with their account.
const cutSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", required: true},
        text: {type: String, required: true, trim: true, maxlength: 280},
        // When it first reached the viral line (utils/notify.js) and went out
        // in every member's Feed. It only goes out once, and stays viral.
        viralAt: {type: Date, default: null},
    },
    {timestamps: true}
);

// likeCount, dislikeCount, and who voted. See votable.js. Unlike votes on
// reviews, they don't count towards levels (utils/level.js).
cutSchema.plugin(votable);

cutSchema.index({user: 1});
cutSchema.index({createdAt: -1});

module.exports = mongoose.model("Cut", cutSchema);
