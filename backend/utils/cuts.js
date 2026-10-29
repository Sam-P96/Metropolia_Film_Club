const Cut = require("../models/cutModel");
const Comment = require("../models/commentModel");
const { userSummary } = require("./serialize");

// What a cut needs from the database to be drawn.
const CUT_FIELDS = "user text likeCount dislikeCount viralAt createdAt";

// Cuts (plain .lean() documents with CUT_FIELDS) as the page draws them:
// { _id, text, likeCount, dislikeCount, myVote, replyCount, viral }, with
// `myVote` for `viewer` (the member asking, or null).
async function cutDetails(cuts, viewer) {
    const [voted, counts] = await Promise.all([
        Cut.withMyVote(cuts, viewer),
        Comment.aggregate([
            { $match: { cut: { $in: cuts.map((cut) => cut._id) } } },
            { $group: { _id: "$cut", count: { $sum: 1 } } },
        ]),
    ]);
    const replyCounts = new Map(counts.map((row) => [String(row._id), row.count]));

    return voted.map((cut) => ({
        _id: cut._id,
        text: cut.text,
        likeCount: cut.likeCount,
        dislikeCount: cut.dislikeCount,
        myVote: cut.myVote,
        replyCount: replyCounts.get(String(cut._id)) ?? 0,
        viral: Boolean(cut.viralAt),
    }));
}

// Cuts with their author populated, each as a cut in the Feed:
// { _id, type: "cut", at, actors: [author], cut }. Leaves out any whose
// author has gone.
async function cutItems(cuts, viewer) {
    const shown = cuts.filter((cut) => cut.user);
    const details = await cutDetails(shown, viewer);

    return shown.map((cut, index) => ({
        _id: cut._id,
        type: "cut",
        at: cut.createdAt,
        actors: [userSummary(cut.user)],
        cut: details[index],
    }));
}

module.exports = { CUT_FIELDS, cutDetails, cutItems };
