const express = require("express");
const {
    getFilmStats,
    getTopRated,
    getMostWanted,
    getFilmReviews,
    getFilmClub,
    getMyFilm,
    setPlanned,
    saveReview,
} = require("../controllers/filmController");
const { requireAuth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// The club's activity across all films. These come before "/:tmdbId".
router.get("/stats", getFilmStats);
router.get("/top-rated", getTopRated);
router.get("/most-wanted", getMostWanted);

// One film. optionalAuth: a logged-in member learns which reviews they've liked.
router.get("/:tmdbId/reviews", optionalAuth, getFilmReviews);
router.get("/:tmdbId/club", optionalAuth, getFilmClub);

// The logged-in member and one film.
router.get("/:tmdbId/me", requireAuth, getMyFilm);
router.put("/:tmdbId/plan", requireAuth, setPlanned);
router.put("/:tmdbId/review", requireAuth, saveReview);

module.exports = router;
