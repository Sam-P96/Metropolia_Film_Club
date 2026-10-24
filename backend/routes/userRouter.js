const express = require("express");
const router = express.Router();

const {
    loginUser,
    signupUser,
    getUsers,
    getUser,
    getUserReviews,
    getUserFilms,
    updateMe,
    exportMe,
    deleteMe,
} = require("../controllers/userControllers");
const { requireAuth, optionalAuth } = require("../middleware/auth");

// login route
router.post("/login", loginUser);

// signin route
router.post("/signup", signupUser);

router.get("/", getUsers);

// Before "/:id", or Express would read "me" as an id.
router.patch("/me", requireAuth, updateMe);

// GDPR: download everything we hold, or delete the account entirely.
router.get("/me/export", requireAuth, exportMe);
router.delete("/me", requireAuth, deleteMe);

// optionalAuth: a private profile is only visible to its owner, and a
// logged-in member learns which reviews they've liked.
router.get("/:id", optionalAuth, getUser);
router.get("/:id/reviews", optionalAuth, getUserReviews);
router.get("/:id/films", optionalAuth, getUserFilms);

module.exports = router;
