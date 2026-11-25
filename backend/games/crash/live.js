const { createCrashRooms } = require("./rooms");

// Crash, live: the game's page talks to the rooms (rooms.js) over the same
// Socket.IO connection as Kino Farkle, Kino Poker, Infinite Gomoku and 8
// Ball Pool (games/farkle/live.js logs it in). server.js calls
// startCrashLive once.
//
// The page asks with these, each answered (ack) with { ok, ... } or
// { error }:
//   crash:hello                      everything to show: { lobby, room, me }
//   crash:watch                      just the open rooms, from now on
//                                    (Notifications): { lobby }
//   crash:create                     a new room, and into it
//   crash:join     { roomId, spectate }
//   crash:spectate { on }             sit rounds out, or take a seat again
//   crash:leave
//   crash:bet      { bet, autoAt }   (un-readies)
//   crash:uncap    { on }            Remove Betting Cap (No Bet Protection),
//                                    or put it back (5 or more; un-readies)
//   crash:ready    { ready, bet, autoAt }
//   crash:start                      Start Game, without everyone ready
//   crash:answer   { join }          join the smaller game, or sit it out
//   crash:invite   { userId }        a notification inviting them in
//   crash:solo     { bet, autoAt }   play alone, now
//   crash:allin                      Lord Gang Orca's offer: alone, all in
//   crash:cashout
// and hears "crash:lobby", "crash:room", "crash:tick", "crash:cashout",
// "crash:me", "crash:kicked" and "crash:error" (rooms.js).

let rooms = null;

function startCrashLive(io) {
    rooms = createCrashRooms({ io });

    io.on("connection", (socket) => {
        const userId = String(socket.data.user._id);

        // Every request: run it, answer with what it gave back or why not.
        const handle = (event, work) => {
            socket.on(event, async (payload, ack) => {
                const answer = typeof ack === "function" ? ack : () => {};
                try {
                    const result = await work(payload ?? {});
                    answer({ ok: true, ...(result && typeof result === "object" ? result : {}) });
                } catch (error) {
                    if (!(error instanceof rooms.CrashError)) console.error(`Crash ${event} failed:`, error);
                    answer({ error: error instanceof rooms.CrashError || error.status ? error.message : "Something went wrong. Try again." });
                }
            });
        };

        let joined = false;
        handle("crash:hello", async () => {
            joined = true;
            return rooms.hello(socket);
        });
        // Notifications: only the open rooms, so it doesn't count as being in
        // the game.
        handle("crash:watch", async () => rooms.watch(socket));
        handle("crash:create", async () => ({ room: await rooms.create(userId) }));
        handle("crash:join", async ({ roomId, spectate }) => ({ room: await rooms.join(userId, roomId, { spectate: spectate === true }) }));
        handle("crash:spectate", async ({ on }) => rooms.spectate(userId, { on: on !== false }));
        handle("crash:leave", async () => rooms.leave(userId));
        handle("crash:bet", async (payload) => rooms.setBet(userId, payload));
        handle("crash:uncap", async ({ on }) => rooms.setUncap(userId, { on: on !== false }));
        handle("crash:ready", async (payload) => rooms.ready(userId, payload));
        handle("crash:start", async () => rooms.startGame(userId));
        handle("crash:answer", async ({ join }) => rooms.answer(userId, { join: join === true }));
        handle("crash:invite", async ({ userId: to }) => rooms.invite(userId, { userId: to }));
        handle("crash:solo", async (payload) => ({ room: await rooms.solo(userId, payload) }));
        handle("crash:allin", async () => ({ room: await rooms.allIn(userId) }));
        handle("crash:cashout", async () => ({ cashout: rooms.cashOut(userId) }));

        socket.on("disconnect", () => {
            if (joined) rooms.goodbye(socket);
        });
    });
}

// The developer tool reset a member's day: their page hears it.
function crashDayReset(userId) {
    return rooms?.resetMe(String(userId));
}

// The rooms, for Notifications and invites (null until startCrashLive runs,
// and in tests that never start it).
const getCrashRooms = () => rooms;

module.exports = { startCrashLive, crashDayReset, getCrashRooms };
