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
const { followUser, unfollowUser, getFollowers, getFollowing } = require("../controllers/followController");
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

// Following someone; two members who follow each other are friends. The
// lists follow the member's followPrivacy setting.
router.put("/:id/follow", requireAuth, followUser);
router.delete("/:id/follow", requireAuth, unfollowUser);
router.get("/:id/followers", optionalAuth, getFollowers);
router.get("/:id/following", optionalAuth, getFollowing);

module.exports = router;
