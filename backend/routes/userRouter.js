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
    deleteUser,
    setBans,
    getBanned,
} = require("../controllers/userControllers");
const { followUser, unfollowUser, getFollowers, getFollowing } = require("../controllers/followController");
const { requireAuth, optionalAuth, requireRole } = require("../middleware/auth");

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
// Moderators and admins only. Before "/:id", or Express would read
// "banned" as an id.
router.get("/banned", requireAuth, requireRole("moderator"), getBanned);

router.get("/:id", optionalAuth, getUser);

// The Ban Hammer. Moderators and admins, on members they outrank; the
// controller checks the ranks.
router.put("/:id/bans", requireAuth, requireRole("moderator"), setBans);

// Admins only, on members they outrank (the controller checks), from the
// Ban Hammer. "/me" above is a member deleting their own.
router.delete("/:id", requireAuth, requireRole("admin"), deleteUser);
router.get("/:id/reviews", optionalAuth, getUserReviews);
router.get("/:id/films", optionalAuth, getUserFilms);

// Following someone; two members who follow each other are friends. The
// lists follow the member's followPrivacy setting.
router.put("/:id/follow", requireAuth, followUser);
router.delete("/:id/follow", requireAuth, unfollowUser);
router.get("/:id/followers", optionalAuth, getFollowers);
router.get("/:id/following", optionalAuth, getFollowing);

module.exports = router;
