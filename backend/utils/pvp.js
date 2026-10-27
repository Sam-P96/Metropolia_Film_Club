const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const Comment = require("../models/commentModel");

// Disliking is only between members who've both turned PVP on. Returns why
// `voter` can't dislike something `authorId` wrote ("review" or "comment"),
// or null if they can. Likes are always fine.
async function dislikeRefusal(voter, authorId, subject) {
    if (!voter.pvp) {
        return `To dislike a ${subject}, you need to turn on PVP in "Edit profile" on your profile page.`;
    }

    const author = await User.findById(authorId).select("pvp").lean();

    if (!author?.pvp) {
        return `This member has PVP turned off, so their ${subject}s can't be disliked.`;
    }

    return null;
}

// A dislike only counts while the member who gave it has PVP on, and
// dislikeCount on reviews and comments stores just those: everything else
// (cards, levels, the Critics Leaderboard, Controversial) reads it from
// there. Recounts it on everything matching `filter`, such as what one
// member disliked after they turn PVP on or off. Their dislikes are kept, so
// turning PVP back on counts them again.
async function recountDislikes(filter = {}) {
    const counted = await User.find({ pvp: true }).distinct("_id");

    await Promise.all([
        Review.recountDislikes(filter, counted),
        Comment.recountDislikes(filter, counted),
    ]);
}

module.exports = { dislikeRefusal, recountDislikes };
