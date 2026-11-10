const mongoose = require("mongoose");
const GomokuMatch = require("../../models/gomokuMatchModel");

// Play Live for Infinite Gomoku: when both players have a game's page open,
// a stone put down reaches the other one straight away (and lands with its
// shockwave), instead of by notification. It rides on the same socket.io
// connection as Kino Farkle (games/farkle/live.js, which logs the page in)
// and Kino Poker. server.js calls startGomokuLive once.
//
// Each game has a room, "gomoku:<id>", which a player's page joins while
// it's open. When the game changes, the room hears its new version, and
// each page loads it again over the API, so everyone sees it from their own
// side and through the same checks as always.

let io = null;

const PREFIX = "gomoku:";
const room = (gameId) => `${PREFIX}${gameId}`;

// The members with a page in a game's room right now, once each.
async function presentIn(gameId) {
    const pages = await io.in(room(gameId)).fetchSockets();
    return [...new Set(pages.map((page) => String(page.data.user._id)))];
}

async function announcePresence(gameId) {
    io.to(room(gameId)).emit("gomoku:presence", { gameId: String(gameId), present: await presentIn(gameId) });
}

function startGomokuLive(server) {
    io = server;

    io.on("connection", (socket) => {
        const userId = String(socket.data.user._id);

        // A page opening a game, { gameId }. Answers { ok, present } or
        // { error }. Only the two players of a game being played can join.
        socket.on("gomoku:join", async (payload, ack) => {
            const answer = typeof ack === "function" ? ack : () => {};
            const gameId = String(payload?.gameId ?? "");
            try {
                const playing = mongoose.isValidObjectId(gameId)
                    ? await GomokuMatch.exists({ _id: gameId, status: "active", "players.user": userId })
                    : null;
                if (!playing) return answer({ error: "Only the players of a game being played can Play Live in it." });

                socket.join(room(gameId));
                answer({ ok: true, present: await presentIn(gameId) });
                await announcePresence(gameId);
            } catch (error) {
                console.error("Gomoku Play Live couldn't join a game:", error.message);
                answer({ error: "Couldn't Play Live right now." });
            }
        });

        socket.on("gomoku:leave", async (payload) => {
            const gameId = String(payload?.gameId ?? "");
            if (!socket.rooms.has(room(gameId))) return;
            socket.leave(room(gameId));
            await announcePresence(gameId).catch(() => {});
        });

        socket.on("disconnecting", () => {
            const games = [...socket.rooms].filter((name) => name.startsWith(PREFIX));
            setImmediate(() => {
                for (const name of games) announcePresence(name.slice(PREFIX.length)).catch(() => {});
            });
        });
    });
}

// The members with the game open right now, for the Notifications page.
// Nobody before startGomokuLive (tests, scripts).
async function gomokuPlayersAt(gameId) {
    if (!io) return [];
    return presentIn(gameId);
}

// Tells the pages open on `game` that it changed.
function announceGomoku(game) {
    if (!io) return;
    io.to(room(game._id)).emit("gomoku:changed", { gameId: String(game._id), version: game.version });
}

module.exports = { startGomokuLive, gomokuPlayersAt, announceGomoku };
