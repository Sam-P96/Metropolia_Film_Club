const express = require("express");
const { getPanel, sendPpp } = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

// The admin panel (/admin): admins only, whatever their name.
const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", getPanel);
router.post("/grants", sendPpp);

module.exports = router;
