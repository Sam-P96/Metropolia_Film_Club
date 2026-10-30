const mongoose = require("mongoose");
const { Server } = require("socket.io");
const FarkleMatch = require("../../models/farkleMatchModel");
const { userFromToken } = require("../../middleware/auth");

// Play Live: when both players have a game's page open, every roll, pick and
// bank reaches the other one straight away, instead of by notification.
// socket.io, on the same server as the API (server.js), at /socket.io/.
//
// Each game has a room, "farkle:<id>", which a player's page joins while
// it's open. When the game changes, the room hears its new version, and
// each page loads it again over the API, so everyone sees it from their own
// side and through the same checks as always. Each member also has a room of
// their own, "member:<id>", so the server can find all of their pages.
//
// A member can Play Live in one game at a time. A page joining a game takes
// their pages out of any other game's room (the newest page wins), and those
// pages drop back to notifications, with a "Play Live here" button.

let io = null;

const gameRoom = (matchId) => `farkle:${matchId}`;
const memberRoom = (userId) => `member:${userId}`;
const GAME_PREFIX = "farkle:";

// The members with a page in a game's room right now, once each.
async function presentIn(matchId) {
    const pages = await io.in(gameRoom(matchId)).fetchSockets();
    return [...new Set(pages.map((page) => String(page.data.user._id)))];
}

// Tells a game's room who is there, for the Play Live badge.
async function announcePresence(matchId) {
    io.to(gameRoom(matchId)).emit("farkle:presence", { matchId: String(matchId), present: await presentIn(matchId) });
}

// Dice positions a player has tapped: up to six different whole numbers
// from 0 to 5.
function isSelection(selected) {
    return Array.isArray(selected)
        && selected.length <= 6
        && selected.every((i) => Number.isInteger(i) && i >= 0 && i < 6)
        && new Set(selected).size === selected.length;
}

// Starts Play Live on `httpServer`. Call once, from server.js.
function startLive(httpServer) {
    io = new Server(httpServer, { serveClient: false });

    // The same login as the API: the token the page already has.
    io.use(async (socket, next) => {
        const user = await userFromToken(socket.handshake.auth?.token);
        if (!user) return next(new Error("Please log in again."));
        socket.data.user = user;
        next();
    });

    io.on("connection", (socket) => {
        const userId = String(socket.data.user._id);
        socket.join(memberRoom(userId));

        // A page opening a game, { matchId }. Answers { ok, present } or
        // { error }. Only the two players of a game between members that's
        // being played can join it.
        socket.on("farkle:join", async (payload, ack) => {
            const answer = typeof ack === "function" ? ack : () => {};
            const matchId = String(payload?.matchId ?? "");

            try {
                const match = mongoose.isValidObjectId(matchId)
                    ? await FarkleMatch.exists({ _id: matchId, mode: "pvp", status: "active", "players.user": userId })
                    : null;
                if (!match) return answer({ error: "Only the players of a game being played can Play Live in it." });

                // One live game at a time: their pages leave any other game.
                const left = new Set();
                for (const page of await io.in(memberRoom(userId)).fetchSockets()) {
                    for (const room of page.rooms) {
                        if (!room.startsWith(GAME_PREFIX) || room === gameRoom(matchId)) continue;
                        page.leave(room);
                        page.emit("farkle:bumped", { matchId: room.slice(GAME_PREFIX.length) });
                        left.add(room.slice(GAME_PREFIX.length));
                    }
                }

                socket.join(gameRoom(matchId));
                answer({ ok: true, present: await presentIn(matchId) });
                await announcePresence(matchId);
                for (const other of left) await announcePresence(other);
            } catch (error) {
                console.error("Play Live couldn't join a game:", error.message);
                answer({ error: "Couldn't Play Live right now." });
            }
        });

        // The page closed the game, or the game ended.
        socket.on("farkle:leave", async (payload) => {
            const matchId = String(payload?.matchId ?? "");
            if (!socket.rooms.has(gameRoom(matchId))) return;
            socket.leave(gameRoom(matchId));
            await announcePresence(matchId).catch(() => {});
        });

        // The dice a player has tapped, so the other player sees them picked
        // as they go. Only ever shown, never trusted: the server checks the
        // real pick when they roll or bank.
        socket.on("farkle:select", (payload) => {
            const matchId = String(payload?.matchId ?? "");
            if (!socket.rooms.has(gameRoom(matchId)) || !isSelection(payload?.selected)) return;
            socket.to(gameRoom(matchId)).emit("farkle:select", { matchId, by: userId, selected: payload.selected });
        });

        // A page closing (or its connection dropping): once it has left its
        // rooms, tell the games it was in.
        socket.on("disconnecting", () => {
            const games = [...socket.rooms].filter((room) => room.startsWith(GAME_PREFIX));
            setImmediate(() => {
                for (const room of games) announcePresence(room.slice(GAME_PREFIX.length)).catch(() => {});
            });
        });
    });

    return io;
}

// Tells the pages open on `match` that it changed (a roll, a bank, the end
// of the game). Does nothing before startLive, so tests and scripts that use
// the routes without a server still work.
function announceMatch(match) {
    if (!io) return;
    io.to(gameRoom(match._id)).emit("farkle:changed", { matchId: String(match._id), version: match.version });
}

module.exports = { startLive, announceMatch };
