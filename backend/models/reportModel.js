const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One member reporting one review to the moderators and admins. Open reports
// on a review show together at the top of every moderator's and admin's
// Notifications until one of them marks them addressed or dismissed.
const reportSchema = new Schema(
    {
        review: {type: Schema.Types.ObjectId, ref: "Review", required: true},
        reporter: {type: Schema.Types.ObjectId, ref: "User", required: true},
        status: {
            type: String,
            enum: ["open", "addressed", "dismissed"],
            default: "open",
        },
        resolvedBy: {type: Schema.Types.ObjectId, ref: "User", default: null},
        resolvedAt: {type: Date, default: null},
    },
    {timestamps: {createdAt: true, updatedAt: false}}
);

// A member can't report the same review twice while it's open.
reportSchema.index({review: 1, reporter: 1}, {unique: true, partialFilterExpression: {status: "open"}});
reportSchema.index({status: 1, createdAt: -1});
// How many they've filed today.
reportSchema.index({reporter: 1, createdAt: -1});

module.exports = mongoose.model("Report", reportSchema);
