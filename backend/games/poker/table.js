const crypto = require("crypto");
const { POKER } = require("../../../shared/poker/config.js");
const { LINES } = require("../../../shared/poker/lines.js");
const { newDeck, shuffle } = require("./cards");
const { evaluate } = require("./evaluator");
const betting = require("./betting");
const bots = require("./bots");

const { PokerError } = betting;

// Kino Poker's one table (spec): seats, the queue, bots coming and going,
// and each hand of 5-Card Draw from the blinds to the showdown. Everything
// is decided here, on the server: the shuffle, the deal, every action's
// legality, the timers and the payouts. Pages only ever see their own
// cards (viewFor).
//
// It knows nothing about sockets or the database. What it needs comes in:
//   wallet     { buyIn(user, amount) -> funds, cashOut(userId, funds, stack) }
//   store      { save(seat), remove(userId) }: chip stacks kept between hands,
//              so a restart can hand them back (utils/poker.js)
//   schedule   (fn, ms) -> handle, and cancel(handle): timers (fake in tests)
//   random     (max) -> 0..max-1, for the shuffle: crypto.randomInt
//   chance     () -> 0..1, for the bots and their lines: Math.random
//   onChange   () -> called whenever the table changed
//   onEvent    (event) -> { type, ..., to? } for animations, speech and
//              messages to one member (`to`: their user id)
//
// Every change runs through `run`, one at a time, so a timer, a bot and a
// member's click can never get in each other's way, even across awaits.

const SECOND = 1000;
const BOT_KEYS = Object.keys(POKER.bots);

const isHuman = (seat) => seat?.kind === "human";
const isBot = (seat) => seat?.kind === "bot";
// A hand score as one number, for comparing: higher wins.
const scoreNumber = (score) => score.reduce((sum, value, i) => sum + value * 15 ** (6 - i), 0);
const newId = () => crypto.randomBytes(6).toString("hex");

class PokerTable {
    // `timers` and `thinkMs` override POKER.timers and POKER.bot.thinkMs
    // (only the tests, to play quickly).
    // `announce({ userId, profit, hands, best })` hears about a member leaving
    // the table ahead (POKER.announce), for Notifications.
    constructor({ wallet, store, schedule = setTimeout, cancel = clearTimeout, random = crypto.randomInt, chance = Math.random, now = () => Date.now(), onChange = () => {}, onEvent = () => {}, announce = () => {}, timers = {}, thinkMs = POKER.bot.thinkMs } = {}) {
        Object.assign(this, { wallet, store, schedule, cancel, random, chance, now, onChange, onEvent, announce, thinkMs });
        this.timers = { ...POKER.timers, ...timers };
        this.chain = Promise.resolve();
        this.seats = Array(POKER.seats).fill(null);
        this.queue = [];
        this.hand = null;
        this.dealer = -1;
        this.handCount = 0;
        this.status = "empty"; // empty | waiting | playing
        this.nextHandAt = null;
        this.nextHandTimer = null;
        this.turnTimer = null;
        this.botTimer = null;
        this.turn = 0;
        this.lastEmoji = new Map();
    }

    // --- running things one at a time ---

    run(fn) {
        const result = this.chain.then(fn);
        this.chain = result.then(
            () => this.onChange(),
            () => this.onChange()
        );
        return result;
    }

    later(fn, ms) {
        return this.schedule(() => {
            this.run(fn).catch((error) => console.error("Kino Poker:", error.message));
        }, ms);
    }

    event(type, payload = {}) {
        this.onEvent({ type, at: this.now(), ...payload });
    }

    // --- who's where ---

    seatOf(userId) {
        return this.seats.find((seat) => isHuman(seat) && seat.userId === String(userId)) ?? null;
    }

    humans() {
        return this.seats.filter(isHuman);
    }

    occupied() {
        return this.seats.filter(Boolean);
    }

    queuePosition(userId) {
        const index = this.queue.findIndex((entry) => entry.userId === String(userId));
        return index < 0 ? null : index + 1;
    }

    // --- what the bots say ---

    // `event` is a key of LINES (shared/poker/lines.js). Routine moves only
    // sometimes get a line (POKER.speech.chance); the rest always do.
    // `delayMs` holds the bubble back on the page (the hellos, one after
    // another).
    say(seat, event, { delayMs = 0 } = {}) {
        if (!isBot(seat)) return;
        const lines = LINES[seat.botKey]?.[event];
        if (!lines?.length) return;
        const chance = POKER.speech.chance[event] ?? 1;
        if (this.chance() >= chance) return;
        const text = lines[Math.floor(this.chance() * lines.length)];
        this.event("say", { seat: seat.index, botKey: seat.botKey, name: seat.name, event, text, ...(delayMs > 0 ? { delayMs } : {}) });
    }

    // --- members coming and going ---

    // A member sits down (or, if a hand is being played or the table is
    // full, joins the queue) with `amount` chips from their wallet.
    join(user, amount) {
        return this.run(async () => {
            const userId = String(user._id);
            const buyIn = Number(amount);
            if (!Number.isInteger(buyIn) || buyIn < POKER.buyIn.min || buyIn > POKER.buyIn.max) {
                throw new PokerError(`Buy in with a whole number from ${POKER.buyIn.min} to ${POKER.buyIn.max}.`, "BAD_BUY_IN");
            }
            if (this.seatOf(userId)) throw new PokerError("You're already at the table.", "SEATED");
            if (this.queuePosition(userId)) throw new PokerError("You're already in the queue.", "QUEUED");

            const entry = { userId, name: user.username, avatarUrl: user.avatarUrl ?? null, buyIn };
            if (this.status === "empty") {
                await this.seatMember(entry, 0);
                this.status = "waiting";
                this.fillWithBots({ opening: true });
                this.greet = true;
                this.scheduleNextHand(this.timers.firstHandSeconds);
                return { seated: true };
            }
            this.queue.push(entry);
            // Between hands (once the last one's result has cleared), they sit
            // straight down; otherwise when the hand in play is over.
            if (this.status === "waiting" && !this.hand) await this.seatFromQueue();
            return this.seatOf(userId) ? { seated: true } : { queued: this.queuePosition(userId) };
        });
    }

    // Takes the buy-in and sits them at seat `index`.
    async seatMember(entry, index) {
        const funds = await this.wallet.buyIn({ _id: entry.userId, username: entry.name }, entry.buyIn);
        const seat = {
            index,
            kind: "human",
            userId: entry.userId,
            name: entry.name,
            avatarUrl: entry.avatarUrl,
            stack: entry.buyIn,
            funds,
            connected: true,
            graceTimer: null,
            leaving: false,
            // This sitting so far: hands won, and the best hand they won a
            // showdown with (for the notice if they leave ahead).
            record: { hands: 0, best: null, bestScore: -1 },
        };
        this.seats[index] = seat;
        await this.store?.save(seat);
        this.event("seated", { seat: index, name: seat.name });
        return seat;
    }

    // Between hands: members waiting in the queue sit down, each taking a
    // bot's seat while there are bots (a random one leaves), then any empty
    // seat. A buy-in that fails (they've spent the points since) drops them
    // from the queue with a message.
    async seatFromQueue() {
        while (this.queue.length > 0) {
            const botSeats = this.seats.filter(isBot);
            const empty = this.seats.findIndex((seat) => seat === null);
            if (botSeats.length === 0 && empty < 0) break;
            const entry = this.queue.shift();
            let index = empty;
            let leaving = null;
            if (botSeats.length > 0) {
                leaving = botSeats[Math.floor(this.chance() * botSeats.length)];
                index = leaving.index;
            }
            try {
                if (leaving) this.seats[index] = null;
                await this.seatMember(entry, index);
                if (leaving) {
                    this.say({ ...leaving, kind: "bot" }, "leave");
                    this.event("botLeft", { seat: index, botKey: leaving.botKey, name: leaving.name });
                    for (const bot of this.seats.filter(isBot)) this.say(bot, "stay");
                }
            } catch (error) {
                if (leaving) this.seats[index] = leaving;
                this.event("message", { to: entry.userId, text: `Couldn't sit you down: ${error.message}` });
            }
        }
    }

    // Bots come back until there are POKER.minPlayers at the table.
    // When the table is just opening they sit down quietly: they say hello
    // on the first hand instead (startHand).
    fillWithBots({ opening = false } = {}) {
        while (this.occupied().length < POKER.minPlayers) {
            const seated = new Set(this.seats.filter(isBot).map((seat) => seat.botKey));
            const key = BOT_KEYS.find((botKey) => !seated.has(botKey));
            const index = this.seats.findIndex((seat) => seat === null);
            if (!key || index < 0) break;
            const { name, pictures = [], placeholder } = POKER.bots[key];
            // One of its pictures, picked each time it sits down.
            const picture = pictures.length ? pictures[Math.floor(this.chance() * pictures.length)] : null;
            const bot = { index, kind: "bot", botKey: key, name, picture, placeholder, stack: POKER.botStack, connected: true };
            this.seats[index] = bot;
            this.event("botJoined", { seat: index, botKey: key, name: bot.name });
            if (!opening) this.say(bot, "join");
        }
    }

    // Gives a member's chips back to their wallet and frees their seat.
    async cashOut(seat, { keepSeat = false } = {}) {
        if (!seat || seat.cashedOut) return null;
        seat.cashedOut = true;
        const paid = await this.wallet.cashOut(seat.userId, seat.funds, seat.stack);
        await this.store?.remove(seat.userId);
        this.event("cashedOut", { to: seat.userId, stack: seat.stack, paid });
        // Left ahead: a win, for everyone's Notifications. Never holds up the
        // table, and never stops the cash-out if it goes wrong.
        const profit = seat.stack - ((seat.funds?.pp ?? 0) + (seat.funds?.ppp ?? 0));
        if (profit >= POKER.announce.minWin) {
            const { hands = 0, best = null } = seat.record ?? {};
            Promise.resolve()
                .then(() => this.announce({ userId: seat.userId, profit, hands, best }))
                .catch((error) => console.error("Kino Poker couldn't announce a win:", error.message));
        }
        seat.stack = 0;
        if (!keepSeat) this.seats[seat.index] = null;
        return paid;
    }

    // A member leaves: out of the queue, or off the table with their chips.
    // In a hand, they fold first; the seat empties once the hand is over.
    leave(userId) {
        return this.run(async () => {
            const id = String(userId);
            const position = this.queuePosition(id);
            if (position) {
                this.queue.splice(position - 1, 1);
                return { left: "queue" };
            }
            const seat = this.seatOf(id);
            if (!seat) return { left: null };
            const inHand = Boolean(this.hand && this.hand.phase !== "done" && betting.playerAt(this.hand, seat.index));
            if (inHand) await this.foldOutOfTurn(seat.index, "left");
            seat.leaving = true;
            // Their chips now; in a hand, the empty seat goes once it's over.
            const paid = await this.cashOut(seat, { keepSeat: inHand && this.status === "playing" });
            if (this.status === "waiting") await this.tidyBetweenHands();
            return { left: "table", paid };
        });
    }

    // Their last page closed (or the connection dropped). They have
    // this.timers.reconnectSeconds to come back; then they fold, and leave
    // the table with their chips once the hand is over.
    disconnect(userId) {
        return this.run(async () => {
            const seat = this.seatOf(userId);
            if (!seat || !seat.connected) return;
            seat.connected = false;
            seat.graceTimer = this.later(() => this.graceOver(seat.userId), this.timers.reconnectSeconds * SECOND);
        });
    }

    reconnect(userId) {
        return this.run(async () => {
            const seat = this.seatOf(userId);
            if (!seat || seat.connected) return;
            seat.connected = true;
            if (seat.graceTimer) this.cancel(seat.graceTimer);
            seat.graceTimer = null;
        });
    }

    async graceOver(userId) {
        const seat = this.seatOf(userId);
        if (!seat || seat.connected) return;
        seat.gone = true;
        if (this.hand && this.hand.phase !== "done" && betting.playerAt(this.hand, seat.index)) {
            await this.foldOutOfTurn(seat.index, "disconnected");
        } else if (this.status === "waiting") {
            await this.tidyBetweenHands();
        }
    }

    // An account was deleted: off the table, chips forfeit.
    forget(userId) {
        return this.run(async () => {
            const id = String(userId);
            this.queue = this.queue.filter((entry) => entry.userId !== id);
            const seat = this.seatOf(id);
            if (!seat) return;
            if (this.hand && this.hand.phase !== "done" && betting.playerAt(this.hand, seat.index)) await this.foldOutOfTurn(seat.index, "left");
            seat.cashedOut = true;
            seat.leaving = true;
            seat.stack = 0;
            await this.store?.remove(id);
            if (this.status === "waiting") await this.tidyBetweenHands();
        });
    }

    // A member reacting with an emoji over their seat (one at a time).
    emoji(userId, text) {
        return this.run(async () => {
            const seat = this.seatOf(userId);
            if (!seat || seat.leaving) throw new PokerError("Sit down to send emoji.", "NOT_SEATED");
            if (!isSingleEmoji(text)) throw new PokerError("Send one emoji.", "BAD_EMOJI");
            const last = this.lastEmoji.get(seat.userId) ?? 0;
            if (this.now() - last < POKER.emoji.cooldownMs) throw new PokerError("Easy there. One at a time.", "TOO_FAST");
            this.lastEmoji.set(seat.userId, this.now());
            this.event("emoji", { seat: seat.index, emoji: text.trim() });
        });
    }

    // --- between hands ---

    // Clears up after a hand: members who left, dropped out or ran out of
    // chips go (with their chips), bots that ran out buy back in, the queue
    // sits down, and bots fill the table back to POKER.minPlayers. With no
    // members left, the table resets.
    async tidyBetweenHands() {
        // The last hand's result has had its moment.
        this.hand = null;
        for (const seat of this.humans()) {
            if (seat.leaving || seat.cashedOut) {
                this.seats[seat.index] = null;
            } else if (seat.gone || seat.stack <= 0) {
                if (seat.stack <= 0) this.event("message", { to: seat.userId, text: "You're out of chips. Buy in again to keep playing." });
                await this.cashOut(seat);
            }
        }
        for (const seat of this.seats.filter(isBot)) if (seat.stack <= 0) seat.stack = POKER.botStack;

        await this.seatFromQueue();

        if (this.humans().length === 0) {
            this.reset();
            return;
        }
        this.fillWithBots();
        // The result has already shown for nextHandSeconds: deal again soon.
        this.scheduleNextHand(this.timers.dealSeconds);
    }

    reset() {
        for (const timer of [this.nextHandTimer, this.turnTimer, this.botTimer]) if (timer) this.cancel(timer);
        this.seats = Array(POKER.seats).fill(null);
        this.hand = null;
        this.status = "empty";
        this.nextHandAt = null;
        this.greet = false;
        this.event("reset");
    }

    scheduleNextHand(seconds) {
        if (this.nextHandTimer) this.cancel(this.nextHandTimer);
        this.status = "waiting";
        this.nextHandAt = this.now() + seconds * SECOND;
        this.nextHandTimer = this.later(() => this.startHand(), seconds * SECOND);
    }

    // --- a hand ---

    async startHand() {
        this.nextHandTimer = null;
        if (this.humans().length === 0) return this.reset();
        const players = this.occupied().filter((seat) => seat.stack > 0 && !seat.leaving && !seat.gone);
        if (players.length < 2) return this.scheduleNextHand(this.timers.nextHandSeconds);

        // The button moves to the next player round the table.
        const indexes = players.map((seat) => seat.index);
        this.dealer = indexes.find((index) => index > this.dealer) ?? indexes[0];
        const start = indexes.indexOf(this.dealer);
        const order = [...indexes.slice(start + 1), ...indexes.slice(0, start + 1)];

        const hand = {
            id: newId(),
            number: ++this.handCount,
            phase: "bet1",
            dealer: this.dealer,
            order,
            players: players.map((seat) => ({ seat: seat.index, stack: seat.stack, bet: 0, total: 0, folded: false, allIn: false, acted: false, bot: isBot(seat) })),
            cards: {},
            deck: shuffle(newDeck(), this.random),
            discards: [],
            drawn: {},
            lastAction: {},
            toAct: null,
            deadline: null,
            results: null,
        };
        this.hand = hand;
        this.status = "playing";
        this.nextHandAt = null;

        // Heads up, the dealer posts the small blind and acts first.
        const headsUp = order.length === 2;
        const smallSeat = headsUp ? this.dealer : order[0];
        const bigSeat = headsUp ? order[0] : order[1];
        const blinds = betting.postBlinds(hand, { small: POKER.blinds.small, big: POKER.blinds.big, smallSeat, bigSeat });
        hand.lastAction[smallSeat] = `Small blind ${blinds.small.amount}`;
        hand.lastAction[bigSeat] = `Big blind ${blinds.big.amount}`;
        this.syncStacks();

        // The first hand after the table opens: every bot says hello, one
        // after another round the table.
        if (this.greet) {
            this.greet = false;
            const bots = order.map((index) => this.seats[index]).filter(isBot);
            bots.forEach((bot, i) => this.say(bot, "start", { delayMs: i * POKER.speech.greetGapMs }));
            this.greetingUntil = this.now() + Math.max(0, bots.length - 1) * POKER.speech.greetGapMs + POKER.speech.bubbleSeconds * SECOND * 0.5;
        }

        // Five cards each, one at a time round the table from the dealer's left.
        for (let round = 0; round < 5; round++) {
            for (const seat of order) (hand.cards[seat] ??= []).push({ id: newId(), code: hand.deck.pop() });
        }
        this.event("deal", { handId: hand.id, order, dealer: this.dealer });

        hand.toAct = betting.firstToAct(hand, bigSeat);
        this.startTurn();
    }

    // The chips in front of each seat, from the hand.
    syncStacks() {
        for (const player of this.hand?.players ?? []) {
            const seat = this.seats[player.seat];
            if (seat && !seat.cashedOut) seat.stack = player.stack;
        }
    }

    pot() {
        return (this.hand?.players ?? []).reduce((sum, player) => sum + player.total, 0);
    }

    startTurn() {
        const hand = this.hand;
        if (this.turnTimer) this.cancel(this.turnTimer);
        if (this.botTimer) this.cancel(this.botTimer);
        if (hand.toAct === null) return this.endRound();

        const turn = ++this.turn;
        const seconds = hand.phase === "draw" ? this.timers.drawSeconds : this.timers.actSeconds;
        hand.deadline = this.now() + seconds * SECOND;
        this.turnTimer = this.later(() => this.timeUp(turn), seconds * SECOND);

        const seat = this.seats[hand.toAct];
        if (isBot(seat)) {
            const [low, high] = this.thinkMs;
            // While the hellos are still going, a bot waits for them to finish.
            const hello = Math.max(0, (this.greetingUntil ?? 0) - this.now());
            this.botTimer = this.later(() => this.botMove(turn), hello + low + Math.floor(this.chance() * (high - low)));
        }
    }

    // Their time ran out: check if they can, otherwise fold; stand pat in the draw.
    timeUp(turn) {
        if (turn !== this.turn || !this.hand || this.hand.phase === "done") return;
        const seat = this.hand.toAct;
        if (this.hand.phase === "draw") return this.doDraw(seat, []);
        const legal = betting.legalActions(this.hand, seat);
        return this.doAction(seat, legal.canCheck ? "check" : "fold");
    }

    botMove(turn) {
        const hand = this.hand;
        if (turn !== this.turn || !hand || hand.phase === "done") return;
        const seat = this.seats[hand.toAct];
        if (!isBot(seat)) return;
        const cards = hand.cards[seat.index].map((card) => card.code);
        if (hand.phase === "draw") {
            return this.doDraw(seat.index, bots.chooseDiscards(cards, seat.botKey, { maxDraw: POKER.maxDraw, random: this.chance }));
        }
        const legal = betting.legalActions(hand, seat.index);
        const opponents = betting.live(hand).length - 1;
        const choice = bots.decide(seat.botKey, { cards, beforeDraw: hand.phase === "bet1", legal, pot: this.pot(), opponents }, this.chance);
        try {
            return this.doAction(seat.index, choice.action, choice.amount);
        } catch {
            // A move the rules turned down: fall back to the safest one.
            return this.doAction(seat.index, legal.canCheck ? "check" : legal.canCall ? "call" : "fold");
        }
    }

    // A member's betting move.
    act(userId, action, amount) {
        return this.run(async () => {
            const seat = this.seatOf(userId);
            if (!seat || !this.hand || this.hand.phase === "done") throw new PokerError("There's no hand for you to play.", "NO_HAND");
            if (this.hand.phase === "draw") throw new PokerError("It's the draw: pick cards to swap.", "DRAW_PHASE");
            if (this.hand.toAct !== seat.index) throw new PokerError("It isn't your turn.", "NOT_YOUR_TURN");
            return this.doAction(seat.index, action, amount);
        });
    }

    doAction(seatIndex, action, amount) {
        const hand = this.hand;
        const result = betting.applyAction(hand, seatIndex, action, amount);
        const labels = { fold: "Fold", check: "Check", call: `Call ${result.amount}`, bet: `Bet ${result.to}`, raise: `Raise to ${result.to}`, allIn: "All in" };
        hand.lastAction[seatIndex] = labels[result.action];
        this.syncStacks();
        // (`betTo`, not `to`: an event's `to` sends it to one member only.)
        this.event("action", { seat: seatIndex, action: result.action, amount: result.amount, betTo: result.to });
        this.say(this.seats[seatIndex], result.action);
        return this.afterAction(seatIndex);
    }

    // Someone folds when it isn't their turn (they left, or dropped out).
    foldOutOfTurn(seatIndex, why) {
        const hand = this.hand;
        const player = betting.playerAt(hand, seatIndex);
        if (!player || player.folded) return;
        if (hand.phase !== "done" && hand.toAct === seatIndex && hand.phase !== "draw") {
            return this.doAction(seatIndex, "fold");
        }
        player.folded = true;
        player.acted = true;
        hand.lastAction[seatIndex] = why === "left" ? "Left" : "Folded (gone)";
        this.event("action", { seat: seatIndex, action: "fold", amount: 0 });
        if (betting.live(hand).length <= 1) return this.finishHand();
        if (hand.toAct === seatIndex) return this.afterDraw(seatIndex);
        if (hand.phase !== "draw" && betting.roundOver(hand)) return this.endRound();
    }

    afterAction(seatIndex) {
        const hand = this.hand;
        if (betting.live(hand).length <= 1) return this.finishHand();
        hand.toAct = betting.nextToAct(hand, seatIndex);
        return this.startTurn();
    }

    // A betting round is over: the draw after the first, the showdown after
    // the second.
    endRound() {
        const hand = this.hand;
        if (hand.phase === "bet1") {
            hand.phase = "draw";
            hand.toAct = betting.seatAfter(hand, hand.dealer, (player) => !player.folded);
            return this.startTurn();
        }
        return this.finishHand();
    }

    // A member's draw: the indexes (0-4) of the cards they throw away.
    draw(userId, discards) {
        return this.run(async () => {
            const seat = this.seatOf(userId);
            if (!seat || !this.hand || this.hand.phase !== "draw") throw new PokerError("It isn't the draw.", "NOT_DRAW");
            if (this.hand.toAct !== seat.index) throw new PokerError("It isn't your turn to draw.", "NOT_YOUR_TURN");
            return this.doDraw(seat.index, discards);
        });
    }

    doDraw(seatIndex, discards) {
        const hand = this.hand;
        const picks = Array.isArray(discards) ? discards : [];
        if (picks.length > POKER.maxDraw || new Set(picks).size !== picks.length || !picks.every((i) => Number.isInteger(i) && i >= 0 && i < 5)) {
            throw new PokerError(`Pick up to ${POKER.maxDraw} different cards to swap.`, "BAD_DRAW");
        }
        const cards = hand.cards[seatIndex];
        const thrown = [];
        for (const index of [...picks].sort((a, b) => a - b)) {
            // Out of cards: the discards so far are shuffled into a new pile.
            if (hand.deck.length === 0) {
                hand.deck = shuffle(hand.discards, this.random);
                hand.discards = [];
                this.event("reshuffle", { handId: hand.id });
            }
            thrown.push(cards[index].code);
            cards[index] = { id: newId(), code: hand.deck.pop() };
        }
        hand.discards.push(...thrown);
        hand.drawn[seatIndex] = picks.length;
        hand.lastAction[seatIndex] = picks.length ? `Drew ${picks.length}` : "Stands pat";
        this.event("draw", { handId: hand.id, seat: seatIndex, count: picks.length, slots: [...picks].sort((a, b) => a - b) });
        this.say(this.seats[seatIndex], picks.length ? "draw" : "standPat");
        return this.afterDraw(seatIndex);
    }

    // The next player to draw, or the second betting round once all have
    // (skipped if at most one player has chips left to bet with).
    afterDraw(seatIndex) {
        const hand = this.hand;
        const next = betting.seatAfter(hand, seatIndex, (player) => !player.folded && hand.drawn[player.seat] === undefined);
        if (next !== null) {
            hand.toAct = next;
            return this.startTurn();
        }
        hand.phase = "bet2";
        betting.newRound(hand);
        if (!betting.bettingPossible(hand)) return this.finishHand();
        hand.toAct = betting.firstToAct(hand, hand.dealer);
        return this.startTurn();
    }

    // The pot goes to the best hand (or the last one standing), side pots
    // to theirs. Then, a few seconds later, the next hand.
    async finishHand() {
        const hand = this.hand;
        if (this.turnTimer) this.cancel(this.turnTimer);
        if (this.botTimer) this.cancel(this.botTimer);
        const stillIn = betting.live(hand);
        const showdown = stillIn.length > 1;
        const hands = new Map(stillIn.map((player) => [player.seat, evaluate(hand.cards[player.seat].map((card) => card.code))]));

        const { payouts, pots, burned } = betting.settlePots(hand.players, {
            order: hand.order,
            rank: (seat) => (hands.has(seat) ? scoreNumber(hands.get(seat).score) : -1),
            botWinShare: POKER.botWinShare,
        });
        for (const [seat, chips] of Object.entries(payouts)) betting.playerAt(hand, Number(seat)).stack += chips;
        this.syncStacks();

        const winners = Object.entries(payouts)
            .filter(([, chips]) => chips > 0)
            .map(([seat, chips]) => ({ seat: Number(seat), amount: chips, won: chips - (betting.playerAt(hand, Number(seat)).total ?? 0), label: hands.get(Number(seat))?.label ?? null }));
        hand.phase = "done";
        hand.toAct = null;
        hand.deadline = null;
        hand.showdown = showdown;
        hand.results = {
            winners,
            pots: pots.filter((pot) => !pot.uncalled).map((pot) => ({ amount: pot.amount, winners: pot.winners })),
            burned,
            hands: Object.fromEntries([...hands].map(([seat, result]) => [seat, result.label])),
        };
        this.event("win", { handId: hand.id, winners, showdown });

        // Each member's sitting: one more hand won, and their best at a
        // showdown (a hand nobody saw stays secret).
        for (const winner of winners) {
            const seat = this.seats[winner.seat];
            if (!isHuman(seat) || winner.won <= 0 || !seat.record) continue;
            seat.record.hands += 1;
            const result = hands.get(winner.seat);
            if (showdown && result && scoreNumber(result.score) > seat.record.bestScore) {
                seat.record.best = result.label;
                seat.record.bestScore = scoreNumber(result.score);
            }
        }

        // Who won and who lost, in the bots' words.
        const winnerSeats = new Set(winners.filter((w) => w.won > 0).map((w) => w.seat));
        for (const player of hand.players) {
            const seat = this.seats[player.seat];
            if (!isBot(seat)) continue;
            if (winnerSeats.has(player.seat)) this.say(seat, "win");
            else if (showdown && !player.folded) this.say(seat, "lose");
        }

        for (const seat of this.humans()) if (!seat.cashedOut) await this.store?.save(seat);
        this.status = "waiting";
        this.nextHandAt = this.now() + this.timers.nextHandSeconds * SECOND;
        this.nextHandTimer = this.later(async () => {
            this.nextHandTimer = null;
            await this.tidyBetweenHands();
        }, this.timers.nextHandSeconds * SECOND);
    }

    // --- what a page sees ---

    // The table as `userId` sees it: their own cards, nobody else's until a
    // showdown, and what they're allowed to do right now.
    viewFor(userId) {
        const id = userId ? String(userId) : null;
        const hand = this.hand;
        const mine = id ? this.seatOf(id) : null;
        const reveal = hand?.phase === "done" && hand.showdown;

        const seats = this.occupied().map((seat) => {
            const player = hand ? betting.playerAt(hand, seat.index) : null;
            const cards = hand?.cards[seat.index] ?? [];
            const visible = player && (seat === mine || (reveal && !player.folded));
            return {
                seat: seat.index,
                kind: seat.kind,
                name: seat.name,
                avatarUrl: seat.avatarUrl ?? null,
                botKey: seat.botKey ?? null,
                picture: seat.picture ?? null,
                placeholder: seat.placeholder ?? null,
                userId: seat.userId ?? null,
                stack: seat.stack,
                connected: seat.connected !== false,
                leaving: Boolean(seat.leaving),
                inHand: Boolean(player),
                folded: Boolean(player?.folded),
                allIn: Boolean(player?.allIn),
                bet: player?.bet ?? 0,
                isDealer: hand ? hand.dealer === seat.index : false,
                isTurn: hand ? hand.toAct === seat.index : false,
                lastAction: hand?.lastAction[seat.index] ?? null,
                drew: hand?.drawn[seat.index] ?? null,
                cards: player && !player.folded ? cards.map((card) => ({ id: card.id, code: visible ? card.code : null })) : [],
                handLabel: reveal && player && !player.folded ? (hand.results?.hands[seat.index] ?? null) : null,
            };
        });

        const myTurn = Boolean(mine && hand && hand.phase !== "done" && hand.toAct === mine.index);
        return {
            serverNow: this.now(),
            status: this.status,
            nextHandAt: this.nextHandAt,
            seats,
            queue: this.queue.length,
            hand: hand
                ? {
                    id: hand.id,
                    number: hand.number,
                    phase: hand.phase,
                    pot: this.pot(),
                    currentBet: hand.currentBet,
                    toAct: hand.toAct,
                    deadline: hand.deadline,
                    dealer: hand.dealer,
                    order: hand.order,
                    results: hand.phase === "done" ? hand.results : null,
                }
                : null,
            you: {
                seat: mine ? mine.index : null,
                queued: id ? this.queuePosition(id) : null,
                stack: mine?.stack ?? 0,
                myTurn,
                legal: myTurn && hand.phase !== "draw" ? betting.legalActions(hand, mine.index) : null,
                mustDraw: myTurn && hand.phase === "draw",
                maxDraw: POKER.maxDraw,
            },
        };
    }

    // For the "Kino Poker is live" card at the top of Notifications: the
    // members at the table, how many bots and how many waiting, and whether
    // `userId` is sitting there or queued. Null while no member is playing.
    liveFor(userId) {
        const members = this.humans().filter((seat) => !seat.leaving && !seat.gone);
        if (members.length === 0) return null;
        const id = userId ? String(userId) : null;
        return {
            members: members.map((seat) => ({ _id: seat.userId, username: seat.name, avatarUrl: seat.avatarUrl ?? null })),
            bots: this.seats.filter(isBot).length,
            queue: this.queue.length,
            seats: POKER.seats,
            playing: this.status === "playing",
            you: id && this.seatOf(id) ? "seated" : id && this.queuePosition(id) ? "queued" : null,
        };
    }

    // How busy the table is, for the Games page.
    summary() {
        return {
            members: this.humans().filter((seat) => !seat.leaving).length,
            bots: this.seats.filter(isBot).length,
            queue: this.queue.length,
            seats: POKER.seats,
            playing: this.status === "playing",
        };
    }
}

// Exactly one emoji (with any skin tone, variation or ZWJ joins): one
// grapheme that's pictographic, nothing else.
function isSingleEmoji(value) {
    if (typeof value !== "string") return false;
    const text = value.trim();
    if (!text || text.length > 32) return false;
    const graphemes = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)];
    if (graphemes.length !== 1) return false;
    return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(text) && !/[\p{L}\p{N}]/u.test(text.replace(/\p{Regional_Indicator}/gu, ""));
}

module.exports = { PokerTable, isSingleEmoji, scoreNumber };
