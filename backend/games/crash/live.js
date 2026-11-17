const { createCrashRooms } = require("./rooms");

// Crash, live: the game's page talks to the rooms (rooms.js) over the same
// Socket.IO connection as Kino Farkle, Kino Poker, Infinite Gomoku and 8
// Ball Pool (games/farkle/live.js logs it in). server.js calls
// startCrashLive once.
//
// The page asks with these, each answered (ack) with { ok, ... } or
// { error }:
//   crash:hello                      everything to show: { lobby, room, me }
//   crash:create                     a new room, and into it
//   crash:join     { roomId }
//   crash:leave
//   crash:bet      { bet, autoAt }   (un-readies)
//   crash:ready    { ready, bet, autoAt }
//   crash:solo     { bet, autoAt }   play alone, now
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
        handle("crash:create", async () => ({ room: await rooms.create(userId) }));
        handle("crash:join", async ({ roomId }) => ({ room: await rooms.join(userId, roomId) }));
        handle("crash:leave", async () => rooms.leave(userId));
        handle("crash:bet", async (payload) => rooms.setBet(userId, payload));
        handle("crash:ready", async (payload) => rooms.ready(userId, payload));
        handle("crash:solo", async (payload) => ({ room: await rooms.solo(userId, payload) }));
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

module.exports = { startCrashLive, crashDayReset };
