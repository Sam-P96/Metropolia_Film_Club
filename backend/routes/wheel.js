const express = require("express");
const {
  getEntries,
  addEntry,
  setWeight,
  removeEntry,
  clearEntries,
  updateSettings,
} = require("../controllers/wheelController");
const { requireAuth, optionalAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// The Club Wheel. Everyone sees it; a logged-in member learns what they may do.
router.get("/", optionalAuth, getEntries);

// Moderators and admins, or any member while an admin has it open (the
// controller checks that, and how much weight they have left).
router.post("/", requireAuth, addEntry);

// Moderators and admins.
router.patch("/:id", requireAuth, requireRole("moderator"), setWeight);
router.delete("/:id", requireAuth, requireRole("moderator"), removeEntry);
router.delete("/", requireAuth, requireRole("moderator"), clearEntries);

// Admins: open it to members, and how much weight each may add.
router.put("/settings", requireAuth, requireRole("admin"), updateSettings);

module.exports = router;
