const express = require("express");
const { getRecentReviews, getReview } = require("../controllers/filmController");

const router = express.Router();

router.get("/", getRecentReviews);
router.get("/:id", getReview);

module.exports = router;
