// Kino Poker's betting, as plain functions with no database: no-limit
// betting rounds, who acts next, when a round is over, side pots, and
// sharing pots out. The table (./table.js) plays hands with these; the tests
// check them alone.
//
// A hand's players are { seat, stack, bet, total, folded, allIn, acted, bot }:
//   stack  chips in front of them      bet    put in this betting round
//   total  put in this hand            acted  has acted since the last raise
// `order` is the seats in the hand clockwise, starting left of the dealer.

class PokerError extends Error {
    constructor(message, code = null) {
        super(message);
        this.code = code;
    }
}

const playerAt = (state, seat) => state.players.find((player) => player.seat === seat) ?? null;
const live = (state) => state.players.filter((player) => !player.folded);
// Who can still put chips in: in the hand and not all in.
const canBet = (player) => !player.folded && !player.allIn;

// The seat after `seat` going clockwise, among those `pick` accepts, or
// null if there's none.
function seatAfter(state, seat, pick) {
    const start = state.order.indexOf(seat);
    for (let step = 1; step <= state.order.length; step++) {
        const next = playerAt(state, state.order[(start + step) % state.order.length]);
        if (next && pick(next)) return next.seat;
    }
    return null;
}

// Puts `amount` from a player's stack in front of them (capped at what
// they have). Returns what actually went in.
function putIn(player, amount) {
    const paid = Math.min(amount, player.stack);
    player.stack -= paid;
    player.bet += paid;
    player.total += paid;
    if (player.stack === 0) player.allIn = true;
    return paid;
}

// Posts the blinds and opens the first round. Returns who posted what.
function postBlinds(state, { small, big, smallSeat, bigSeat }) {
    const sb = putIn(playerAt(state, smallSeat), small);
    const bb = putIn(playerAt(state, bigSeat), big);
    state.currentBet = Math.max(sb, bb, big);
    state.minRaise = big;
    state.bigBlind = big;
    return { small: { seat: smallSeat, amount: sb }, big: { seat: bigSeat, amount: bb } };
}

// A new betting round after the draw: bets back to 0, everyone to act.
function newRound(state) {
    for (const player of state.players) {
        player.bet = 0;
        player.acted = false;
    }
    state.currentBet = 0;
    state.minRaise = state.bigBlind;
}

// What `seat` may do now. Raises are "raise to" amounts: the total they'd
// have in front of them this round.
function legalActions(state, seat) {
    const player = playerAt(state, seat);
    if (!player || !canBet(player) || state.toAct !== seat) return { canAct: false };
    const toCall = Math.max(0, state.currentBet - player.bet);
    const most = player.bet + player.stack;
    const least = state.currentBet + state.minRaise;
    const othersCanBet = state.players.some((other) => other.seat !== seat && canBet(other));
    return {
        canAct: true,
        toCall: Math.min(toCall, player.stack),
        canCheck: toCall === 0,
        canCall: toCall > 0,
        // A bet or raise is only worth making if someone else can answer it.
        canRaise: most > state.currentBet && othersCanBet,
        raiseLabel: state.currentBet === 0 ? "bet" : "raise",
        minRaiseTo: Math.min(least, most),
        maxRaiseTo: most,
        allInAmount: most,
    };
}

// `seat` does `action` ("fold", "check", "call", "raise" with a raise-to
// `amount`, or "allIn"). Throws a PokerError if it isn't allowed. Returns
// what happened: { action, amount (chips put in), to (their bet after) }.
// Doesn't move the turn on: the table does that with nextToAct.
function applyAction(state, seat, action, amount) {
    const legal = legalActions(state, seat);
    if (!legal.canAct) throw new PokerError("It isn't your turn.", "NOT_YOUR_TURN");
    const player = playerAt(state, seat);

    if (action === "fold") {
        player.folded = true;
        player.acted = true;
        return { action: "fold", amount: 0, to: player.bet };
    }
    if (action === "check") {
        if (!legal.canCheck) throw new PokerError("You can't check: there's a bet to call.", "CANT_CHECK");
        player.acted = true;
        return { action: "check", amount: 0, to: player.bet };
    }
    if (action === "call") {
        if (!legal.canCall) throw new PokerError("There's nothing to call.", "CANT_CALL");
        const paid = putIn(player, state.currentBet - player.bet);
        player.acted = true;
        return { action: player.allIn ? "allIn" : "call", amount: paid, to: player.bet };
    }

    let to;
    if (action === "allIn") to = legal.allInAmount;
    else if (action === "raise") {
        if (!legal.canRaise) throw new PokerError("You can't raise now.", "CANT_RAISE");
        to = Number(amount);
        if (!Number.isInteger(to)) throw new PokerError("Raise by a whole number of chips.", "BAD_AMOUNT");
        if (to > legal.maxRaiseTo) throw new PokerError("That's more chips than you have.", "BAD_AMOUNT");
        if (to < legal.minRaiseTo) throw new PokerError(`The smallest ${legal.raiseLabel} is to ${legal.minRaiseTo}.`, "BAD_AMOUNT");
    } else throw new PokerError("That isn't a poker move.", "BAD_ACTION");

    const before = state.currentBet;
    const paid = putIn(player, to - player.bet);
    player.acted = true;
    if (player.bet > before) {
        // A full raise sets the next minimum; a short all-in doesn't lower it.
        state.minRaise = Math.max(state.minRaise, player.bet - before);
        state.currentBet = player.bet;
        // Everyone else gets to answer the raise.
        for (const other of state.players) if (other.seat !== seat && canBet(other)) other.acted = false;
        return { action: player.allIn ? "allIn" : before === 0 ? "bet" : "raise", amount: paid, to: player.bet };
    }
    // An all-in for less than the bet is a call.
    return { action: player.allIn ? "allIn" : "call", amount: paid, to: player.bet };
}

// Whether the betting round is over: one player left, or everyone who can
// still bet has acted and matched the bet.
function roundOver(state) {
    if (live(state).length <= 1) return true;
    return state.players.filter(canBet).every((player) => player.acted && player.bet === state.currentBet);
}

// Who acts next after `seat`, or null if nobody needs to.
function nextToAct(state, seat) {
    if (roundOver(state)) return null;
    return seatAfter(state, seat, (player) => canBet(player) && (!player.acted || player.bet < state.currentBet));
}

// Who acts first in a round: the first player left of `afterSeat` who can.
function firstToAct(state, afterSeat) {
    return seatAfter(state, afterSeat, canBet);
}

// Whether anyone can still bet against anyone: if at most one player has
// chips behind, the rest of the betting is skipped (the draw still happens).
function bettingPossible(state) {
    return live(state).filter((player) => !player.allIn).length >= 2;
}

// The pots, from what each player put in this hand: the main pot and side
// pots for all-ins, each with who can win it (`eligible`: still in the
// hand) and how much of it each player put in (`from`). A top layer only
// one player reached is their own uncalled bet, which they get back.
function buildPots(players) {
    const levels = [...new Set(players.map((player) => player.total).filter((total) => total > 0))].sort((a, b) => a - b);
    const pots = [];
    let previous = 0;
    for (const level of levels) {
        const from = {};
        let amount = 0;
        for (const player of players) {
            const part = Math.min(player.total, level) - Math.min(player.total, previous);
            if (part > 0) {
                from[player.seat] = part;
                amount += part;
            }
        }
        const eligible = players.filter((player) => !player.folded && player.total >= level).map((player) => player.seat);
        const last = pots[pots.length - 1];
        if (last && last.eligible.join() === eligible.join()) {
            last.amount += amount;
            for (const [seat, part] of Object.entries(from)) last.from[seat] = (last.from[seat] ?? 0) + part;
        } else pots.push({ amount, eligible, from });
        previous = level;
    }
    return pots.filter((pot) => pot.amount > 0);
}

// Shares the pots out (spec: standard rules). `rank(seat)` gives each
// player still in a comparable hand score (higher wins; null if no
// showdown). Ties split a pot evenly, odd chips going to the winners
// closest to the dealer's left. A member's share of chips that came from
// bots pays `botWinShare` of it (Kino Farkle's rule against Clanker); the
// rest goes to nobody. Returns { payouts: { seat: chips }, pots: [...],
// burned }.
function settlePots(players, { order, rank, botWinShare = 1 }) {
    const pots = buildPots(players);
    const bySeat = new Map(players.map((player) => [player.seat, player]));
    const payouts = {};
    let burned = 0;
    const results = [];

    for (const pot of pots) {
        let winners = pot.eligible;
        if (winners.length > 1) {
            const best = Math.max(...winners.map(rank));
            winners = winners.filter((seat) => rank(seat) === best);
        }
        winners = order.filter((seat) => winners.includes(seat));

        const botChips = Object.entries(pot.from).reduce((sum, [seat, part]) => sum + (bySeat.get(Number(seat))?.bot ? part : 0), 0);
        const base = Math.floor(pot.amount / winners.length);
        let odd = pot.amount - base * winners.length;
        const shares = [];
        for (const seat of winners) {
            let share = base + (odd > 0 ? 1 : 0);
            if (odd > 0) odd -= 1;
            // A member's share of what bots put in pays at botWinShare;
            // what they put in themselves, or other members did, in full.
            if (!bySeat.get(seat).bot && botChips > 0 && botWinShare < 1) {
                const fromBots = (share * botChips) / pot.amount;
                const lost = Math.floor(fromBots * (1 - botWinShare));
                share -= lost;
                burned += lost;
            }
            payouts[seat] = (payouts[seat] ?? 0) + share;
            shares.push({ seat, amount: share });
        }
        results.push({ amount: pot.amount, eligible: pot.eligible, winners: shares, uncalled: pot.eligible.length === 1 && Object.keys(pot.from).length === 1 });
    }
    return { payouts, pots: results, burned };
}

module.exports = {
    PokerError,
    playerAt,
    live,
    canBet,
    seatAfter,
    putIn,
    postBlinds,
    newRound,
    legalActions,
    applyAction,
    roundOver,
    nextToAct,
    firstToAct,
    bettingPossible,
    buildPots,
    settlePots,
};
