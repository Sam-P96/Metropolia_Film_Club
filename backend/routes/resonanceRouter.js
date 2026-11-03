const express = require("express");
const { getMyResonance, getSuggestions, getRanking, getSoulResonance, getEveryonesResonance } = require("../controllers/resonanceController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// The logged-in member's own matches.
router.get("/me", requireAuth, getMyResonance);
router.get("/suggestions", requireAuth, getSuggestions);
router.get("/ranking", requireAuth, getRanking);
router.get("/soul", requireAuth, getSoulResonance);

// /SECRETresonance: everyone's, whatever their settings and privacy, so
// admins only.
router.get("/all", requireAuth, requireRole("admin"), getEveryonesResonance);

module.exports = router;
