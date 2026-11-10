const express = require("express");
const { getShop, buy, wear, wish, devAccess } = require("../controllers/blackMarketController");
const { requireAuth, requireRole } = require("../middleware/auth");

// The Black Market (utils/blackMarket.js), for logged-in members.
const router = express.Router();

router.use(requireAuth);

// Their P-PP, reviews, what they own, hearted and are wearing, and every
// item's hearts.
router.get("/", getShop);

// { itemId }: buy it with P-PP. { type: "name" | "border", itemId | null }:
// wear one they own, or take it off. { itemId, on }: heart it (their
// wishlist) or take the heart off.
router.post("/buy", buy);
router.put("/wear", wear);
router.put("/wishlist", wish);

// Admins: may the developer test tool open?
router.get("/dev", requireRole("admin"), devAccess);

module.exports = router;
