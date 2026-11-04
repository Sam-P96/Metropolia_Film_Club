// Kino Poker, with no database or sockets: the hand evaluator, the betting
// rules, side pots and payouts, the bots, and the table itself (seats, the
// queue, bots leaving and coming back, disconnects, cash-outs), driven by a
// fake clock and wallet. Run from backend/ with `npm test`.
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { POKER } = require("../../shared/poker/config.js");
const { LINES } = require("../../shared/poker/lines.js");
const { newDeck, shuffle } = require("../games/poker/cards");
const { evaluate, compareHands } = require("../games/poker/evaluator");
const betting = require("../games/poker/betting");
const bots = require("../games/poker/bots");
const { PokerTable, isSingleEmoji } = require("../games/poker/table");
const { cashOutSplit } = require("../utils/pokerWallet");

const hand = (text) => text.split(" ");
const beats = (a, b) => compareHands(evaluate(hand(a)), evaluate(hand(b))) > 0;
const ties = (a, b) => compareHands(evaluate(hand(a)), evaluate(hand(b))) === 0;

describe("the deck", () => {
    test("52 different cards, and a shuffle keeps them all", () => {
        const deck = newDeck();
        assert.equal(new Set(deck).size, 52);
        const shuffled = shuffle(deck);
        assert.deepEqual([...shuffled].sort(), [...deck].sort());
        assert.notDeepEqual(shuffled, deck);
    });
});

describe("the hand evaluator", () => {
    test("names every category", () => {
        const names = [
            "As Ks Qs Js Ts", "9h 8h 7h 6h 5h", "Qc Qd Qh Qs 2c", "Jc Jd Jh 4s 4c", "Ah 9h 6h 4h 2h",
            "9c 8d 7h 6s 5c", "7c 7d 7h Ks 2c", "Kc Kd 4h 4s Ac", "Tc Td 8h 4s 2c", "Ac Jd 8h 4s 2c",
        ].map((cards) => evaluate(hand(cards)).label);
        assert.deepEqual(names, [
            "Royal flush", "Straight flush, Nine high", "Four Queens", "Full house, Jacks over Fours", "Flush, Ace high",
            "Straight, Nine high", "Three Sevens", "Two pair, Kings and Fours", "Pair of Tens", "Ace high",
        ]);
    });

    test("categories rank in the standard order", () => {
        const ladder = ["Ac Jd 8h 4s 2c", "Tc Td 8h 4s 2c", "Kc Kd 4h 4s Ac", "7c 7d 7h Ks 2c", "9c 8d 7h 6s 5c", "Ah 9h 6h 4h 2h", "Jc Jd Jh 4s 4c", "Qc Qd Qh Qs 2c", "9h 8h 7h 6h 5h"];
        for (let i = 1; i < ladder.length; i++) assert.ok(beats(ladder[i], ladder[i - 1]), `${ladder[i]} should beat ${ladder[i - 1]}`);
    });

    test("the wheel (A-2-3-4-5) is the lowest straight", () => {
        assert.equal(evaluate(hand("Ac 2d 3h 4s 5c")).label, "Straight, Five high");
        assert.ok(beats("2c 3d 4h 5s 6c", "Ac 2d 3h 4s 5c"));
        assert.ok(beats("Ac Kd Qh Js Tc", "Kc Qd Jh Ts 9c"));
        assert.equal(evaluate(hand("Ah 2h 3h 4h 5h")).label, "Straight flush, Five high");
    });

    test("tie-breaks: kickers, pairs, trips, then every flush card", () => {
        assert.ok(beats("Kc Kd Ah 7s 2c", "Ks Kh Qh 7c 2d"), "pair: the kicker");
        assert.ok(beats("Kc Kd 9h 9s 2c", "Ks Kh 8h 8c Ad"), "two pair: the lower pair");
        assert.ok(beats("Kc Kd 9h 9s 3c", "Ks Kh 9d 9c 2d"), "two pair: then the kicker");
        assert.ok(beats("4c 4d 4h 2s 2c", "3c 3d 3h As Ac"), "full house: the trips first");
        assert.ok(beats("Ah Jh 6h 4h 3h", "As Js 6s 4s 2s"), "flush: down to the last card");
        assert.ok(beats("Ac Ad Kh 4s 3c", "Ah As Qh Js Tc"), "pair: second kicker after a tied first");
    });

    test("suits never break a tie", () => {
        assert.ok(ties("Ac Kd Qh Js 9c", "Ad Kh Qs Jc 9d"));
        assert.ok(ties("Tc Td 8h 4s 2c", "Th Ts 8c 4d 2d"));
    });
});

// A hand's players for betting tests: seats 0..n-1, dealer last.
function table(stacks, { dealer = stacks.length - 1, bots: botSeats = [] } = {}) {
    const players = stacks.map((stack, seat) => ({ seat, stack, bet: 0, total: 0, folded: false, allIn: false, acted: false, bot: botSeats.includes(seat) }));
    const seats = players.map((p) => p.seat);
    const start = seats.indexOf(dealer);
    return { players, order: [...seats.slice(start + 1), ...seats.slice(0, start + 1)], dealer, currentBet: 0, minRaise: 2, toAct: null };
}

function preflop(stacks, options) {
    const state = table(stacks, options);
    const [smallSeat, bigSeat] = state.order;
    betting.postBlinds(state, { small: 1, big: 2, smallSeat, bigSeat });
    state.toAct = betting.firstToAct(state, bigSeat);
    return state;
}

function play(state, moves) {
    for (const [action, amount] of moves) {
        const seat = state.toAct;
        betting.applyAction(state, seat, action, amount);
        state.toAct = betting.nextToAct(state, seat);
    }
    return state;
}

describe("betting", () => {
    test("blinds go in, and the first to act faces the big blind", () => {
        const state = preflop([100, 100, 100, 100]);
        assert.equal(state.toAct, 2);
        const legal = betting.legalActions(state, 2);
        assert.equal(legal.toCall, 2);
        assert.equal(legal.canCheck, false);
        assert.equal(legal.minRaiseTo, 4);
        assert.equal(legal.maxRaiseTo, 100);
    });

    test("moves out of turn, checks facing a bet and small raises are refused", () => {
        const state = preflop([100, 100, 100, 100]);
        assert.throws(() => betting.applyAction(state, 3, "call"), /isn't your turn/);
        assert.throws(() => betting.applyAction(state, 2, "check"), /can't check/);
        assert.throws(() => betting.applyAction(state, 2, "raise", 3), /smallest raise is to 4/);
        assert.throws(() => betting.applyAction(state, 2, "raise", 101), /more chips/);
        assert.throws(() => betting.applyAction(state, 2, "dance"), /isn't a poker move/);
    });

    test("the big blind gets its option when everyone just calls", () => {
        const state = play(preflop([100, 100, 100, 100]), [["call"], ["call"], ["call"]]);
        assert.equal(state.toAct, 1, "back to the big blind");
        assert.equal(betting.roundOver(state), false);
        assert.equal(betting.legalActions(state, 1).canCheck, true);
        play(state, [["check"]]);
        assert.equal(betting.roundOver(state), true);
        assert.equal(state.toAct, null);
    });

    test("a raise reopens the action, and sets the next minimum raise", () => {
        const state = play(preflop([100, 100, 100, 100]), [["raise", 10], ["call"], ["call"]]);
        assert.equal(state.currentBet, 10);
        assert.equal(state.minRaise, 8);
        assert.equal(betting.legalActions(state, 1).minRaiseTo, 18);
        play(state, [["raise", 30]]);
        assert.equal(state.toAct, 2, "everyone answers the re-raise");
        play(state, [["fold"], ["call"], ["call"]]);
        assert.equal(betting.roundOver(state), true);
        assert.equal(state.players.reduce((sum, p) => sum + p.total, 0), 10 + 30 * 3);
    });

    test("an all-in for less than the bet calls what it can, and doesn't change the bet", () => {
        const state = preflop([100, 100, 100, 5]);
        play(state, [["raise", 20]]);
        assert.equal(state.toAct, 3);
        const short = betting.applyAction(state, 3, "call");
        assert.equal(short.action, "allIn");
        assert.equal(short.amount, 5);
        assert.equal(state.currentBet, 20);
        state.toAct = betting.nextToAct(state, 3);
        assert.equal(state.toAct, 0, "the short stack is skipped from now on");
        betting.applyAction(state, 0, "call");
        assert.equal(betting.playerAt(state, 0).bet, 20);
    });

    test("folding to a raise ends it with one player left", () => {
        const state = play(preflop([100, 100, 100, 100]), [["raise", 8], ["fold"], ["fold"], ["fold"]]);
        assert.equal(betting.live(state).length, 1);
        assert.equal(betting.roundOver(state), true);
    });

    test("the second round starts at 0 with the first player left of the dealer", () => {
        const state = play(preflop([100, 100, 100, 100]), [["call"], ["call"], ["call"], ["check"]]);
        betting.newRound(state);
        assert.equal(state.currentBet, 0);
        assert.equal(betting.firstToAct(state, state.dealer), 0);
        assert.equal(betting.legalActions({ ...state, toAct: 0 }, 0).raiseLabel, "bet");
    });

    test("nobody can bet once everyone but one is all in", () => {
        const state = preflop([2, 100, 3]);
        assert.equal(betting.bettingPossible(state), true);
        play(state, [["allIn"], ["allIn"]]);
        assert.equal(betting.bettingPossible(state), false);
    });
});

describe("pots and payouts", () => {
    const ranks = (byseat) => (seat) => byseat[seat] ?? 0;

    test("an all-in makes a side pot only the bigger stacks can win", () => {
        const players = [
            { seat: 0, total: 10, folded: false },
            { seat: 1, total: 30, folded: false },
            { seat: 2, total: 30, folded: false },
        ];
        const pots = betting.buildPots(players);
        assert.deepEqual(pots.map((pot) => [pot.amount, pot.eligible]), [[30, [0, 1, 2]], [40, [1, 2]]]);
        const { payouts } = betting.settlePots(players, { order: [0, 1, 2], rank: ranks({ 0: 9, 1: 5, 2: 1 }) });
        assert.deepEqual(payouts, { 0: 30, 1: 40 });
    });

    test("folded players' chips stay in, but they can't win", () => {
        const players = [
            { seat: 0, total: 20, folded: true },
            { seat: 1, total: 20, folded: false },
            { seat: 2, total: 20, folded: false },
        ];
        const { payouts } = betting.settlePots(players, { order: [0, 1, 2], rank: ranks({ 0: 99, 1: 3, 2: 4 }) });
        assert.deepEqual(payouts, { 2: 60 });
    });

    test("an uncalled bet goes back to whoever made it", () => {
        const players = [
            { seat: 0, total: 30, folded: false },
            { seat: 1, total: 10, folded: true },
        ];
        const { payouts } = betting.settlePots(players, { order: [0, 1], rank: () => 0 });
        assert.deepEqual(payouts, { 0: 40 });
    });

    test("a tie splits the pot, the odd chip to the first left of the dealer", () => {
        const players = [
            { seat: 0, total: 7, folded: false },
            { seat: 1, total: 7, folded: false },
            { seat: 2, total: 7, folded: true },
        ];
        const { payouts } = betting.settlePots(players, { order: [1, 2, 0], rank: ranks({ 0: 5, 1: 5 }) });
        assert.deepEqual(payouts, { 1: 11, 0: 10 });
    });

    test("chips won from a bot pay half; chips from members pay in full", () => {
        const players = [
            { seat: 0, total: 10, folded: false, bot: false },
            { seat: 1, total: 10, folded: false, bot: true },
            { seat: 2, total: 10, folded: false, bot: false },
        ];
        const { payouts, burned } = betting.settlePots(players, { order: [0, 1, 2], rank: ranks({ 0: 9, 1: 1, 2: 2 }), botWinShare: 0.5 });
        assert.deepEqual(payouts, { 0: 25 });
        assert.equal(burned, 5);
    });

    test("a bot that wins keeps it all", () => {
        const players = [
            { seat: 0, total: 10, folded: false, bot: false },
            { seat: 1, total: 10, folded: false, bot: true },
        ];
        const { payouts, burned } = betting.settlePots(players, { order: [0, 1], rank: ranks({ 0: 1, 1: 9 }), botWinShare: 0.5 });
        assert.deepEqual(payouts, { 1: 20 });
        assert.equal(burned, 0);
    });
});

describe("cashing out", () => {
    test("winnings come back as P-PP, the stake as it went in", () => {
        assert.deepEqual(cashOutSplit({ pp: 40, ppp: 20 }, 100), { pp: 40, ppp: 60 });
    });

    test("losses come out of PP first", () => {
        assert.deepEqual(cashOutSplit({ pp: 40, ppp: 20 }, 50), { pp: 30, ppp: 20 });
        assert.deepEqual(cashOutSplit({ pp: 40, ppp: 20 }, 15), { pp: 0, ppp: 15 });
        assert.deepEqual(cashOutSplit({ pp: 40, ppp: 20 }, 0), { pp: 0, ppp: 0 });
    });
});

describe("the bots", () => {
    test("they keep what's made and draw to the rest", () => {
        assert.deepEqual(bots.chooseDiscards(hand("Kc Kd 7h 4s 2c"), "kaveri"), [2, 3, 4]);
        assert.deepEqual(bots.chooseDiscards(hand("Kc Kd 7h 7s 2c"), "kaveri"), [4]);
        assert.deepEqual(bots.chooseDiscards(hand("9c 8d 7h 6s 5c"), "kaveri"), []);
        assert.deepEqual(bots.chooseDiscards(hand("Ah 9h 6h 4h 2c"), "kaveri"), [4]);
        assert.equal(bots.chooseDiscards(hand("Ac Jd 8h 4s 2c"), "kaveri", { random: () => 0.9 }).length, 3);
    });

    test("better hands are stronger", () => {
        const ladder = ["Ac Jd 8h 4s 2c", "Tc Td 8h 4s 2c", "Kc Kd 4h 4s Ac", "7c 7d 7h Ks 2c", "Jc Jd Jh 4s 4c"];
        for (let i = 1; i < ladder.length; i++) assert.ok(bots.handStrength(hand(ladder[i])) > bots.handStrength(hand(ladder[i - 1])));
    });

    test("their personalities: Kaveri folds junk to a big bet, King Loan Shark raises a monster", () => {
        const legal = { canAct: true, toCall: 40, canCheck: false, canCall: true, canRaise: true, minRaiseTo: 80, maxRaiseTo: 200, allInAmount: 200 };
        const junk = { cards: hand("Ac Jd 8h 4s 2c"), beforeDraw: false, legal, pot: 50, opponents: 2 };
        assert.equal(bots.decide("kaveri", junk, () => 0.5).action, "fold");
        const monster = { ...junk, cards: hand("Qc Qd Qh Qs 2c") };
        assert.ok(["raise", "allIn"].includes(bots.decide("shark", monster, () => 0.5).action));
    });

    test("every bot has a line for every event", () => {
        const events = ["check", "call", "bet", "raise", "fold", "allIn", "draw", "standPat", "win", "lose", "leave", "stay", "join", "start"];
        for (const key of Object.keys(POKER.bots)) for (const event of events) assert.ok(LINES[key][event]?.length > 0, `${key} ${event}`);
    });
});

describe("emoji", () => {
    test("exactly one emoji, typed or picked", () => {
        for (const ok of ["😂", "😢", "👍🏽", "👨‍👩‍👧", "❤️", "🇫🇮"]) assert.equal(isSingleEmoji(ok), true, ok);
        for (const bad of ["", "😂😂", "hi", "a😂", "1", null, 5]) assert.equal(isSingleEmoji(bad), false, String(bad));
    });
});

// --- the table, with a fake clock and wallet ---

function fakes({ chance = () => 0.5 } = {}) {
    let now = 1_000_000;
    const timers = new Map();
    let next = 0;
    const wallets = new Map();
    const cashOuts = [];
    const events = [];
    const wallet = {
        async buyIn(user, amount) {
            const w = wallets.get(String(user._id)) ?? { pp: 1000, ppp: 0 };
            if (w.pp + w.ppp < amount) throw new Error("not enough points");
            const pp = Math.min(w.pp, amount);
            w.pp -= pp;
            w.ppp -= amount - pp;
            wallets.set(String(user._id), w);
            return { pp, ppp: amount - pp };
        },
        async cashOut(userId, funds, stack) {
            const back = cashOutSplit(funds, stack);
            const w = wallets.get(String(userId));
            w.pp += back.pp;
            w.ppp += back.ppp;
            cashOuts.push({ userId: String(userId), stack, ...back });
            return back;
        },
    };
    const table = new PokerTable({
        wallet,
        store: { save: async () => {}, remove: async () => {} },
        schedule: (fn, ms) => {
            const id = ++next;
            timers.set(id, { at: now + ms, fn });
            return id;
        },
        cancel: (id) => timers.delete(id),
        now: () => now,
        chance,
        onEvent: (event) => events.push(event),
    });
    async function settle() {
        for (let i = 0; i < 50; i++) {
            const chain = table.chain;
            await chain;
            await new Promise((resolve) => setImmediate(resolve));
            if (chain === table.chain) return;
        }
    }
    // Moves the clock on, running every timer that comes due in order.
    async function advance(ms) {
        const end = now + ms;
        for (;;) {
            await settle();
            const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
            if (!due) break;
            timers.delete(due[0]);
            now = due[1].at;
            due[1].fn();
        }
        now = end;
        await settle();
    }
    const user = (n) => ({ _id: `user${n}`, username: `player${n}` });
    return { table, wallets, cashOuts, events, advance, settle, user, setWallet: (id, w) => wallets.set(id, w) };
}

const kinds = (table) => table.occupied().map((seat) => seat.kind).sort();

describe("the table", () => {
    test("the first member sits down with three bots, and a hand starts", async () => {
        const { table, advance, user } = fakes();
        await table.join(user(1), 60);
        assert.deepEqual(kinds(table), ["bot", "bot", "bot", "human"]);
        assert.equal(table.status, "waiting");
        await advance(POKER.timers.firstHandSeconds * 1000);
        assert.equal(table.status, "playing");
        assert.equal(table.hand.players.length, 4);
        for (const player of table.hand.players) assert.equal(table.hand.cards[player.seat].length, 5);
        const view = table.viewFor("user1");
        const mine = view.seats.find((seat) => seat.userId === "user1");
        assert.ok(mine.cards.every((card) => card.code));
        assert.ok(view.seats.filter((seat) => seat.kind === "bot").every((seat) => seat.cards.every((card) => card.code === null)));
    });

    test("the table opens quietly, then every bot says hello on the first hand, one after another", async () => {
        const { table, events, advance, user } = fakes();
        await table.join(user(1), 60);
        const says = () => events.filter((event) => event.type === "say");
        assert.equal(says().length, 0, "no \"I'm back\" lines when the table first opens");
        await advance(POKER.timers.firstHandSeconds * 1000);
        const hellos = says().filter((event) => event.event === "start");
        assert.deepEqual(hellos.map((event) => event.botKey).sort(), ["kaveri", "maverick", "shark"]);
        for (const hello of hellos) assert.ok(LINES[hello.botKey].start.includes(hello.text));
        assert.deepEqual(hellos.map((event) => event.delayMs ?? 0), [0, 1, 2].map((i) => i * POKER.speech.greetGapMs));
        // No bot moves while the hellos are still up.
        assert.equal(events.filter((event) => event.type === "action" && table.seats[event.seat]?.kind === "bot").length, 0);
        await advance(60 * 1000);
        assert.equal(says().filter((event) => event.event === "start").length, 3, "only the first hand");
    });

    test("table events only ever go to one member when they name a member", async () => {
        const { table, events, advance, user } = fakes({ chance: Math.random });
        await table.join(user(1), 60);
        await advance(5 * 60 * 1000);
        const actions = events.filter((event) => event.type === "action");
        assert.ok(actions.some((event) => event.amount > 0), "some bets were made");
        for (const event of events) if (event.to !== undefined) assert.ok(typeof event.to === "string" && event.to.startsWith("user"), `${event.type} to ${event.to}`);
    });

    test("each bot sits down with one of its own pictures, the same for everyone", async () => {
        for (const roll of [0, 0.5, 0.99]) {
            const { table, user } = fakes({ chance: () => roll });
            await table.join(user(1), 60);
            const bots = table.viewFor("user1").seats.filter((seat) => seat.kind === "bot");
            assert.equal(bots.length, 3);
            for (const bot of bots) assert.ok(POKER.bots[bot.botKey].pictures.includes(bot.picture), `${bot.name}: ${bot.picture}`);
            const kaveri = bots.find((bot) => bot.botKey === "kaveri");
            assert.equal(kaveri.picture, POKER.bots.kaveri.pictures[Math.floor(roll * POKER.bots.kaveri.pictures.length)]);
            assert.equal(table.viewFor(null).seats.find((seat) => seat.botKey === "kaveri").picture, kaveri.picture, "a spectator sees the same one");
        }
    });

    test("a hand plays through to the end, and no chips appear from nowhere", async () => {
        const { table, advance, user } = fakes();
        await table.join(user(1), 60);
        await advance(POKER.timers.firstHandSeconds * 1000);
        const before = table.occupied().reduce((sum, seat) => sum + seat.stack, 0) + table.pot();
        for (let i = 0; i < 600 && table.hand?.phase !== "done"; i++) await advance(1000);
        assert.equal(table.hand.phase, "done");
        const after = table.occupied().reduce((sum, seat) => sum + seat.stack, 0);
        const burned = table.hand.results.burned;
        assert.equal(after + burned, before, `chips: ${before} before, ${after} + ${burned} burned after`);
    });

    test("30 hands with the bots playing for real: no crash, no chips made or lost but the bots' half", async () => {
        const { table, advance, user } = fakes({ chance: Math.random });
        await table.join(user(1), 300);
        let hands = 0;
        let lastId = null;
        for (let step = 0; step < 20000 && hands < 30; step++) {
            const hand = table.hand;
            if (hand && hand.id !== lastId && hand.phase === "bet1") {
                lastId = hand.id;
                hand.before = table.occupied().reduce((sum, seat) => sum + seat.stack, 0) + table.pot();
            }
            await advance(1000);
            if (hand?.phase === "done" && hand.before !== undefined && !hand.checked) {
                hand.checked = true;
                hands += 1;
                const after = hand.players.reduce((sum, player) => sum + player.stack, 0);
                assert.equal(after + hand.results.burned, hand.before, `hand ${hand.number}`);
                for (const player of hand.players) assert.ok(player.stack >= 0);
            }
            if (!table.seatOf("user1")) break;
        }
        assert.ok(hands >= 5, `only ${hands} hands played`);
    });

    test("a second member waits for the hand to end, then takes a bot's seat", async () => {
        const { table, advance, user, events } = fakes();
        await table.join(user(1), 60);
        await advance(POKER.timers.firstHandSeconds * 1000);
        const joined = await table.join(user(2), 60);
        assert.deepEqual(joined, { queued: 1 });
        assert.equal(table.viewFor("user2").you.queued, 1);
        for (let i = 0; i < 40 && table.queue.length; i++) await advance(30 * 1000);
        assert.deepEqual(kinds(table), ["bot", "bot", "human", "human"]);
        assert.ok(events.some((event) => event.type === "botLeft"));
        assert.ok(events.some((event) => event.type === "say" && LINES[event.botKey].leave.includes(event.text)));
    });

    test("members fill the table to six, and the seventh sees their place in the queue", async () => {
        const { table, advance, user } = fakes();
        for (let n = 1; n <= 7; n++) await table.join(user(n), 60);
        await advance(1000);
        assert.deepEqual(kinds(table), Array(6).fill("human"));
        assert.equal(table.viewFor("user7").you.queued, 1);
    });

    test("when members leave, bots come back to four; when all leave, the table resets", async () => {
        const { table, advance, user, cashOuts } = fakes();
        for (let n = 1; n <= 4; n++) await table.join(user(n), 60);
        assert.deepEqual(kinds(table), ["human", "human", "human", "human"]);
        await table.leave("user4");
        await table.leave("user3");
        assert.deepEqual(kinds(table), ["bot", "bot", "human", "human"]);
        await table.leave("user2");
        await table.leave("user1");
        assert.equal(table.status, "empty");
        assert.equal(table.occupied().length, 0);
        assert.equal(cashOuts.length, 4);
        assert.ok(cashOuts.every((row) => row.pp + row.ppp === row.stack));
        await advance(10_000);
        assert.equal(table.status, "empty");
    });

    test("leaving mid-hand folds them and cashes out what's in front of them", async () => {
        const { table, advance, user, cashOuts, wallets } = fakes();
        await table.join(user(1), 60);
        await table.join(user(2), 60);
        await advance(POKER.timers.firstHandSeconds * 1000);
        assert.equal(table.status, "playing");
        const seat = table.seatOf("user2");
        await table.leave("user2");
        assert.equal(betting.playerAt(table.hand, seat.index).folded, true);
        assert.equal(cashOuts.length, 1);
        assert.equal(wallets.get("user2").pp + wallets.get("user2").ppp, 1000 - 60 + cashOuts[0].stack);
    });

    test("a dropped connection folds after the grace period, and leaves between hands", async () => {
        const { table, advance, user, cashOuts } = fakes();
        await table.join(user(1), 60);
        await table.join(user(2), 60);
        await advance(POKER.timers.firstHandSeconds * 1000);
        const seat = table.seatOf("user2");
        await table.disconnect("user2");
        await advance(POKER.timers.reconnectSeconds * 1000 - 1000);
        assert.equal(table.seatOf("user2").connected, false);
        await table.reconnect("user2");
        await advance(5000);
        assert.equal(table.seatOf("user2")?.gone, undefined, "came back in time");
        await table.disconnect("user2");
        await advance(POKER.timers.reconnectSeconds * 1000 + 100);
        if (table.hand?.phase !== "done" && table.hand) assert.equal(betting.playerAt(table.hand, seat.index)?.folded ?? true, true);
        for (let i = 0; i < 40 && table.seatOf("user2"); i++) await advance(30 * 1000);
        assert.equal(table.seatOf("user2"), null);
        assert.ok(cashOuts.some((row) => row.userId === "user2"));
    });

    test("a buy-in out of range, a second seat, or one they can't afford is turned down", async () => {
        const { table, user, setWallet } = fakes();
        await assert.rejects(table.join(user(1), POKER.buyIn.min - 1), /Buy in/);
        await table.join(user(1), 60);
        await assert.rejects(table.join(user(1), 60), /already at the table/);
        setWallet("user9", { pp: 5, ppp: 0 });
        await table.leave("user1");
        await assert.rejects(table.join(user(9), 60), /not enough/);
    });

    test("when the deck runs out in the draw, the discards are shuffled into a new pile", async () => {
        const { table, advance, user, events } = fakes();
        await table.join(user(1), 60);
        await advance(POKER.timers.firstHandSeconds * 1000);
        const hand = table.hand;
        hand.phase = "draw";
        hand.discards = hand.deck.splice(0, hand.deck.length - 1);
        hand.toAct = hand.order[0];
        await table.run(() => table.doDraw(hand.toAct, [0, 1, 2]));
        assert.ok(events.some((event) => event.type === "reshuffle"));
        const all = Object.values(hand.cards).flat().map((card) => card.code);
        assert.equal(new Set(all).size, all.length, "no card dealt twice");
    });

    test("emoji show over the seat, one at a time", async () => {
        const { table, user, events } = fakes();
        await table.join(user(1), 60);
        await table.emoji("user1", "😘");
        assert.ok(events.some((event) => event.type === "emoji" && event.emoji === "😘"));
        await assert.rejects(table.emoji("user1", "😂"), /One at a time/);
        await assert.rejects(table.emoji("user2", "😂"), /Sit down/);
    });
});
