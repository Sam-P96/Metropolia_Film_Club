const express = require("express");
const { requestReset, completeReset } = require("../controllers/passwordResetController");

const router = express.Router();

// "Forgot password?" on the login page, for anyone. Requesting a link shares
// the login rate limit (app.js). The token travels in the emailed link, so
// completing the reset takes it in the body, not the URL.
router.post("/", requestReset);
router.post("/complete", completeReset);

module.exports = router;
