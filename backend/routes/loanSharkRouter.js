const express = require("express");
const {
    getLoanShark,
    borrowFromShark,
    payShark,
    postOffer,
    takeDownOffer,
    borrowFromOffer,
    payOffDebt,
    testCheck,
} = require("../controllers/loanSharkController");
const { requireAuth, requireRole } = require("../middleware/auth");

// Loan Shark (utils/loanShark/), all for logged-in members. Each change
// answers with { done, view }: what it did, and the page as it is now.
const router = express.Router();

router.use(requireAuth);

// Everything the page shows.
router.get("/", getLoanShark);

// King Loan Shark: { amount }.
router.post("/shark/borrow", borrowFromShark);
router.post("/shark/pay", payShark);

// Offers: { style, amount, rate } to post one; taking one down; borrowing
// from someone else's ({ amount }, for a Flexible one).
router.post("/offers", postOffer);
router.delete("/offers/:id", takeDownOffer);
router.post("/offers/:id/borrow", borrowFromOffer);

// "Pay off now": everything owed on one player loan.
router.post("/debts/:id/pay", payOffDebt);

// Admins, for testing: run the next 12:00 check now ({ username }, or
// themselves).
router.post("/test/check", requireRole("admin"), testCheck);

module.exports = router;
