const express = require("express");
const { listGrants, sendPpp } = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

// The admin panel (/admin) and the Wallet's Send P-PP tool: admins only,
// whatever their name.
const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/grants", listGrants);
router.post("/grants", sendPpp);

module.exports = router;
