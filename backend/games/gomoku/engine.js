const { boardOf, isFull, isOnBoard, pointIndex, seatToMove, winningLine } = require("../../../shared/gomoku/rules.js");

// Infinite Gomoku, played on the server: a game in, a move, the game out.
// No database and no timers (utils/gomoku.js saves what comes back). A game
// is { size, moves, current, status, winner, winLine, endedBy }, the same
// fields as models/gomokuMatchModel.js. Nothing is changed in place: every
// move returns a new game.

// The fields of a match that are the game itself.
const GAME_FIELDS = ["moves", "current", "status", "winner", "winLine", "endedBy"];

// A move that isn't allowed, with the HTTP status to answer it with.
class MoveError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function checkTurn(game, seat) {
    if (game.status !== "active") throw new MoveError("This game is over.", 409);
    if (seat !== 0 && seat !== 1) throw new MoveError("You're not playing in this game.", 403);
    if (game.current !== seat) throw new MoveError("It's not your turn.", 409);
}

// `seat` puts a stone on (x, y). Five or more in a row wins; a full board
// with no five is a draw. `at` is when, for the move list.
function placeStone(game, seat, x, y, at = new Date()) {
    checkTurn(game, seat);
    if (!isOnBoard(game.size, x, y)) throw new MoveError("That point isn't on the board.");

    const board = boardOf(game.size, game.moves);
    if (board[pointIndex(game.size, x, y)] !== null) throw new MoveError("There's already a stone there.");

    const moves = [...game.moves, { x, y, seat, at }];
    board[pointIndex(game.size, x, y)] = seat;

    const line = winningLine(board, game.size, x, y);
    if (line) {
        return { ...game, moves, status: "over", winner: seat, winLine: line, endedBy: "five" };
    }
    if (isFull(board)) {
        return { ...game, moves, status: "over", winner: null, winLine: [], endedBy: "draw" };
    }
    return { ...game, moves, current: seatToMove(moves.length) };
}

// `seat` gives up: the other player wins. Allowed whenever the game is on,
// whoever's turn it is.
function resign(game, seat, endedBy = "resign") {
    if (game.status !== "active") throw new MoveError("This game is over.", 409);
    if (seat !== 0 && seat !== 1) throw new MoveError("You're not playing in this game.", 403);
    return { ...game, status: "over", winner: 1 - seat, winLine: [], endedBy };
}

// Three days went by without a move: whoever's turn it was loses.
function forfeit(game) {
    return resign(game, game.current, "forfeit");
}

module.exports = { GAME_FIELDS, MoveError, placeStone, resign, forfeit };
