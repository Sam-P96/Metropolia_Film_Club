const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const db = require("../../utils/crash");
const { noteCrashInvite, noteCrashResults } = require("../../utils/notify");
const { playDay } = require("../../utils/wallet");
const { MEMBER_FIELDS, userSummary } = require("../../utils/serialize");
const { CRASH, CrashRound, cashOutsAt, payoutFor, secureRandom } = require("./engine");
const { CRASH_RULES, autoTarget, isProtected, roundKindFor } = require("../../../shared/crash/rules.js");
const ORCA_LINES = require("../../data/lordGangOrcaScripts").crashAllIn;

// Crash's rooms, lobby and live rounds, all in the server's memory (one
// server): rooms of up to 30 members, up to 3 at once, plus rooms of one for
// rounds played alone ("Play alone", private, never listed). Everyone in a
// round plays the same one: one multiplier path, made a tick at a time
// (engine.js) and sent to the room as it's made, 10 times a second.
//
// Everyone in a room is a player or a spectator. Spectators sit rounds out:
// they watch, don't take one of the 30 seats, and don't count when the room
// waits for everyone to be ready. Anyone can switch, between rounds too.
//
// A round starts as soon as every player in the room is ready. Otherwise
// the first one ready starts a countdown (CRASH_RULES.readyMs). It never
// starts a round by itself: once it ends, any ready player who can play a
// round that size can press Start Game. If others are ready too, they get
// a prompt (CRASH_RULES.offerMs) to join the smaller game, and it starts
// once they've all answered, or when time's up, with whoever said yes.
// Anyone who doesn't answer sits it out: a smaller round can mean fewer
// rounds a day and no half back, so nobody's put in one without a yes.
//
// Members in a room can invite others (a notification with Play and
// Spectate). Every open room is shown at the top of everyone's
// Notifications (liveRooms, and "crash:lobby" for the page to keep it live).
//
// The more players a round starts with, the more rounds a day they can
// play (shared/crash/rules.js roundsPerDay), and a round of 5 or more is
// protected: half of every loss comes back. Once someone's rounds alone are used up,
// Lord Gang Orca offers one more, once a day: alone, all in (allIn below).
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
// `countdownMs`, `readyMs`, `offerMs` and `graceMs` can be changed for tests.
function createCrashRooms({
    io,
    random = secureRandom(),
    config = CRASH,
    countdownMs = CRASH_RULES.countdownMs,
    readyMs = CRASH_RULES.readyMs,
    offerMs = CRASH_RULES.offerMs,
    graceMs = 8000,
} = {}) {
    const rooms = new Map(); // id -> room
    const where = new Map(); // userId -> the id of the room they're in
    const sockets = new Map(); // userId -> Set of their socket ids
    const statuses = new Map(); // userId -> db.statusOf
    const members = new Map(); // userId -> their name and picture
    const goneTimers = new Map(); // userId -> the timer that takes them out of their room

    const isLive = (run) => run && (run.status === "starting" || run.status === "playing");
    const inRun = (run, userId) => isLive(run) && run.players.some((player) => player.userId === userId);
    // The room's players, without its spectators, and how many a round
    // there would be (a room played alone is always 1).
    const seatedOf = (room) => room.players.filter((player) => !player.spectating);
    const sizeOf = (room) => (room.private ? 1 : seatedOf(room).length);

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
        const size = sizeOf(room);
        const offer = room.offer;
        return {
            id: room.id,
            private: room.private,
            players: room.players.map((player) => ({
                userId: player.userId,
                user: player.user,
                bet: player.bet,
                autoAt: player.autoAt,
                ready: player.ready,
                spectating: player.spectating,
                connected: sockets.has(player.userId),
                canReady: !player.spectating && !db.blockedFor(statuses.get(player.userId), player.bet, size),
            })),
            round: room.round ? roundView(room.round) : null,
            last: room.last,
            // When the ready countdown ends, or null.
            countdownEndsAt: room.countdown?.endsAt ?? null,
            // The countdown has ended without everyone ready: the ready ones
            // can press Start Game.
            startable: Boolean(room.startable),
            // Someone pressed Start Game: who, the most players it can have
            // (everyone ready when they pressed it), when time's up, who was
            // asked to join it, and who has answered, { userId: "yes" | "no" }.
            offer: offer
                ? { by: offer.by, size: offer.size, endsAt: offer.endsAt, asked: [...offer.asked], answers: Object.fromEntries(offer.answers) }
                : null,
        };
    }

    // The open rooms (not rooms played alone), for the lobby and the top of
    // everyone's Notifications: who's playing, who's watching, and whether
    // a round is on.
    function lobbyView() {
        return [...rooms.values()]
            .filter((room) => !room.private)
            .map((room) => {
                const seated = seatedOf(room);
                return {
                    id: room.id,
                    players: seated.map((player) => ({ userId: player.userId, user: player.user, ready: player.ready })),
                    spectators: room.players.filter((player) => player.spectating).map((player) => ({ userId: player.userId, user: player.user })),
                    playing: Boolean(isLive(room.round)),
                    full: seated.length >= CRASH_RULES.roomSize,
                };
            });
    }

    function meView(userId) {
        const status = statuses.get(userId) ?? null;
        const roomId = where.get(userId) ?? null;
        const room = roomId ? rooms.get(roomId) : null;
        const player = room?.players.find((entry) => entry.userId === userId);
        return {
            ...status,
            room: roomId,
            blocked: player && !player.spectating ? db.blockedFor(status, player.bet, sizeOf(room)) : null,
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
        // `invited`: who each member has invited from here, userId -> Set.
        const room = { id: crypto.randomBytes(5).toString("hex"), private: isPrivate, players: [], round: null, last: null, invited: new Map() };
        rooms.set(room.id, room);
        return room;
    }

    // Into the room, as a player or (`spectating`) a spectator.
    function addPlayer(room, userId, { bet = null, autoAt = null, spectating = false } = {}) {
        const status = statuses.get(userId);
        room.players.push({
            userId,
            user: members.get(userId),
            bet: bet ?? Math.min(status?.maxBet ?? 1, 10),
            autoAt,
            ready: false,
            spectating,
        });
        where.set(userId, room.id);
        io.in(userChannel(userId)).socketsJoin(roomChannel(room.id));
    }

    // Out of the room (the round they're in, if any, goes on without them
    // needing to be there). The room closes when the last one leaves,
    // spectators included.
    function removePlayer(room, userId) {
        room.players = room.players.filter((player) => player.userId !== userId);
        where.delete(userId);
        io.in(userChannel(userId)).socketsLeave(roomChannel(room.id));
        if (room.players.length === 0 && !isLive(room.round)) {
            stopWaits(room);
            rooms.delete(room.id);
        }
    }

    function roomOf(userId) {
        const room = rooms.get(where.get(userId));
        if (!room) throw new CrashError("You're not in a room.");
        return room;
    }

    // After the room changed: anyone ready who no longer can be (say, the
    // room got smaller and they've played its rounds) isn't, and the round
    // starts if it should.
    function recheck(room) {
        for (const player of room.players) {
            if (player.ready && db.blockedFor(statuses.get(player.userId), player.bet, sizeOf(room))) player.ready = false;
        }
        maybeStart(room);
    }

    function stopCountdown(room) {
        clearTimeout(room.countdown?.timer);
        room.countdown = null;
    }

    function stopOffer(room) {
        clearTimeout(room.offer?.timer);
        room.offer = null;
    }

    // Back to waiting from scratch: no countdown, no Start Game, no prompt.
    function stopWaits(room) {
        stopCountdown(room);
        stopOffer(room);
        room.startable = false;
    }

    const start = (room) => startRound(room).catch((error) => console.error("Crash couldn't start a round:", error));

    const readyIn = (room, userId) => seatedOf(room).some((player) => player.userId === userId && player.ready);

    // Everyone asked to join the smaller game has answered (or isn't ready
    // any more, or has gone).
    const offerAnswered = (room) => [...room.offer.asked].every((userId) => room.offer.answers.has(userId) || !readyIn(room, userId));

    // The smaller game starts: with whoever started it and whoever said
    // yes. Anyone ready who didn't answer sits it out.
    function closeOffer(room) {
        const offer = room.offer;
        for (const player of room.players) {
            if (player.ready && offer.asked.has(player.userId) && offer.answers.get(player.userId) !== "yes") {
                player.ready = false;
                io.to(userChannel(player.userId)).emit("crash:error", { message: "Time's up: you sat this round out. Ready up for the next one." });
            }
        }
        stopWaits(room);
        start(room);
    }

    // What happens next in a room between rounds:
    //   every player ready     the round starts now
    //   a prompt is out        it starts once everyone asked has answered
    //   nobody ready           back to waiting (no countdown)
    //   some ready             the countdown runs (started by the first), and
    //                          when it ends, Start Game is there for them
    function maybeStart(room) {
        if (isLive(room.round)) return;
        const seated = seatedOf(room);
        const ready = seated.filter((player) => player.ready);
        if (ready.length > 0 && ready.length === seated.length) {
            stopWaits(room);
            start(room);
            return;
        }
        if (room.offer) {
            if (readyIn(room, room.offer.by)) {
                if (offerAnswered(room)) closeOffer(room);
                return;
            }
            // Whoever pressed Start Game isn't ready any more: it's off, but
            // the others still ready can start one.
            stopOffer(room);
            sendRoom(room);
        }
        if (ready.length === 0) {
            if (room.countdown || room.startable) {
                stopWaits(room);
                sendRoom(room);
            }
            return;
        }
        if (!room.countdown && !room.startable) {
            room.countdown = {
                endsAt: Date.now() + readyMs,
                timer: setTimeout(() => {
                    room.countdown = null;
                    if (!rooms.has(room.id) || isLive(room.round)) return;
                    room.startable = seatedOf(room).some((player) => player.ready);
                    sendRoom(room);
                }, readyMs),
            };
            sendRoom(room);
        }
    }

    // ---- A round ----

    async function startRound(room) {
        const day = playDay();
        stopWaits(room);
        // Lord Gang Orca's all-in round: this room's first round only.
        const allIn = room.private && room.allIn === true;
        room.allIn = false;

        // Who plays: everyone ready, less anyone who's played every round
        // they can in a round this size (fewer than the room, if some
        // weren't ready), until nobody else drops out. They sit it out. (Not
        // all in: that round is past the usual ones.)
        let riders = room.players.filter((player) => player.ready);
        while (!allIn) {
            const count = room.private ? 1 : riders.length;
            const out = riders.filter((player) => db.blockedFor(statuses.get(player.userId), player.bet, count));
            if (out.length === 0) break;
            for (const player of out) {
                io.to(userChannel(player.userId)).emit("crash:error", { message: `You sat this round out. ${db.blockedFor(statuses.get(player.userId), player.bet, count)}` });
                player.ready = false;
            }
            riders = riders.filter((player) => !out.includes(player));
        }
        if (riders.length === 0) {
            sendRoomAndMe(room);
            sendLobby();
            return;
        }

        const size = room.private ? 1 : riders.length;
        const kind = allIn ? "allIn" : roundKindFor(size);
        const run = {
            id: new mongoose.Types.ObjectId(),
            kind,
            day,
            // 5 or more players: half of every loss back.
            protectShare: !allIn && isProtected(size) ? CRASH_RULES.protectShare : 0,
            status: "starting",
            startsAt: null,
            endedBy: null,
            engine: new CrashRound(random, config),
            players: riders.map((player) => ({
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

        const release = (player) => (allIn ? db.releaseAllIn(player.userId, day) : db.releasePlay(player.userId, day)).catch(() => {});
        const handBack = (player) => db.giveBack(player.userId, player.paid, run.id).catch((error) => console.error("Crash couldn't hand a bet back:", error));

        // Everyone's play and bet, all at once. All in: the offer, and
        // everything in their wallet as it is now. Anyone whose bet can't be
        // taken sits it out; the rest play.
        const taken = await Promise.allSettled(
            run.players.map(async (player) => {
                try {
                    if (allIn) {
                        await db.claimAllIn(player.userId, day);
                        player.claimed = true;
                        await refresh(player.userId);
                        player.bet = statuses.get(player.userId).points;
                        if (player.bet < 1) throw new CrashError("You've got nothing to put in.");
                        const entry = room.players.find((seat) => seat.userId === player.userId);
                        if (entry) entry.bet = player.bet;
                    } else {
                        await db.claimPlay(player.userId, size, day);
                        player.claimed = true;
                    }
                    player.paid = await db.takeBet(player.userId, player.bet, run.id);
                } catch (error) {
                    if (player.claimed) await release(player);
                    throw error;
                }
            })
        );
        const missed = run.players.filter((player, index) => taken[index].status === "rejected");
        for (const [index, player] of run.players.entries()) {
            if (taken[index].status !== "rejected") continue;
            const entry = room.players.find((seat) => seat.userId === player.userId);
            if (entry) entry.ready = false;
            io.to(userChannel(player.userId)).emit("crash:error", { message: taken[index].reason?.message ?? "Your bet couldn't be taken." });
            await refresh(player.userId).catch(() => {});
        }
        run.players = run.players.filter((player) => !missed.includes(player));

        let saved = run.players.length > 0;
        if (saved) {
            try {
                await db.startRound({ room: room.id, isPrivate: room.private, kind, day }, run.players, run.id);
            } catch (error) {
                console.error("Crash couldn't save a round:", error);
                saved = false;
            }
        }
        if (!saved) {
            for (const player of run.players) {
                await handBack(player);
                await release(player);
            }
            room.round = null;
            for (const player of room.players) player.ready = false;
            sendRoomAndMe(room);
            sendLobby();
            return;
        }

        await Promise.all(run.players.map((player) => refresh(player.userId).catch(() => {})));
        for (const player of run.players) sendMe(player.userId);
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
        player.payout = payoutFor(player.paid, multiplier, run.protectShare);
        run.credits.push(
            db
                .payCashOut(player.userId, player.paid, multiplier, run.id, run.protectShare)
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
        // Whoever rode it to the crash: nothing back, or in a protected
        // round, half their bet.
        for (const player of run.players) {
            if (player.cashedAt !== null) continue;
            player.payout = payoutFor(player.paid, 0, run.protectShare);
            if (player.payout.total > 0) {
                run.credits.push(db.payCashOut(player.userId, player.paid, 0, run.id, run.protectShare).catch((error) => console.error("Crash couldn't pay a protected loss:", error)));
            }
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
            protected: run.protectShare > 0,
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

        await Promise.all(run.players.map((player) => refresh(player.userId).catch(() => {})));

        // Who goes: anyone who left their page in the round, and any player
        // with no plays they can use here (back to the lobby). Spectators
        // stay to watch.
        for (const player of [...room.players]) {
            if (!sockets.has(player.userId)) {
                removePlayer(room, player.userId);
                continue;
            }
            if (player.spectating) continue;
            const left = statuses.get(player.userId)?.left;
            const noneLeft = !left || left.total < 1 || (room.private && left.alone < 1);
            if (run.kind === "allIn") {
                // His round's over: a word from him, and back to the lobby.
                const result = run.players.find((entry) => entry.userId === player.userId);
                const back = result?.payout.total ?? 0;
                const lines = back > (result?.bet ?? 0) ? ORCA_LINES.won : back > 0 ? ORCA_LINES.some : ORCA_LINES.lost;
                removePlayer(room, player.userId);
                io.to(userChannel(player.userId)).emit("crash:kicked", { message: `Lord Gang Orca: "${lines[Math.floor(Math.random() * lines.length)]}"` });
            } else if (noneLeft) {
                removePlayer(room, player.userId);
                io.to(userChannel(player.userId)).emit("crash:kicked", {
                    message: !left || left.total < 1 ? "That was your last round today. More at 12:00." : "No rounds alone left today: join a room for more. The more players, the more rounds.",
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

    // Into an open room, to play, or with `spectate` to watch (a spectator
    // doesn't need a free seat). Already in it: nothing changes (a link
    // from Notifications, say).
    async function join(userId, roomId, { spectate = false } = {}) {
        const id = String(roomId ?? "");
        if (where.get(userId) === id && rooms.has(id)) return roomView(rooms.get(id));
        if (where.has(userId)) throw new CrashError("You're in a room already: leave it first.");
        const room = rooms.get(id);
        if (!room || room.private) throw new CrashError("That room has closed.");
        if (!spectate && seatedOf(room).length >= CRASH_RULES.roomSize) throw new CrashError("That room is full. You can still spectate.");
        await know(userId);
        await refresh(userId);
        if (statuses.get(userId).banned) throw new CrashError(statuses.get(userId).banned);
        if (where.has(userId)) throw new CrashError("You're in a room already: leave it first.");
        if (!rooms.has(id)) throw new CrashError("That room has closed.");
        if (!spectate && seatedOf(room).length >= CRASH_RULES.roomSize) throw new CrashError("That room is full. You can still spectate.");
        addPlayer(room, userId, { spectating: Boolean(spectate) });
        recheck(room);
        sendRoomAndMe(room);
        sendLobby();
        return roomView(room);
    }

    // Spectate (`on`), sitting rounds out until they stop, or take a seat
    // again (if there's one free). Their bet and target stay as they were.
    async function spectate(userId, { on = true } = {}) {
        const room = roomOf(userId);
        if (room.private) throw new CrashError("You're playing alone: there's nothing to sit out.");
        const player = room.players.find((entry) => entry.userId === userId);
        if (on) {
            player.spectating = true;
            player.ready = false;
        } else if (player.spectating) {
            if (seatedOf(room).length >= CRASH_RULES.roomSize) throw new CrashError("Every seat is taken: wait for one to free up.");
            await refresh(userId);
            if (statuses.get(userId).banned) throw new CrashError(statuses.get(userId).banned);
            if (!rooms.has(room.id) || where.get(userId) !== room.id) throw new CrashError("You're not in that room any more.");
            if (seatedOf(room).length >= CRASH_RULES.roomSize) throw new CrashError("Every seat is taken: wait for one to free up.");
            player.spectating = false;
        }
        recheck(room);
        sendRoomAndMe(room);
        sendLobby();
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
        maybeStart(room);
    }

    // Ready (with the bet and target, if given) or not. When every player in
    // the room is ready, the round starts; alone in a room, straight away.
    // Readying while a smaller game is being offered is a yes to it.
    async function ready(userId, { ready: on = true, bet, autoAt } = {}) {
        const room = roomOf(userId);
        if (isLive(room.round)) throw new CrashError("The round has started: wait for the next one.");
        const player = room.players.find((entry) => entry.userId === userId);
        if (player.spectating) throw new CrashError("You're spectating: take a seat to play.");
        if (bet !== undefined) {
            player.bet = checkBet(bet);
            player.autoAt = autoTarget(autoAt);
        }
        if (on) {
            await refresh(userId);
            if (isLive(room.round)) throw new CrashError("The round has started: wait for the next one.");
            if (player.spectating) throw new CrashError("You're spectating: take a seat to play.");
            const blocked = db.blockedFor(statuses.get(userId), player.bet, sizeOf(room));
            if (blocked) {
                player.ready = false;
                sendRoomAndMe(room);
                throw new CrashError(blocked);
            }
        }
        player.ready = Boolean(on);
        if (on && room.offer && room.offer.by !== userId) {
            room.offer.asked.add(userId);
            room.offer.answers.set(userId, "yes");
        }
        sendRoomAndMe(room);
        sendLobby();
        maybeStart(room);
    }

    // Start Game: once the ready countdown has ended without every player
    // ready, a ready player who can play a round of everyone ready starts
    // one without the rest. Nobody else ready: it starts now. Otherwise the
    // others ready get the prompt to join it (answer below).
    async function startGame(userId) {
        const room = roomOf(userId);
        if (room.private) throw new CrashError("You're playing alone: Ready starts it.");
        const player = room.players.find((entry) => entry.userId === userId);
        const check = () => {
            if (isLive(room.round)) throw new CrashError("The round has started: wait for the next one.");
            if (player.spectating || !player.ready) throw new CrashError("Ready up first.");
            if (room.offer) throw new CrashError("A game is starting already.");
            if (!room.startable) throw new CrashError(`Everyone gets ${CRASH_RULES.readyMs / 1000} seconds to ready up first.`);
        };
        check();
        await refresh(userId);
        check();
        if (where.get(userId) !== room.id) throw new CrashError("You're not in that room any more.");
        const readyNow = seatedOf(room).filter((entry) => entry.ready);
        const blocked = db.blockedFor(statuses.get(userId), player.bet, readyNow.length);
        if (blocked) throw new CrashError(blocked);

        const others = readyNow.filter((entry) => entry.userId !== userId);
        if (others.length === 0) {
            stopWaits(room);
            start(room);
            return;
        }
        const offer = { by: userId, size: readyNow.length, endsAt: Date.now() + offerMs, asked: new Set(others.map((entry) => entry.userId)), answers: new Map(), timer: null };
        offer.timer = setTimeout(() => {
            if (room.offer === offer && rooms.has(room.id) && !isLive(room.round)) closeOffer(room);
        }, offerMs);
        room.offer = offer;
        sendRoomAndMe(room);
    }

    // An answer to the prompt: join the smaller game, or sit it out (no
    // longer ready, so they watch it).
    function answer(userId, { join: yes = false } = {}) {
        const room = roomOf(userId);
        const offer = room.offer;
        if (!offer || !offer.asked.has(userId)) throw new CrashError("There's nothing to answer.");
        const player = room.players.find((entry) => entry.userId === userId);
        if (yes) {
            if (!player.ready || player.spectating) throw new CrashError("Ready up to join it.");
            offer.answers.set(userId, "yes");
        } else {
            offer.answers.set(userId, "no");
            player.ready = false;
        }
        sendRoomAndMe(room);
        sendLobby();
        maybeStart(room);
    }

    // An invite to the room they're in, for `to`: a notification with Play
    // and Spectate. Once per member per room, and up to
    // CRASH_RULES.invitesPerRoom from each of them.
    async function invite(userId, { userId: to } = {}) {
        const room = roomOf(userId);
        if (room.private) throw new CrashError("You're playing alone: join a room to invite people.");
        const invitee = String(to ?? "");
        if (!mongoose.isValidObjectId(invitee)) throw new CrashError("Pick someone to invite.");
        if (invitee === userId) throw new CrashError("You're here already.");
        if (where.get(invitee) === room.id) throw new CrashError("They're in this room already.");
        const sent = room.invited.get(userId) ?? new Set();
        if (sent.has(invitee)) throw new CrashError("You've invited them already.");
        if (sent.size >= CRASH_RULES.invitesPerRoom) throw new CrashError(`That's ${CRASH_RULES.invitesPerRoom} invites from you for this room.`);
        // Counted before anything's awaited, so two clicks can't send two.
        sent.add(invitee);
        room.invited.set(userId, sent);
        try {
            if (!(await User.exists({ _id: invitee }))) throw new CrashError("That member doesn't exist any more.");
            await noteCrashInvite(userId, invitee, room.id);
        } catch (error) {
            sent.delete(invitee);
            throw error;
        }
        return { invited: invitee };
    }

    // For "Invite" (routes/crashRouter.js): the room they're in (null if
    // none, or alone), who of `ids` is in it, and who they've invited from it.
    function inviteState(userId, ids) {
        const room = rooms.get(where.get(userId));
        if (!room || room.private) return { room: null, here: new Set(), invited: new Set() };
        const sent = room.invited.get(userId) ?? new Set();
        return {
            room: room.id,
            here: new Set(ids.filter((id) => where.get(id) === room.id)),
            invited: new Set(ids.filter((id) => sent.has(id))),
        };
    }

    // Whether an open room is still open (an invite to it shows Play and
    // Spectate until it closes).
    const isOpen = (roomId) => Boolean(rooms.get(String(roomId))?.private === false);

    // A page that only wants the open rooms (Notifications): it hears
    // "crash:lobby" from now on, without joining the game.
    function watch(socket) {
        socket.join(LOBBY);
        return { lobby: lobbyView() };
    }

    // Play alone: out of their room (if they're in one) and straight into a
    // round of their own (3 a day).
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

    // Lord Gang Orca's offer: out of their room (if they're in one) and
    // straight into a round of their own with everything they have on it,
    // no auto cash-out. Once a play day, once their rounds alone are used
    // up, and not while they've points anywhere else (utils/pointsElsewhere.js).
    async function allIn(userId) {
        const current = rooms.get(where.get(userId));
        if (current && isLive(current.round) && inRun(current.round, userId)) throw new CrashError("You're in this round: wait for it to end.");
        await know(userId);
        await refresh(userId);
        const status = statuses.get(userId);
        const blocked = db.allInBlockedFor(status);
        if (blocked) throw new CrashError(blocked);
        if (current) {
            removePlayer(current, userId);
            if (rooms.has(current.id)) {
                recheck(current);
                sendRoomAndMe(current);
            }
        }
        const room = newRoom(true);
        room.allIn = true;
        addPlayer(room, userId, { bet: status.points, autoAt: null });
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
        for (const room of rooms.values()) {
            clearInterval(room.round?.timer);
            stopWaits(room);
        }
        for (const timer of goneTimers.values()) clearTimeout(timer);
    }

    return {
        CrashError,
        hello,
        goodbye,
        watch,
        create,
        join,
        spectate,
        leave,
        setBet,
        ready,
        startGame,
        answer,
        invite,
        inviteState,
        isOpen,
        solo,
        allIn,
        cashOut,
        resetMe,
        stopAll,
        lobbyView,
        rooms,
    };
}

module.exports = { CrashError, createCrashRooms };
