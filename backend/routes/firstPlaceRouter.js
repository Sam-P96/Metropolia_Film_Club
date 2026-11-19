const express = require("express");
const { getFirstPlace, putFirstPlaceSettings, putNameEffect } = require("../controllers/firstPlaceController");
const { requireAuth } = require("../middleware/auth");

// First Place (utils/firstPlace.js). Who holds each title and each
// Infinity Stone is public, like the leaderboards (their names show it);
// saving settings is only for a current holder, and picking a name effect
// only for one they have (the controller checks).
const router = express.Router();

router.get("/", getFirstPlace);
router.put("/settings", requireAuth, putFirstPlaceSettings);
router.put("/name-effect", requireAuth, putNameEffect);

module.exports = router;
