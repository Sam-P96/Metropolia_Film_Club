const express = require("express");
const steal = require("../controllers/stealController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { refuseGameBans } = require("../middleware/gameBans");

const router = express.Router();

// Steal and Defend (controllers/stealController.js). The item list and the
// public feed are for anyone; everything else needs a login. Members
// banned from all games can still look, but can't change anything.

router.get("/items", steal.getItems);
router.get("/feed", steal.getFeed);

router.use(requireAuth);
router.use(refuseGameBans);

router.get("/status", steal.getStatus);
router.get("/me", steal.getHub);
// PVP is the profile's setting (PATCH /api/users/me); this is what turning
// it off would take back.
router.get("/pvp/takeback", steal.getTakeback);
router.post("/class", steal.setClass);

router.post("/items/:id/equip", steal.equipItem);
router.post("/items/:id/unequip", steal.unequipItem);
router.post("/items/:id/sell", steal.sellItem);

router.get("/targets", steal.getTargets);
router.get("/history", steal.getHistory);
router.post("/attacks", steal.startAttack);
router.get("/attacks/:id", steal.getAttack);
router.post("/attacks/:id/answer", steal.answer);

router.get("/shop", steal.getShop);
router.post("/shop/:id/buy", steal.buyListing);

router.get("/market", steal.getMarket);
router.post("/market", steal.listOnMarket);
router.delete("/market/:id", steal.cancelListing);
router.post("/market/:id/buy", steal.buyFromMarket);

router.get("/trades", steal.getTrades);
router.post("/trades", steal.offerTrade);
router.post("/trades/:id/accept", steal.acceptTrade);
router.post("/trades/:id/decline", steal.declineTrade);
router.post("/trades/:id/cancel", steal.cancelTrade);
router.post("/gifts", steal.sendGift);
router.get("/players/:id/items", steal.getPlayerItems);

// Admins: the flags and the Ban List (spec §14).
router.get("/admin/flags", requireRole("admin"), steal.getFlags);
router.post("/admin/flags/:id/dismiss", requireRole("admin"), steal.dismissFlag);
router.get("/admin/bans", requireRole("admin"), steal.getBans);
router.post("/admin/bans", requireRole("admin"), steal.createBan);
router.delete("/admin/bans/:id", requireRole("admin"), steal.liftBan);
// "Reset steal timer": everyone can attack again today.
router.get("/admin/attack-reset", requireRole("admin"), steal.getAttackReset);
router.post("/admin/attack-reset", requireRole("admin"), steal.resetAttacks);

module.exports = router;
