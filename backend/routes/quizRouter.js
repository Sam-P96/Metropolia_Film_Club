const express = require("express");
const { getState, start, answer, getLeaderboard, getQueue, addOne, addBulk, edit, move, remove } = require("../controllers/quizController");
const { requireAuth, requireRole } = require("../middleware/auth");

// The Daily Quiz (utils/quiz.js), for logged-in members.
const router = express.Router();

router.use(requireAuth);

// Today's quiz and this week; playing it; the leaderboard.
router.get("/", getState);
router.post("/start", start);
router.post("/answer", answer);
router.get("/leaderboard", getLeaderboard);

// Moderators and admins: the queue of questions they write. A bulk upload
// can be big: app.js lets its body through at up to 5 MB.
router.get("/questions", requireRole("moderator"), getQueue);
router.post("/questions", requireRole("moderator"), addOne);
router.post("/questions/bulk", requireRole("moderator"), addBulk);
router.put("/questions/:id", requireRole("moderator"), edit);
router.post("/questions/:id/move", requireRole("moderator"), move);
router.delete("/questions/:id", requireRole("moderator"), remove);

module.exports = router;
