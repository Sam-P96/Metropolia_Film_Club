const express = require("express");
const { getLists, search, addMember, removeMember } = require("../controllers/loanSharkAdminController");
const { requireAuth, requireRole } = require("../middleware/auth");

// /SECRETloanshark's routes: admins only, every one of them. Mounted ahead
// of the Loan Shark routes in app.js, so a games ban never gets in the way
// of looking after the lists.
const router = express.Router();

router.use(requireAuth, requireRole("admin"));

// Every column: Persuasion, Review Persuasion, Protected and Target.
router.get("/lists", getLists);

// Members by username (?q=), for the Add buttons.
router.get("/search", search);

// The hand-kept lists, "persuasion" and "protected": { userId } to add
// (taking them off the other), or remove one.
router.post("/lists/:list", addMember);
router.delete("/lists/:list/:userId", removeMember);

module.exports = router;
