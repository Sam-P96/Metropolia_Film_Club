const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const LISTS = {
    like: {by: "likedBy", count: "likeCount"},
    dislike: {by: "dislikedBy", count: "dislikeCount"},
};

// Whether `user`'s vote of this kind counts towards the total. Likes always
// do; dislikes only while the voter has PVP on (see utils/pvp.js), so
// dislikeCount leaves out dislikes from members who've turned it off.
function counts(kind, user) {
    return kind === "like" || Boolean(user.pvp);
}

// Likes and dislikes, for reviews and comments. A member can like or dislike
// something, not both. Who voted is kept so nobody votes twice, but left out
// of every query unless asked for: lists only need the counts, and who voted
// isn't anyone else's business.
function votable(schema) {
    schema.add({
        likeCount: {type: Number, default: 0},
        dislikeCount: {type: Number, default: 0},
        likedBy: {type: [{type: Schema.Types.ObjectId, ref: "User"}], default: [], select: false},
        dislikedBy: {type: [{type: Schema.Types.ObjectId, ref: "User"}], default: [], select: false},
    });

    // Adds myVote ("like", "dislike" or null) to each of a list of plain
    // (.lean()) documents, for `user`: the member asking, or null. Also fills
    // in counts that documents from before dislikes don't have.
    schema.statics.withMyVote = async function (docs, user) {
        const ids = docs.map((doc) => doc._id);
        const votedOn = (by) =>
            user && ids.length > 0
                ? this.find({_id: {$in: ids}, [by]: user._id}).select("_id").lean()
                : [];

        const [liked, disliked] = await Promise.all([votedOn("likedBy"), votedOn("dislikedBy")]);
        const likedIds = new Set(liked.map((doc) => String(doc._id)));
        const dislikedIds = new Set(disliked.map((doc) => String(doc._id)));

        return docs.map((doc) => {
            const id = String(doc._id);
            let myVote = null;
            if (likedIds.has(id)) myVote = "like";
            if (dislikedIds.has(id)) myVote = "dislike";

            return {...doc, likeCount: doc.likeCount ?? 0, dislikeCount: doc.dislikeCount ?? 0, myVote};
        });
    };

    // Sets `user`'s vote on one document to "like", "dislike" or null. Each
    // step only matches when it changes something, so a double click can't
    // count anyone twice or push a count below zero. Doesn't touch updatedAt,
    // which means "last edited". Resolves to { likeCount, dislikeCount,
    // myVote }, or null if there's no such document.
    schema.statics.castVote = async function (id, user, vote) {
        const me = user._id;

        for (const [kind, {by, count}] of Object.entries(LISTS)) {
            const inc = (step) => (counts(kind, user) ? {$inc: {[count]: step}} : {});

            if (kind === vote) {
                await this.updateOne(
                    {_id: id, [by]: {$ne: me}},
                    {$push: {[by]: me}, ...inc(1)},
                    {timestamps: false}
                );
            } else {
                await this.updateOne(
                    {_id: id, [by]: me},
                    {$pull: {[by]: me}, ...inc(-1)},
                    {timestamps: false}
                );
            }
        }

        const doc = await this.findById(id).select("likeCount dislikeCount").lean();
        if (!doc) return null;

        return {likeCount: doc.likeCount ?? 0, dislikeCount: doc.dislikeCount ?? 0, myVote: vote};
    };

    // Takes back every vote `user` has made, so the counts stay right when
    // their account is deleted.
    schema.statics.removeVotesBy = async function (user) {
        for (const [kind, {by, count}] of Object.entries(LISTS)) {
            await this.updateMany(
                {[by]: user._id},
                {$pull: {[by]: user._id}, ...(counts(kind, user) ? {$inc: {[count]: -1}} : {})},
                {timestamps: false}
            );
        }
    };

    // Sets dislikeCount on everything matching `filter` to how many of its
    // dislikes come from `countedVoterIds`: the members with PVP on.
    schema.statics.recountDislikes = function (filter, countedVoterIds) {
        return this.updateMany(
            filter,
            [{
                $set: {
                    dislikeCount: {
                        $size: {$setIntersection: [{$ifNull: ["$dislikedBy", []]}, {$literal: countedVoterIds}]},
                    },
                },
            }],
            {timestamps: false, updatePipeline: true}
        );
    };
}

// "like", "dislike" or null from a request body, or undefined if it's none
// of those.
function parseVote(value) {
    if (value === null || value === undefined) return null;
    return typeof value === "string" && Object.hasOwn(LISTS, value) ? value : undefined;
}

module.exports = {votable, parseVote};
