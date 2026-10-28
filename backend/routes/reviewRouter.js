const express = require("express");
const {
    getReviews,
    getReview,
    getCritics,
    setReviewVote,
    setReviewSpoilers,
    setReviewAllowComments,
    deleteReview,
} = require("../controllers/filmController");
const { getComments, addComment } = require("../controllers/commentController");
const { reportReview, resolveReports } = require("../controllers/reportController");
const { requireAuth, optionalAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Anyone can read reviews. A logged-in member also learns how they voted.
// ?sort=top lists the most liked first, ?sort=controversial the most disliked.
router.get("/", optionalAuth, getReviews);

// Before "/:id", or Express would read "critics" as an id.
router.get("/critics", getCritics);

router.get("/:id", optionalAuth, getReview);

router.put("/:id/vote", requireAuth, setReviewVote);

router.get("/:id/comments", optionalAuth, getComments);
router.post("/:id/comments", requireAuth, addComment);

// The review's author; the controller checks.
router.put("/:id/allow-comments", requireAuth, setReviewAllowComments);

// Moderators and admins. The frontend hides the button from everyone else,
// but this is the check that counts.
router.put("/:id/spoilers", requireAuth, requireRole("moderator"), setReviewSpoilers);

// Any logged-in member, on someone else's review: up to 5 a day.
router.post("/:id/report", requireAuth, reportReview);

// Moderators and admins: "addressed" or "dismissed" closes every open report
// on the review.
router.put("/:id/reports", requireAuth, requireRole("moderator"), resolveReports);

// Admins only. Authors delete their own by clearing the text when editing.
router.delete("/:id", requireAuth, requireRole("admin"), deleteReview);

module.exports = router;
