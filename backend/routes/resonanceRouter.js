const express = require("express");
const {
    getMyResonance,
    getSuggestions,
    getRanking,
    getSoulResonance,
    getEveryonesResonance,
    updateResonanceNow,
} = require("../controllers/resonanceController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// The logged-in member's own matches.
router.get("/me", requireAuth, getMyResonance);
router.get("/suggestions", requireAuth, getSuggestions);
router.get("/ranking", requireAuth, getRanking);
router.get("/soul", requireAuth, getSoulResonance);

// /SECRETresonance: everyone's, whatever their settings and privacy, so
// moderators and admins only. They can also work everyone's out again
// early, without waiting for 04:00.
router.get("/all", requireAuth, requireRole("moderator"), getEveryonesResonance);
router.post("/update", requireAuth, requireRole("moderator"), updateResonanceNow);

module.exports = router;
