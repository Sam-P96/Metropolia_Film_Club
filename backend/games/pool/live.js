const mongoose = require("mongoose");
const PoolMatch = require("../../models/poolMatchModel");
const Follow = require("../../models/followModel");

// Play Live for 8 Ball Pool: while a game's page is open, every shot
// reaches it the moment it's played, and so does the shooter's aim as they
// line it up, and every bet the crowd makes. It rides on the same socket.io
// connection as Kino Farkle (games/farkle/live.js, which logs the page in),
// Kino Poker and Infinite Gomoku. server.js calls startPoolLive once.
//
// Each game has a room, "pool:<id>", joined by its two players and by
// anyone watching (a member who follows either player: utils/pool.js has
// the same rule for the API). When the game changes, the room hears its new
// version, and each page loads it again over the API, so everyone sees it
// from their own side and through the same checks as always.

let io = null;

const PREFIX = "pool:";
const room = (gameId) => `${PREFIX}${gameId}`;

// The members with a page in a game's room right now, once each.
async function presentIn(gameId) {
    const pages = await io.in(room(gameId)).fetchSockets();
    return [...new Set(pages.map((page) => String(page.data.user._id)))];
}

async function announcePresence(gameId) {
    io.to(room(gameId)).emit("pool:presence", { gameId: String(gameId), present: await presentIn(gameId) });
}

// Whether `userId` may be in the room of the game being played with
// `gameId`: "player", "watcher" or null.
async function roleIn(gameId, userId) {
    if (!mongoose.isValidObjectId(gameId)) return null;
    const game = await PoolMatch.findOne({ _id: gameId, status: "active" }).select("players.user").lean();
    if (!game) return null;
    const players = game.players.map((player) => player.user).filter(Boolean);
    if (players.some((id) => String(id) === String(userId))) return "player";
    return (await Follow.exists({ follower: userId, following: { $in: players } })) ? "watcher" : null;
}

// An aim to pass on: an angle, a power from 0 to 1, and maybe where the cue
// ball is being held. Only ever shown, never trusted: the server checks the
// real shot when it's played.
function aimOf(payload) {
    const angle = Number(payload?.angle);
    const power = Number(payload?.power);
    if (!Number.isFinite(angle) || !Number.isFinite(power)) return null;
    const aim = { angle, power: Math.min(1, Math.max(0, power)), on: Boolean(payload?.on) };
    const x = Number(payload?.cue?.x);
    const y = Number(payload?.cue?.y);
    if (Number.isFinite(x) && Number.isFinite(y)) aim.cue = { x, y };
    return aim;
}

function startPoolLive(server) {
    io = server;

    io.on("connection", (socket) => {
        const userId = String(socket.data.user._id);

        // A page opening a game, { gameId }. Answers { ok, present } or
        // { error }.
        socket.on("pool:join", async (payload, ack) => {
            const answer = typeof ack === "function" ? ack : () => {};
            const gameId = String(payload?.gameId ?? "");
            try {
                const role = await roleIn(gameId, userId);
                if (!role) return answer({ error: "Only its players, and members who follow one of them, can watch a game live." });

                socket.data.poolRoles = { ...socket.data.poolRoles, [gameId]: role };
                socket.join(room(gameId));
                answer({ ok: true, present: await presentIn(gameId) });
                await announcePresence(gameId);
            } catch (error) {
                console.error("Pool Play Live couldn't join a game:", error.message);
                answer({ error: "Couldn't Play Live right now." });
            }
        });

        socket.on("pool:leave", async (payload) => {
            const gameId = String(payload?.gameId ?? "");
            if (!socket.rooms.has(room(gameId))) return;
            socket.leave(room(gameId));
            await announcePresence(gameId).catch(() => {});
        });

        // A player lining up a shot: everyone else at the table sees their
        // cue move.
        socket.on("pool:aim", (payload) => {
            const gameId = String(payload?.gameId ?? "");
            if (!socket.rooms.has(room(gameId)) || socket.data.poolRoles?.[gameId] !== "player") return;
            const aim = aimOf(payload);
            if (aim) socket.to(room(gameId)).volatile.emit("pool:aim", { gameId, by: userId, ...aim });
        });

        socket.on("disconnecting", () => {
            const games = [...socket.rooms].filter((name) => name.startsWith(PREFIX));
            setImmediate(() => {
                for (const name of games) announcePresence(name.slice(PREFIX.length)).catch(() => {});
            });
        });
    });
}

// The members with the game open right now. Nobody before startPoolLive
// (tests, scripts).
async function poolPlayersAt(gameId) {
    if (!io) return [];
    return presentIn(gameId);
}

// Tells the pages open on `game` that it changed.
function announcePool(game) {
    if (!io) return;
    io.to(room(game._id)).emit("pool:changed", { gameId: String(game._id), version: game.version });
}

// Tells the pages open on a game that the crowd's bets on it changed.
function announcePoolBets(gameId) {
    if (!io) return;
    io.to(room(gameId)).emit("pool:bets", { gameId: String(gameId) });
}

module.exports = { startPoolLive, poolPlayersAt, announcePool, announcePoolBets };
