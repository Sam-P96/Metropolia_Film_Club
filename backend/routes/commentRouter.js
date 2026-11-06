const express = require("express");
const { editComment, setCommentVote, deleteComment } = require("../controllers/commentController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Listing and posting comments are under /api/reviews/:id/comments (and a
// cut's replies under /api/cuts/:id/replies).

router.put("/:id/vote", requireAuth, setCommentVote);

// Only the comment's author can change what it says; the controller checks.
router.patch("/:id", requireAuth, editComment);

// The comment's author, or a moderator or admin; the controller checks.
router.delete("/:id", requireAuth, deleteComment);

module.exports = router;
