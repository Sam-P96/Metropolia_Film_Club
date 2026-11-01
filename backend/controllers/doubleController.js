const { WalletError } = require("../utils/wallet");
const { DoubleError } = require("../games/double/engine");
const { potStatus, startGame, playRound } = require("../utils/double");

// Double or Nothing. The rules are in games/double/engine.js, saving and
// paying out in utils/double.js; these only read the request and answer.
// Who's playing always comes from their login, never from the request.

// A refusal from the game or the wallet: { error, code, ...anything the
// page needs with it }, with its status. Anything else is a real error.
function refusal(res, error) {
    if (error instanceof DoubleError) {
        return res.status(error.status).json({ error: error.message, code: error.code, ...error.extra });
    }
    if (error instanceof WalletError) {
        return res.status(error.status).json({ error: error.message });
    }
    throw error;
}

// The pot, their wallet and where they stand, their game if they're in
// one, and the recent plays.
async function getStatus(req, res) {
    res.json(await potStatus(req.user._id));
}

// { expectedBet }: the bet the page showed them. Starts their game.
async function postStart(req, res) {
    try {
        res.status(201).json(await startGame(req.user._id, req.body?.expectedBet));
    } catch (error) {
        refusal(res, error);
    }
}

// { gameId, throw, round }: one round of their game. `round` (1 to 3) is
// the round the throw is for, so a throw sent twice is only played once.
async function postRound(req, res) {
    try {
        res.json(await playRound(req.user._id, req.body?.gameId, req.body?.throw, req.body?.round));
    } catch (error) {
        refusal(res, error);
    }
}

module.exports = { getStatus, postStart, postRound };
