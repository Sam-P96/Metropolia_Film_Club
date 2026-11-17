const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const db = require("../../utils/crash");
const { noteCrashResults } = require("../../utils/notify");
const { playDay } = require("../../utils/wallet");
const { MEMBER_FIELDS, userSummary } = require("../../utils/serialize");
const { CRASH, CrashRound, cashOutsAt, payoutFor, secureRandom } = require("./engine");
const { CRASH_RULES, autoTarget, roundKindFor } = require("../../../shared/crash/rules.js");

// Crash's rooms, lobby and live rounds, all in the server's memory (one
// server): rooms of up to 4 members, up to 3 at once, plus rooms of one for
// rounds played alone ("Play alone", private, never listed). Everyone in a
// room plays the same round: one multiplier path, made a tick at a time
// (engine.js) and sent to the room as it's made, 10 times a second.
//
// The server decides everything: when a round starts (when everyone in the
// room is ready), every tick, every cash-out (at the multiplier when the
// request arrives), and every balance change (utils/crash.js, through the
// wallet). Pages only show it and ask.
//
// Socket.IO channels (games/crash/live.js joins sockets to them):
//   crash:lobby          everyone on the game's page: "crash:lobby", the rooms
//   crash:room:<id>      a room's members: "crash:room", "crash:tick", "crash:cashout"
//   crash:user:<userId>  one member's pages: "crash:me", "crash:kicked", "crash:error"

class CrashError extends Error {}

const LOBBY = "crash:lobby";
const roomChannel = (id) => `crash:room:${id}`;
const userChannel = (id) => `crash:user:${id}`;

// `io`: the Socket.IO server (or a stand-in, in tests). `random`, `config`,
// `countdownMs` and `graceMs` can be changed for tests.
function createCrashRooms({ io, random = secureRandom(), config = CRASH, countdownMs = CRASH_RULES.countdownMs, graceMs = 8000 } = {}) {
    const rooms = new Map(); // id -> room
    const where = new Map(); // userId -> the id of the room they're in
    const sockets = new Map(); // userId -> Set of their socket ids
    const statuses = new Map(); // userId -> db.statusOf
    const members = new Map(); // userId -> their name and picture
    const goneTimers = new Map(); // userId -> the timer that takes them out of their room

    const isLive = (run) => run && (run.status === "starting" || run.status === "playing");
    const inRun = (run, userId) => isLive(run) && run.players.some((player) => player.userId === userId);

    // ---- What everyone sees ----

    function roundView(run) {
        return {
            id: String(run.id),
            kind: run.kind,
            status: run.status,
            startsAt: run.startsAt,
            tick: run.engine.tick,
            multiplier: run.engine.multiplier,
            // The ticks so far, so a page that joins late can draw the line.
            path: run.engine.path,
            endedBy: run.endedBy,
            config: { tickMs: config.tickMs, cap: config.cap, maxTicks: config.maxTicks, start: config.start },
            players: run.players.map((player) => ({
                userId: player.userId,
                user: player.user,
                bet: player.bet,
                autoAt: player.autoAt,
                cashedAt: player.cashedAt,
                cashedTick: player.cashedTick,
                auto: player.auto,
                payout: player.payout ? player.payout.total : null,
            })),
        };
    }

    function roomView(room) {
        const size = room.players.length;
        return {
            id: room.id,
            private: room.private,
            players: room.players.map((player) => ({
                userId: player.userId,
                user: player.user,
                bet: player.bet,
                autoAt: player.autoAt,
                ready: player.ready,
                connected: sockets.has(player.userId),
                canReady: !db.blockedFor(statuses.get(player.userId), player.bet, room.private ? 1 : size),
            })),
            round: room.round ? roundView(room.round) : null,
            last: room.last,
        };
    }

    function lobbyView() {
        return [...rooms.values()]
            .filter((room) => !room.private)
            .map((room) => ({
                id: room.id,
                players: room.players.map((player) => ({ userId: player.userId, user: player.user, ready: player.ready })),
                playing: isLive(room.round),
                full: room.players.length >= CRASH_RULES.roomSize,
            }));
    }

    function meView(userId) {
        const status = statuses.get(userId) ?? null;
        const roomId = where.get(userId) ?? null;
        const room = roomId ? rooms.get(roomId) : null;
        const player = room?.players.find((entry) => entry.userId === userId);
        return {
            ...status,
            room: roomId,
            blocked: player ? db.blockedFor(status, player.bet, room.private ? 1 : room.players.length) : null,
        };
    }

    const sendLobby = () => io.to(LOBBY).emit("crash:lobby", lobbyView());
    const sendRoom = (room) => io.to(roomChannel(room.id)).emit("crash:room", roomView(room));
    const sendMe = (userId) => io.to(userChannel(userId)).emit("crash:me", meView(userId));
    const sendRoomAndMe = (room) => {
        sendRoom(room);
        for (const player of room.players) sendMe(player.userId);
    };

    async function refresh(userId) {
        statuses.set(userId, await db.statusOf(userId));
    }

    async function know(userId) {
        if (members.has(userId)) return;
        const user = await User.findById(userId).select(MEMBER_FIELDS).lean();
        if (!user) throw new CrashError("That member doesn't exist any more.");
        const { username, avatarUrl, cosmetics } = userSummary(user);
        members.set(userId, { _id: userId, username, avatarUrl, cosmetics });
    }

    // ---- Rooms ----

    function newRoom(isPrivate) {
        const room = { id: crypto.randomBytes(5).toString("hex"), private: isPrivate, players: [], round: null, last: null };
        rooms.set(room.id, room);
        return room;
    }

    function addPlayer(room, userId, { bet = null, autoAt = null } = {}) {
        const status = statuses.get(userId);
        room.players.push({
            userId,
            user: members.get(userId),
            bet: bet ?? Math.min(status?.maxBet ?? 1, 10),
            autoAt,
            ready: false,
        });
        where.set(userId, room.id);
        io.in(userChannel(userId)).socketsJoin(roomChannel(room.id));
    }

    // Out of the room (the round they're in, if any, goes on without them
    // needing to be there). The room closes when the last one leaves.
    function removePlayer(room, userId) {
        room.players = room.players.filter((player) => player.userId !== userId);
        where.delete(userId);
        io.in(userChannel(userId)).socketsLeave(roomChannel(room.id));
        if (room.players.length === 0 && !isLive(room.round)) rooms.delete(room.id);
    }

    function roomOf(userId) {
        const room = rooms.get(where.get(userId));
        if (!room) throw new CrashError("You're not in a room.");
        return room;
    }

    // After the room changed: anyone ready who no longer can be (say, a
    // room dropped below 4 and they have no solo rounds) isn't, and if
    // everyone left is ready, the round starts.
    function recheck(room) {
        for (const player of room.players) {
            if (player.ready && db.blockedFor(statuses.get(player.userId), player.bet, room.private ? 1 : room.players.length)) player.ready = false;
        }
        maybeStart(room);
    }

    function maybeStart(room) {
        if (isLive(room.round) || room.players.length === 0) return;
        if (room.players.every((player) => player.ready)) {
            startRound(room).catch((error) => console.error("Crash couldn't start a round:", error));
        }
    }

    // ---- A round ----

    async function startRound(room) {
        const day = playDay();
        const kind = room.private ? "solo" : roundKindFor(room.players.length);
        const run = {
            id: new mongoose.Types.ObjectId(),
            kind,
            day,
            status: "starting",
            startsAt: null,
            endedBy: null,
            engine: new CrashRound(random, config),
            players: room.players.map((player) => ({
                userId: player.userId,
                user: player.user,
                bet: player.bet,
                autoAt: player.autoAt,
                paid: null,
                claimed: false,
                cashedAt: null,
                cashedTick: null,
                auto: false,
                payout: null,
            })),
            credits: [],
            timer: null,
        };
        // Taken now, so nothing else starts a round here meanwhile.
        room.round = run;
        sendRoom(room);
        sendLobby();

        // Everyone's play and bet, all or nothing.
        let failed = null;
        for (const player of run.players) {
            try {
                await db.claimPlay(player.userId, kind, day);
                player.claimed = true;
                player.paid = await db.takeBet(player.userId, player.bet, run.id);
            } catch (error) {
                failed = { player, error };
                break;
            }
        }
        if (!failed) {
            try {
                await db.startRound({ room: room.id, isPrivate: room.private, kind, day }, run.players, run.id);
            } catch (error) {
                failed = { player: null, error };
            }
        }

        if (failed) {
            for (const player of run.players) {
                if (player.paid) await db.giveBack(player.userId, player.paid, run.id).catch((error) => console.error("Crash couldn't hand a bet back:", error));
                if (player.claimed) await db.releasePlay(player.userId, kind, day).catch(() => {});
            }
            room.round = null;
            if (failed.player) {
                const entry = room.players.find((player) => player.userId === failed.player.userId);
                if (entry) entry.ready = false;
                io.to(userChannel(failed.player.userId)).emit("crash:error", { message: failed.error.message ?? "Your bet couldn't be taken." });
                await refresh(failed.player.userId).catch(() => {});
            } else {
                console.error("Crash couldn't save a round:", failed.error);
                for (const player of room.players) player.ready = false;
            }
            sendRoomAndMe(room);
            sendLobby();
            return;
        }

        for (const player of run.players) {
            await refresh(player.userId).catch(() => {});
            sendMe(player.userId);
        }
        run.startsAt = Date.now() + countdownMs;
        sendRoom(room);
        setTimeout(() => begin(room, run), countdownMs);
    }

    function begin(room, run) {
        run.status = "playing";
        sendRoom(room);
        sendLobby();
        run.timer = setInterval(() => tick(room, run), config.tickMs);
    }

    // A cash-out at `multiplier`: settled at once (so it shows straight
    // away), paid in the background, all paid before the round's summary.
    function settle(run, player, multiplier, tickNumber, auto) {
        player.cashedAt = multiplier;
        player.cashedTick = tickNumber;
        player.auto = auto;
        player.payout = payoutFor(player.paid, multiplier);
        run.credits.push(
            db
                .payCashOut(player.userId, player.paid, multiplier, run.id)
                .then(() => refresh(player.userId))
                .then(() => sendMe(player.userId))
                .catch((error) => console.error("Crash couldn't pay a cash-out:", error))
        );
        return { userId: player.userId, multiplier, tick: tickNumber, auto, payout: player.payout.total };
    }

    function tick(room, run) {
        const step = run.engine.step();
        if (!step) return;
        const riding = run.players.filter((player) => player.cashedAt === null);
        const cashouts = cashOutsAt(riding, step).map(({ player, multiplier }) => settle(run, player, multiplier, step.tick, true));
        io.to(roomChannel(room.id)).emit("crash:tick", {
            roomId: room.id,
            roundId: String(run.id),
            tick: step.tick,
            multiplier: step.multiplier,
            ended: step.ended,
            cashouts,
        });
        if (step.ended) end(room, run).catch((error) => console.error("Crash couldn't finish a round:", error));
    }

    async function end(room, run) {
        clearInterval(run.timer);
        run.status = "over";
        run.endedBy = run.engine.ended;
        for (const player of run.players) {
            if (player.cashedAt === null) player.payout = { pp: 0, ppp: 0, total: 0 };
        }

        await Promise.allSettled(run.credits);
        await db
            .finishRound(run.id, { path: run.engine.path, ticks: run.engine.tick, endedBy: run.endedBy, players: run.players })
            .catch((error) => console.error("Crash couldn't save a round:", error));
        // Big wins to everyone, the rest to followers. Never holds the room up.
        noteCrashResults(run.players, run.endedBy).catch((error) => console.error("Crash couldn't send its notifications:", error));

        const best = run.players.reduce((top, player) => (player.cashedAt !== null && (!top || player.cashedAt > top.cashedAt) ? player : top), null);
        room.last = {
            roundId: String(run.id),
            kind: run.kind,
            endedBy: run.endedBy,
            multiplier: run.engine.multiplier,
            ticks: run.engine.tick,
            best: best ? best.userId : null,
            players: run.players.map((player) => ({
                userId: player.userId,
                user: player.user,
                bet: player.bet,
                cashedAt: player.cashedAt,
                auto: player.auto,
                payout: player.payout.total,
                net: player.payout.total - player.bet,
            })),
        };
        for (const player of room.players) player.ready = false;

        for (const player of run.players) await refresh(player.userId).catch(() => {});

        // Who goes: anyone who left their page in the round, and anyone with
        // no plays they can use here (back to the lobby).
        for (const player of [...room.players]) {
            if (!sockets.has(player.userId)) {
                removePlayer(room, player.userId);
                continue;
            }
            const left = statuses.get(player.userId)?.left;
            const noneLeft = !left || left.total < 1 || (room.private && left.solo < 1);
            if (noneLeft) {
                removePlayer(room, player.userId);
                io.to(userChannel(player.userId)).emit("crash:kicked", {
                    message: !left || left.total < 1 ? "That was your last round today. More at 12:00." : "No solo rounds left today: join a room of 4 for more.",
                });
            }
        }
        if (room.players.length === 0) rooms.delete(room.id);
        else sendRoom(room);
        for (const player of run.players) sendMe(player.userId);
        sendLobby();
    }

    // ---- What players do ----

    // A page opening the game: it hears the lobby, its member's own news,
    // and their room's, if they're in one. Resolves to everything to show.
    async function hello(socket) {
        const userId = String(socket.data.user._id);
        clearTimeout(goneTimers.get(userId));
        goneTimers.delete(userId);
        if (!sockets.has(userId)) sockets.set(userId, new Set());
        sockets.get(userId).add(socket.id);
        socket.join(LOBBY);
        socket.join(userChannel(userId));
        await know(userId);
        await refresh(userId);
        const room = rooms.get(where.get(userId));
        if (room) {
            socket.join(roomChannel(room.id));
            sendRoom(room);
        }
        return { lobby: lobbyView(), room: room ? roomView(room) : null, me: meView(userId) };
    }

    // A page closed. Once a member has none open (for a few seconds, so a
    // reload doesn't count), they leave their room, unless they're in its
    // round: then they stay in it (their auto-cash-out still works) and go
    // when it ends.
    function goodbye(socket) {
        const userId = String(socket.data.user._id);
        const mine = sockets.get(userId);
        if (!mine) return;
        mine.delete(socket.id);
        if (mine.size > 0) return;
        sockets.delete(userId);
        clearTimeout(goneTimers.get(userId));
        goneTimers.set(
            userId,
            setTimeout(() => {
                goneTimers.delete(userId);
                if (sockets.has(userId)) return;
                const room = rooms.get(where.get(userId));
                if (!room || inRun(room.round, userId)) return;
                removePlayer(room, userId);
                if (rooms.has(room.id)) {
                    recheck(room);
                    sendRoomAndMe(room);
                }
                sendLobby();
            }, graceMs)
        );
    }

    async function create(userId) {
        if (where.has(userId)) throw new CrashError("You're in a room already: leave it first.");
        const open = [...rooms.values()].filter((room) => !room.private).length;
        if (open >= CRASH_RULES.maxRooms) throw new CrashError(`There are ${CRASH_RULES.maxRooms} rooms already: join one, or wait for one to close.`);
        await know(userId);
        await refresh(userId);
        if (statuses.get(userId).banned) throw new CrashError(statuses.get(userId).banned);
        const room = newRoom(false);
        addPlayer(room, userId);
        sendRoomAndMe(room);
        sendLobby();
        return roomView(room);
    }

    async function join(userId, roomId) {
        if (where.has(userId)) throw new CrashError("You're in a room already: leave it first.");
        const room = rooms.get(String(roomId ?? ""));
        if (!room || room.private) throw new CrashError("That room has closed.");
        if (room.players.length >= CRASH_RULES.roomSize) throw new CrashError("That room is full.");
        await know(userId);
        await refresh(userId);
        if (statuses.get(userId).banned) throw new CrashError(statuses.get(userId).banned);
        addPlayer(room, userId);
        recheck(room);
        sendRoomAndMe(room);
        sendLobby();
        return roomView(room);
    }

    function leave(userId) {
        const room = roomOf(userId);
        const player = isLive(room.round) ? room.round.players.find((entry) => entry.userId === userId) : null;
        if (player && player.cashedAt === null) throw new CrashError("You're in this round: cash out, or ride it out, first.");
        removePlayer(room, userId);
        if (rooms.has(room.id)) {
            recheck(room);
            sendRoomAndMe(room);
        }
        sendMe(userId);
        sendLobby();
    }

    function checkBet(bet) {
        const number = Number(bet);
        if (!Number.isInteger(number) || number < CRASH_RULES.minBet) throw new CrashError("A bet is a whole number of points, at least 1.");
        return number;
    }

    // A new bet (and auto-cash-out target, or null): changing it un-readies.
    function setBet(userId, { bet, autoAt = null } = {}) {
        const room = roomOf(userId);
        if (isLive(room.round)) throw new CrashError("The round has started: bets are set until it's over.");
        const player = room.players.find((entry) => entry.userId === userId);
        player.bet = checkBet(bet);
        player.autoAt = autoTarget(autoAt);
        player.ready = false;
        sendRoomAndMe(room);
        sendLobby();
    }

    // Ready (with the bet and target, if given) or not. When everyone in the
    // room is ready, the round starts; alone in a room, straight away.
    async function ready(userId, { ready: on = true, bet, autoAt } = {}) {
        const room = roomOf(userId);
        if (isLive(room.round)) throw new CrashError("The round has started: wait for the next one.");
        const player = room.players.find((entry) => entry.userId === userId);
        if (bet !== undefined) {
            player.bet = checkBet(bet);
            player.autoAt = autoTarget(autoAt);
        }
        if (on) {
            await refresh(userId);
            if (isLive(room.round)) throw new CrashError("The round has started: wait for the next one.");
            const blocked = db.blockedFor(statuses.get(userId), player.bet, room.private ? 1 : room.players.length);
            if (blocked) {
                player.ready = false;
                sendRoomAndMe(room);
                throw new CrashError(blocked);
            }
        }
        player.ready = Boolean(on);
        sendRoomAndMe(room);
        sendLobby();
        maybeStart(room);
    }

    // Play alone: out of their room (if they're in one) and straight into a
    // round of their own, a solo round.
    async function solo(userId, { bet, autoAt = null } = {}) {
        const amount = checkBet(bet);
        const current = rooms.get(where.get(userId));
        if (current && isLive(current.round) && inRun(current.round, userId)) throw new CrashError("You're in this round: wait for it to end.");
        await know(userId);
        await refresh(userId);
        const blocked = db.blockedFor(statuses.get(userId), amount, 1);
        if (blocked) throw new CrashError(blocked);
        if (current) {
            removePlayer(current, userId);
            if (rooms.has(current.id)) {
                recheck(current);
                sendRoomAndMe(current);
            }
        }
        const room = newRoom(true);
        addPlayer(room, userId, { bet: amount, autoAt: autoTarget(autoAt) });
        room.players[0].ready = true;
        sendRoomAndMe(room);
        sendLobby();
        maybeStart(room);
        return roomView(room);
    }

    // Cash out now, at the multiplier as the server has it at this moment.
    function cashOut(userId) {
        const room = roomOf(userId);
        const run = room.round;
        if (!run || run.status !== "playing" || run.engine.ended) throw new CrashError(run?.status === "starting" ? "The round hasn't started yet." : "There's no round to cash out of.");
        const player = run.players.find((entry) => entry.userId === userId);
        if (!player) throw new CrashError("You're not in this round.");
        if (player.cashedAt !== null) throw new CrashError("You've cashed out already.");
        const cashout = settle(run, player, run.engine.multiplier, run.engine.tick, false);
        io.to(roomChannel(room.id)).emit("crash:cashout", { roomId: room.id, roundId: String(run.id), ...cashout });
        return cashout;
    }

    // The developer tool reset their day: their page hears it.
    async function resetMe(userId) {
        await refresh(userId);
        const room = rooms.get(where.get(userId));
        if (room) sendRoom(room);
        sendMe(userId);
    }

    // For tests: stop every round's clock.
    function stopAll() {
        for (const room of rooms.values()) clearInterval(room.round?.timer);
        for (const timer of goneTimers.values()) clearTimeout(timer);
    }

    return { CrashError, hello, goodbye, create, join, leave, setBet, ready, solo, cashOut, resetMe, stopAll, lobbyView, rooms };
}

module.exports = { CrashError, createCrashRooms };
