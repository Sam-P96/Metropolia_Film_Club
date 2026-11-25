const express = require("express");
const { listGrants, sendPpp, listMembers, awardPack } = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

// The admin panel (/admin) and the Wallet's Send P-PP tool: admins only,
// whatever their name.
const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/grants", listGrants);
router.post("/grants", sendPpp);

// Award booster packs: every member (searchable), and a pack for one.
router.get("/members", listMembers);
router.post("/packs", awardPack);

module.exports = router;
