const express = require("express");
const {
    getRecentReviews,
    getReview,
    setReviewLiked,
    setReviewSpoilers,
} = require("../controllers/filmController");
const { requireAuth, optionalAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", getRecentReviews);
// Anyone can read a review. A logged-in member also learns if they've liked it.
router.get("/:id", optionalAuth, getReview);

router.put("/:id/like", requireAuth, setReviewLiked);

// Moderators and admins. The frontend hides the button from everyone else,
// but this is the check that counts.
router.put("/:id/spoilers", requireAuth, requireRole("moderator"), setReviewSpoilers);

module.exports = router;
