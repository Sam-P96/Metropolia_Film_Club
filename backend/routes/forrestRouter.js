const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireDevTools } = require("../middleware/devTools");
const forrest = require("../utils/forrest");

// Forrest Bounce (utils/forrest.js), for logged-in members. Every answer
// carries `status`, where they stand after it.
const router = express.Router();
router.use(requireAuth);

async function handle(req, res, work) {
    try {
        const result = await work();
        res.json({ ...result, status: await forrest.statusOf(req.user._id) });
    } catch (error) {
        if (!(error instanceof forrest.ForrestError) && !(error instanceof forrest.WalletError)) throw error;
        res.status(error.status).json({ error: error.message });
    }
}

// Their points, cash-outs left today, buddies and the ones they can pick,
// their best, the site's best runs, and a scored run still waiting.
router.get("/", (req, res) => handle(req, res, async () => ({})));

// Their two buddies: { buddies: [on the branch, on the seesaw] }.
router.put("/buddies", (req, res) => handle(req, res, async () => ({ buddies: await forrest.setBuddies(req.user._id, req.body?.buddies) })));

// A new run: { cost } (one of the entries, or 0 for free play). Answers
// with the run and its seed.
router.post("/runs", (req, res) => handle(req, res, async () => ({ run: await forrest.startRun(req.user._id, Number(req.body?.cost)) })));

// The run's over on the page: { taps, endTick }. Scored here.
router.post("/runs/:id/finish", (req, res) =>
    handle(req, res, () => forrest.finishRun(req.user._id, req.params.id, { taps: req.body?.taps, endTick: req.body?.endTick }))
);

router.post("/runs/:id/cashout", (req, res) => handle(req, res, () => forrest.cashOut(req.user._id, req.params.id)));

router.post("/runs/:id/discard", (req, res) => handle(req, res, async () => ({ run: await forrest.discard(req.user._id, req.params.id) })));

// Developer tool only (middleware/devTools.js: on your own computer, with
// GOMOKU_DEV_TOOLS=true; a 404 anywhere else): today's cash-outs back.
router.post("/dev/reset-day", requireDevTools, (req, res) => handle(req, res, async () => ({ reset: Boolean(await forrest.resetDay(req.user._id)) })));

module.exports = router;
