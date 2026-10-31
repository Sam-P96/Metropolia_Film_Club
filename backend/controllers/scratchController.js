const { WalletError } = require("../utils/wallet");
const { ScratchError } = require("../games/scratch/engine");
const { buyCard, collectCard, currentCard, jackpotView, revealCard, scratchCard } = require("../utils/scratch");

// Box Office Scratch. The game is in games/scratch/engine.js, saving and
// paying out in utils/scratch.js; these only read the request and answer.

// A refusal from the game or the wallet (not enough points, a tile already
// scratched): its message, with its status. Anything else is a real error.
function refusal(res, error) {
    if (error instanceof ScratchError || error instanceof WalletError) {
        return res.status(error.status).json({ error: error.message });
    }
    throw error;
}

// The jackpot pool and its recent winners, for anyone.
async function getJackpot(req, res) {
    res.json(await jackpotView());
}

// Their card to show: the one being scratched, or the last finished one not
// yet revealed. { card }, null if neither.
async function getCurrentCard(req, res) {
    res.json({ card: await currentCard(req.user._id) });
}

// Buy a ticket. 201 with the new card and its seal; 409 if they already
// have one going (so a double tap only ever buys one); 400 if they don't
// have the points.
async function postCard(req, res) {
    try {
        res.status(201).json(await buyCard(req.user._id));
    } catch (error) {
        refusal(res, error);
    }
}

// One scratch, { tile }: the position on the card, 0 to 15. Answers with
// what was under it and the card after, including any win.
async function postScratch(req, res) {
    try {
        res.json(await scratchCard(req.user._id, req.params.id, req.body?.tile));
    } catch (error) {
        refusal(res, error);
    }
}

// "Collect": end the card now, leaving its scratches left unused.
async function postCollect(req, res) {
    try {
        res.json(await collectCard(req.user._id, req.params.id));
    } catch (error) {
        refusal(res, error);
    }
}

// "Reveal card", once it's done: the full layout and the salt, to check
// against the seal.
async function getReveal(req, res) {
    try {
        res.json(await revealCard(req.user._id, req.params.id));
    } catch (error) {
        refusal(res, error);
    }
}

module.exports = { getJackpot, getCurrentCard, postCard, postScratch, postCollect, getReveal };
