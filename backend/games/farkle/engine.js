const crypto = require("crypto");
const {
    DICE_PER_TURN,
    botPick,
    botShouldBank,
    formatPoints,
    hasScoringDice,
    rollDice,
    scoreDice,
} = require("../../../shared/farkle/rules.js");

// Farkle as the server plays it: it rolls every die and checks every move,
// so the browser only ever says "set aside the dice at 0 and 3" and shows
// what comes back. These are plain functions on a plain game object (the
// game fields of models/farkleMatchModel.js, plus `target`) with no
// database, so a test can hand them its own dice. utils/farkle.js saves
// what they return.

// The game fields engine.js owns. utils/farkle.js copies these between the
// match in the database and the game object.
const GAME_FIELDS = [
    "status", "scores", "current", "turn", "phase", "dice", "kept", "turnPoints",
    "hotDice", "steps", "lastTurns", "log", "logCount", "winner", "endedBy",
];

const LOG_SIZE = 8;
const KEEP_TURNS = 4;

// A move that isn't allowed, like banking before rolling. The controller
// sends the message back with `status`.
class MoveError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Real dice. crypto.randomInt can't be worked out from earlier rolls, the
// way Math.random in theory can.
function cryptoDice(count) {
    return rollDice(count, () => crypto.randomInt(1, 7));
}

// A new game to `target`, with `first` (a seat, 0 or 1) to roll.
function newGame({ target, first }) {
    return {
        target,
        status: "active",
        scores: [0, 0],
        current: first,
        turn: 1,
        phase: "ready",
        dice: [],
        kept: [],
        turnPoints: 0,
        hotDice: false,
        steps: [],
        lastTurns: [],
        log: [],
        logCount: 0,
        winner: null,
        endedBy: null,
    };
}

// A new line at the top of the match log, keeping the newest LOG_SIZE.
function addLog(game, seat, text) {
    game.log = [{ number: game.logCount, seat, text }, ...game.log].slice(0, LOG_SIZE);
    game.logCount += 1;
}

// Files the turn just played under lastTurns, so the page can replay it.
function recordTurn(game, result, points) {
    const turn = { number: game.turn, seat: game.current, steps: game.steps, result, points };
    game.lastTurns = [...game.lastTurns, turn].slice(-KEEP_TURNS);
}

// The turn's over (banked or Farkled): the other seat's go, from scratch.
function passDice(game) {
    game.current = 1 - game.current;
    game.turn += 1;
    game.phase = "ready";
    game.dice = [];
    game.kept = [];
    game.turnPoints = 0;
    game.hotDice = false;
    game.steps = [];
}

function endGame(game, winner, endedBy) {
    game.status = "over";
    game.winner = winner;
    game.endedBy = endedBy;
}

// Rolls `count` dice for whoever's turn it is. If nothing scores, that's a
// Farkle: the turn's points are lost and the dice pass.
function rollFor(game, count, roll) {
    const dice = roll(count);
    game.dice = dice;
    game.steps.push({ dice, keep: [], points: 0, then: null });

    if (hasScoringDice(dice)) {
        game.phase = "choosing";
        return;
    }

    game.steps[game.steps.length - 1].then = "farkle";
    addLog(game, game.current, game.turnPoints ? `Farkled, lost ${formatPoints(game.turnPoints)}` : "Farkled on the first roll");
    recordTurn(game, "farkle", 0);
    passDice(game);
}

// The dice a move sets aside, checked: at least one, each a different
// position on the table. Comes back sorted. The browser sends this, so it
// can't be trusted to be anything in particular.
function checkKeep(keep, diceOnTable) {
    const ok = Array.isArray(keep)
        && keep.length > 0
        && keep.every((i) => Number.isInteger(i) && i >= 0 && i < diceOnTable)
        && new Set(keep).size === keep.length;

    if (!ok) throw new MoveError("Pick which dice to set aside.");
    return [...keep].sort((a, b) => a - b);
}

// One move by the player in `seat`, as { type, keep }:
//   roll    the first roll of a turn (keeping nothing), or set aside the
//           dice at `keep` and roll the rest: all six again if that used
//           every die (hot dice)
//   bank    set aside `keep` and add the turn's points to their score
//   resign  fold (the Fold button): the other player wins
// Returns the game after the move and leaves `game` as it was. `roll`
// makes the dice. Throws a MoveError if the move isn't allowed.
function applyMove(game, seat, move, roll = cryptoDice) {
    if (game.status !== "active") throw new MoveError("This game is over.", 409);

    const next = structuredClone(game);
    const type = move?.type;

    if (type === "resign") {
        addLog(next, seat, "Folded");
        endGame(next, 1 - seat, "resign");
        return next;
    }

    if (type !== "roll" && type !== "bank") throw new MoveError("That isn't a move.");
    if (next.current !== seat) throw new MoveError("It's not your turn.", 409);

    if (next.phase === "ready") {
        if (type === "bank") throw new MoveError("Roll first.");
        if (move.keep?.length) throw new MoveError("Roll first, then pick dice.");
        rollFor(next, DICE_PER_TURN, roll);
        return next;
    }

    const keep = checkKeep(move.keep, next.dice.length);
    const keptDice = keep.map((i) => next.dice[i]);
    const points = scoreDice(keptDice);
    if (!points) throw new MoveError("Every die you set aside has to score.");

    const step = next.steps[next.steps.length - 1];
    step.keep = keep;
    step.points = points;
    step.then = type;
    next.turnPoints += points;

    const rest = next.dice.filter((_, i) => !keep.includes(i));

    if (type === "bank") {
        const total = next.scores[seat] + next.turnPoints;
        next.scores[seat] = total;

        if (total >= next.target) {
            // The winning dice stay on the table for the page to show.
            next.kept = next.kept.concat(keptDice);
            next.dice = rest;
            addLog(next, seat, `Banked ${formatPoints(next.turnPoints)} and won`);
            recordTurn(next, "win", next.turnPoints);
            endGame(next, seat, "bank");
            return next;
        }

        addLog(next, seat, `Banked ${formatPoints(next.turnPoints)}`);
        recordTurn(next, "bank", next.turnPoints);
        passDice(next);
        return next;
    }

    if (rest.length === 0) {
        next.kept = [];
        next.hotDice = true;
        addLog(next, seat, "Hot dice");
        rollFor(next, DICE_PER_TURN, roll);
    } else {
        next.kept = next.kept.concat(keptDice);
        next.hotDice = false;
        rollFor(next, rest.length, roll);
    }

    return next;
}

// How often `count` dice Farkle on their own (nothing scores), worked out
// over every possible roll once.
const FARKLE_CHANCE = Array.from({ length: DICE_PER_TURN + 1 }, (_, count) => {
    const total = 6 ** count;
    let farkles = 0;
    for (let outcome = 0; outcome < total; outcome++) {
        const dice = [];
        for (let i = 0, rest = outcome; i < count; i++, rest = Math.floor(rest / 6)) dice.push(1 + (rest % 6));
        if (!hasScoringDice(dice)) farkles += 1;
    }
    return farkles / total;
});

// `count` dice that score nothing: no 1s or 5s, and no face three times.
function farkleDice(count, random) {
    const pool = [2, 2, 3, 3, 4, 4, 6, 6];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
}

// A roll of `count` dice that Farkles `chance` of the time (0 to 1): rolled
// as usual, and when they'd score, swapped for a Farkle just often enough
// to make up the difference. Dice that Farkle more often than that on their
// own are left alone. Never sent anywhere: the page only sees the dice.
function rollWithBust(count, chance, roll, random) {
    const dice = roll(count);
    const natural = FARKLE_CHANCE[count] ?? 0;
    if (!(chance > natural) || !hasScoringDice(dice)) return dice;
    const swap = (chance - natural) / (1 - natural);
    return random(1_000_000) < swap * 1_000_000 ? farkleDice(count, random) : dice;
}

// The bot's whole turn, if it's the bot's go (the bot sits in `seat`):
// roll, set aside what botPick likes, then bank or roll on as botShouldBank
// says, until it banks or Farkles. Its moves go through applyMove like
// anyone's, so it can't break the rules either.
//
// `bustChance` (games/happyHours.js), if given, is ({ turn, roll }) => 0 to
// 1: how often roll number `roll` of the bot's `turn`th turn of the match
// should Farkle. `random(max)` decides those: crypto.randomInt unless a
// test passes its own.
function playBot(game, seat, roll = cryptoDice, { bustChance = null, random = crypto.randomInt } = {}) {
    if (game.status !== "active" || game.current !== seat) return game;

    let dice = roll;
    if (bustChance) {
        // Turns alternate, so each seat's go is every other one.
        const turn = Math.ceil(game.turn / 2);
        let rolls = 0;
        dice = (count) => {
            rolls += 1;
            return rollWithBust(count, bustChance({ turn, roll: rolls }), roll, random);
        };
    }

    let next = applyMove(game, seat, { type: "roll" }, dice);

    while (next.status === "active" && next.current === seat) {
        const pick = botPick(next.dice);
        const bank = botShouldBank({
            turnPoints: next.turnPoints + pick.points,
            diceLeft: pick.diceLeft,
            score: next.scores[seat],
            target: next.target,
        });
        next = applyMove(next, seat, { type: bank ? "bank" : "roll", keep: pick.indexes }, dice);
    }

    return next;
}

// Three days without a move: whoever's turn it is loses.
function forfeit(game) {
    if (game.status !== "active") return game;

    const next = structuredClone(game);
    addLog(next, next.current, "Ran out of time");
    endGame(next, 1 - next.current, "forfeit");
    return next;
}

module.exports = { GAME_FIELDS, MoveError, FARKLE_CHANCE, cryptoDice, rollWithBust, newGame, applyMove, playBot, forfeit };
