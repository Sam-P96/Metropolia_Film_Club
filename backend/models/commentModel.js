const mongoose = require("mongoose");
const {votable} = require("./votable");

const Schema = mongoose.Schema;

// A member's comment under a review, or a reply to another comment there
// (`parent`). Deleted along with the review. A reply under a cut is one too,
// with `cut` in place of `review`, and goes with the cut.
const commentSchema = new Schema(
    {
        review: {
            type: Schema.Types.ObjectId,
            ref: "Review",
            default: null,
            required() {
                return !this.cut;
            },
        },
        cut: {type: Schema.Types.ObjectId, ref: "Cut", default: null},
        user: {type: Schema.Types.ObjectId, ref: "User", required: true},
        text: {type: String, required: true, trim: true, maxlength: 1000},
        // The comment this replies to, or null for one straight under the
        // review. Deleting a comment leaves its replies.
        parent: {type: Schema.Types.ObjectId, ref: "Comment", default: null},
    },
    {timestamps: true}
);

// likeCount, dislikeCount, and who voted. See votable.js.
commentSchema.plugin(votable);

commentSchema.index({review: 1, createdAt: 1});
commentSchema.index({cut: 1, createdAt: 1});

module.exports = mongoose.model("Comment", commentSchema);
