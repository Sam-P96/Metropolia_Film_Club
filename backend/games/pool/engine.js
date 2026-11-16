const crypto = require("crypto");
const { ShotError, forfeit, newGame, playShot, resign } = require("../../../shared/pool/rules.js");

// 8 Ball Pool, played on the server: a game in, a shot, the game out. No
// database and no timers (utils/pool.js saves what comes back). The rules
// and the table are shared with the pages (shared/pool/rules.js and
// physics.js), which play each shot again to show it. A game is { balls,
// current, solids, breakShot, hand, shots, lastShot, status, winner,
// endedBy }, the same fields as models/poolMatchModel.js. Nothing is
// changed in place: every shot returns a new game.

// The fields of a match that are the game itself.
const GAME_FIELDS = ["balls", "current", "solids", "breakShot", "hand", "shots", "lastShot", "status", "winner", "endedBy"];

// A new game, racked with numbers nobody can predict.
function freshGame() {
    return newGame(() => crypto.randomInt(2 ** 32) / 2 ** 32);
}

// `seat` shoots: { angle, power, cue }. `angle` is in radians on the table
// (0 along its length, towards the foot), `power` from the softest shot to
// 1, and `cue` ({ x, y }) where they put the cue ball, when it's in hand.
// The angle becomes a direction here, once: the game keeps the direction
// (lastShot.dx, dy), and every page plays the shot again from that, so
// they all get the very same table (see shared/pool/physics.js).
function shoot(game, seat, { angle, power, cue } = {}) {
    if (typeof angle !== "number" || !Number.isFinite(angle) || typeof power !== "number") {
        throw new ShotError("That shot is missing its direction or power.");
    }
    const spot = cue && typeof cue === "object" ? { x: Number(cue.x), y: Number(cue.y) } : null;
    return playShot(game, seat, { dx: Math.cos(angle), dy: Math.sin(angle), power, cue: spot });
}

module.exports = { GAME_FIELDS, ShotError, freshGame, shoot, resign, forfeit };
