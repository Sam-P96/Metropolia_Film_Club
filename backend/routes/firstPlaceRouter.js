const express = require("express");
const { getFirstPlace, putFirstPlaceSettings } = require("../controllers/firstPlaceController");
const { requireAuth } = require("../middleware/auth");

// First Place (utils/firstPlace.js). Who holds each title is public, like
// the leaderboards; saving settings is only for a current holder (the
// controller checks).
const router = express.Router();

router.get("/", getFirstPlace);
router.put("/settings", requireAuth, putFirstPlaceSettings);

module.exports = router;
