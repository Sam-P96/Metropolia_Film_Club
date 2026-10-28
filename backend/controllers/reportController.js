const mongoose = require("mongoose");
const Review = require("../models/reviewModel");
const Report = require("../models/reportModel");
const { banRefusal } = require("../utils/bans");

// How many reviews a member may report in any 24 hours.
const REPORTS_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUSES = ["addressed", "dismissed"];

// A member reporting someone else's review to the moderators and admins:
// once per review while it's open, and at most REPORTS_PER_DAY a day.
async function reportReview(req, res) {
    const refusal = banRefusal(req.user, "reports");

    if (refusal) {
        return res.status(403).json({ error: refusal });
    }

    const review = mongoose.isValidObjectId(req.params.id)
        ? await Review.findById(req.params.id).select("user").lean()
        : null;

    if (!review) {
        return res.status(404).json({ error: "Review not found." });
    }

    if (String(review.user) === String(req.user._id)) {
        return res.status(400).json({ error: "You can't report your own review." });
    }

    const already = { error: "You've already reported this review. A moderator will take a look." };

    if (await Report.exists({ review: review._id, reporter: req.user._id, status: "open" })) {
        return res.status(409).json(already);
    }

    const today = await Report.countDocuments({
        reporter: req.user._id,
        createdAt: { $gte: new Date(Date.now() - DAY_MS) },
    });

    if (today >= REPORTS_PER_DAY) {
        return res.status(429).json({
            error: `You can report ${REPORTS_PER_DAY} reviews a day. Try again tomorrow.`,
        });
    }

    try {
        await Report.create({ review: review._id, reporter: req.user._id });
    } catch (error) {
        // Two clicks at once: the other one already reported it.
        if (error.code === 11000) return res.status(409).json(already);
        throw error;
    }

    res.status(201).json({ reported: true });
}

// Moderators and admins closing every open report on a review, as
// "addressed" or "dismissed". It leaves everyone's Notifications at once.
async function resolveReports(req, res) {
    const { status } = req.body ?? {};

    if (!STATUSES.includes(status)) {
        return res.status(400).json({ error: "Mark it addressed or dismissed." });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ error: "Review not found." });
    }

    await Report.updateMany(
        { review: req.params.id, status: "open" },
        { $set: { status, resolvedBy: req.user._id, resolvedAt: new Date() } }
    );

    res.json({ status });
}

module.exports = { REPORTS_PER_DAY, reportReview, resolveReports };
