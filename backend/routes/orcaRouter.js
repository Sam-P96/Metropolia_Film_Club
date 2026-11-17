const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const orca = require("../utils/orca/player");

// Lord Gang Orca (utils/orca/), for logged-in members.
const router = express.Router();
router.use(requireAuth);

async function handle(res, work) {
    try {
        res.json(await work());
    } catch (error) {
        if (!(error instanceof orca.OrcaError) && !(error instanceof orca.WalletError)) throw error;
        res.status(error.status).json({ error: error.message });
    }
}

// His page: hours, the story or his greeting, begs, the cooldown, a
// waiting question, favours, and the lines waiting since last time (shown
// once).
router.get("/", (req, res) => handle(res, () => orca.statusOf(req.user._id, { takeNews: true })));

// The Games page's box.
router.get("/summary", (req, res) => handle(res, () => orca.summaryOf(req.user._id)));

// Ask the boss.
router.post("/beg", (req, res) => handle(res, () => orca.beg(req.user._id)));

// The answer to his question: { option } (the option's text).
router.post("/answer", (req, res) => handle(res, () => orca.answer(req.user._id, String(req.body?.option ?? ""))));

// Admins' testing tools, over the API only (the page has no buttons for
// them): { action, ... } (utils/orca/player.js debug). Then the page as it
// is now, with the tools' state.
router.post("/debug", requireRole("admin"), (req, res) =>
    handle(res, async () => {
        await orca.debug(req.user._id, String(req.body?.action ?? ""), req.body ?? {});
        return orca.statusOf(req.user._id, { admin: true });
    })
);

module.exports = router;
