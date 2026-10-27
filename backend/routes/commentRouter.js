const express = require("express");
const { setCommentVote, deleteComment } = require("../controllers/commentController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Listing and posting comments are under /api/reviews/:id/comments.

router.put("/:id/vote", requireAuth, setCommentVote);

// The comment's author, or a moderator or admin; the controller checks.
router.delete("/:id", requireAuth, deleteComment);

module.exports = router;
