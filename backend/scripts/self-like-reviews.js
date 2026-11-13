// One-off: every review gets its author's own like, as new reviews have
// since posting started liking them (controllers/filmController.js
// saveReview). Reviews written before that only have one if the author
// liked it themselves, which counted for Top Critics, levels and First
// Place; this gives everyone theirs.
//
// From backend/, with MONGO_URI in .env:
//   npm run reviews:self-like            only counts what it would change
//   npm run reviews:self-like -- --apply  likes them
//
// It likes the way the thumbs up does (Review.castVote): an author who had
// disliked their own review gets the dislike taken back, and nobody gets a
// notification, and reviews don't look freshly edited. Safe to run again:
// a review its author already likes is left alone.
require("dotenv").config();
const mongoose = require("mongoose");
const Review = require("../models/reviewModel");
const User = require("../models/userModel");

const APPLY = process.argv.includes("--apply");

async function selfLike() {
    // Reviews whose author isn't among the members who liked them.
    const reviews = await Review.find({ $expr: { $not: { $in: ["$user", { $ifNull: ["$likedBy", []] }] } } })
        .select("_id user")
        .lean();
    const authors = await User.find({ _id: { $in: [...new Set(reviews.map((review) => String(review.user)))] } })
        .select("_id username pvp")
        .lean();
    const authorById = new Map(authors.map((author) => [String(author._id), author]));
    const total = await Review.countDocuments();

    console.log(`${reviews.length} of ${total} review(s) don't have their author's like yet, by ${authors.length} member(s).`);

    if (!APPLY) {
        console.log("Nothing changed. Run it with --apply to like them.");
        return;
    }

    let liked = 0;
    let skipped = 0;
    for (const review of reviews) {
        const author = authorById.get(String(review.user));
        if (!author) {
            skipped += 1;
            continue;
        }
        await Review.castVote(review._id, author, "like");
        liked += 1;
    }

    const left = await Review.countDocuments({ $expr: { $not: { $in: ["$user", { $ifNull: ["$likedBy", []] }] } } });
    console.log(`Done: ${liked} review(s) liked by their author${skipped ? `, ${skipped} skipped (author gone)` : ""}. ${left} left without.`);
}

mongoose
    .connect(process.env.MONGO_URI)
    .then(selfLike)
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
