const { WalletError } = require("../utils/wallet");
const { SlotError } = require("../games/slots/engine");
const { addCredits, cashOut, cashOutPreview, machineFor, spin } = require("../utils/slots");

// The Slot Machine. The game is in games/slots/engine.js, saving and paying
// out in utils/slots.js; these only read the request and answer. Who's
// playing always comes from their login, never from the request. Nothing
// here ever answers with the player's luck: only what happened.

// A refusal from the machine or the wallet (not enough points, a bet too
// big): its message, with its status. Anything else is a real error.
function refusal(res, error) {
    if (error instanceof SlotError || error instanceof WalletError) {
        return res.status(error.status).json({ error: error.message });
    }
    throw error;
}

// Their machine: { balance, lastWin }, in PP. Made empty the first time.
async function getMachine(req, res) {
    res.json({ machine: await machineFor(req.user._id) });
}

// Add credits, { amount }: whole points from their wallet, PP first, then
// P-PP. Answers with the machine after.
async function postCredits(req, res) {
    try {
        res.json({ machine: await addCredits(req.user._id, req.body?.amount) });
    } catch (error) {
        refusal(res, error);
    }
}

// One spin, { spinId, bet }: `spinId` is the page's own id for it, so a
// spin sent twice is played once. Answers with the grid it landed on, the
// winning lines and cells, the win and the machine's balance after.
async function postSpin(req, res) {
    try {
        res.json(await spin(req.user._id, { spinId: req.body?.spinId, bet: req.body?.bet }));
    } catch (error) {
        refusal(res, error);
    }
}

// What Cash out would do now: { pp, ppp } back to the wallet, what `stays`
// in the machine (of it, `overCap`), and `capLeft`, the P-PP they can still
// cash out today.
async function getCashOut(req, res) {
    res.json(await cashOutPreview(req.user._id));
}

// Cash out: { machine, paid: { pp, ppp }, quote }.
async function postCashOut(req, res) {
    try {
        res.json(await cashOut(req.user._id));
    } catch (error) {
        refusal(res, error);
    }
}

module.exports = { getMachine, postCredits, postSpin, getCashOut, postCashOut };
