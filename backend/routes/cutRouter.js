const express = require("express");
const { getAllCuts, getCut, postCut, setCutVote, deleteCut } = require("../controllers/cutController");
const { getCutReplies, addCutReply } = require("../controllers/commentController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Moderators and admins: every cut, for "Show all cuts".
router.get("/", requireAuth, requireRole("moderator"), getAllCuts);

router.post("/", requireAuth, postCut);
router.get("/:id", requireAuth, getCut);
router.put("/:id/vote", requireAuth, setCutVote);

// Replies are comments: voting on and deleting one is under /api/comments.
router.get("/:id/replies", requireAuth, getCutReplies);
router.post("/:id/replies", requireAuth, addCutReply);

// The cut's author, or a moderator or admin; the controller checks.
router.delete("/:id", requireAuth, deleteCut);

module.exports = router;
