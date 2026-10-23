const express = require("express");
const {
    getReviews,
    getReview,
    setReviewLiked,
    setReviewSpoilers,
} = require("../controllers/filmController");
const { requireAuth, optionalAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Anyone can read reviews. A logged-in member also learns which they've liked.
// ?sort=top lists the most liked first instead of the newest.
router.get("/", optionalAuth, getReviews);
router.get("/:id", optionalAuth, getReview);

router.put("/:id/like", requireAuth, setReviewLiked);

// Moderators and admins. The frontend hides the button from everyone else,
// but this is the check that counts.
router.put("/:id/spoilers", requireAuth, requireRole("moderator"), setReviewSpoilers);

module.exports = router;
