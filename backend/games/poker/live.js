const mongoose = require("mongoose");
const User = require("../../models/userModel");
const PokerSeat = require("../../models/pokerSeatModel");
const { PokerTable } = require("./table");
const { PokerError } = require("./betting");
const pokerWallet = require("../../utils/pokerWallet");
const { notePokerWin } = require("../../utils/notify");

// Kino Poker, live (spec): the one table, played over the same socket.io
// connection as Kino Farkle's Play Live (games/farkle/live.js, which checks
// the login). Pages showing the table join the "poker" room; after every
// change each of them gets the table as its own member sees it
// (table.viewFor: only their own cards), and every animation, speech bubble
// and emoji goes to the whole room. Messages for one member go to their own
// room, "member:<id>", which every page of theirs is in.
//
// Events from a page (each answers { ok, ... } or { error, code }):
//   poker:watch            start showing the table (and come back from a drop)
//   poker:unwatch          stop
//   poker:join { buyIn }   sit down, or join the queue
//   poker:act { action, amount }   fold, check, call, raise (to amount), allIn
//   poker:draw { discards }        the cards (0-4) to swap
//   poker:emoji { emoji }  react over your seat
//   poker:leave            leave the table with your chips (or the queue)
// To pages:
//   poker:state  the table, as that member sees it
//   poker:event  { type, ... }: deal, action, draw, reshuffle, win, say,
//                emoji, seated, botJoined, botLeft, cashedOut, message, reset
//
// The table only exists in this server's memory, so the server must run as
// a single process. A restart starts it empty and gives everyone who was
// sitting at it their chips back.

const ROOM = "poker";
const memberRoom = (userId) => `member:${userId}`;

let table = null;
let ready = Promise.resolve();

function getTable() {
    return table;
}

function answer(ack, payload) {
    if (typeof ack === "function") ack(payload);
}

async function handle(ack, work) {
    try {
        const result = await work();
        answer(ack, { ok: true, ...(result ?? {}) });
    } catch (error) {
        if (error instanceof PokerError) return answer(ack, { error: error.message, code: error.code });
        console.error("Kino Poker:", error);
        answer(ack, { error: "Something went wrong at the table. Try again.", code: "ERROR" });
    }
}

// Call once, from server.js, with the socket.io server. `options` (only
// the tests) can make the table's timers shorter.
function startPoker(io, options = {}) {
    let queued = false;
    // Sends every page in the room its member's view, at most once per tick.
    function broadcast() {
        if (queued) return;
        queued = true;
        setImmediate(async () => {
            queued = false;
            try {
                for (const socket of await io.in(ROOM).fetchSockets()) {
                    socket.emit("poker:state", table.viewFor(socket.data.user._id));
                }
            } catch (error) {
                console.error("Kino Poker couldn't send the table:", error.message);
            }
        });
    }

    table = new PokerTable({
        wallet: { buyIn: pokerWallet.buyIn, cashOut: pokerWallet.cashOut },
        store: pokerWallet.store,
        onChange: broadcast,
        onEvent: ({ to, ...event }) => io.to(to ? memberRoom(to) : ROOM).emit("poker:event", event),
        // A member left ahead: everyone hears about it.
        announce: ({ userId, profit, hands, best }) => notePokerWin(userId, profit, { hands, best }),
        ...options,
    });

    // Anyone left sitting at the table by a restart gets their chips back
    // before anyone can sit down again.
    ready = mongoose.connection
        .asPromise()
        .then(() => pokerWallet.refundAll())
        .then((count) => count && console.log(`Kino Poker: gave ${count} member(s) their chips back after a restart.`))
        .catch((error) => console.error("Kino Poker couldn't hand back chips after a restart:", error.message));

    // A member's last poker page has gone: they have the reconnect grace.
    async function maybeGone(userId) {
        const pages = await io.in(memberRoom(userId)).fetchSockets();
        if (!pages.some((page) => page.rooms.has(ROOM))) await table.disconnect(userId);
    }

    io.on("connection", (socket) => {
        const userId = String(socket.data.user._id);

        socket.on("poker:watch", async (payload, ack) => {
            socket.join(ROOM);
            await table.reconnect(userId);
            answer(ack, { ok: true, state: table.viewFor(userId) });
        });

        socket.on("poker:unwatch", () => {
            socket.leave(ROOM);
            maybeGone(userId).catch(() => {});
        });

        socket.on("poker:join", (payload, ack) =>
            handle(ack, async () => {
                await ready;
                const user = await User.findById(userId).select("username avatarUrl").lean();
                if (!user) throw new PokerError("Please log in again.", "LOGIN");
                socket.join(ROOM);
                return table.join(user, payload?.buyIn);
            })
        );
        socket.on("poker:act", (payload, ack) => handle(ack, () => table.act(userId, payload?.action, payload?.amount)));
        socket.on("poker:draw", (payload, ack) => handle(ack, () => table.draw(userId, payload?.discards)));
        socket.on("poker:emoji", (payload, ack) => handle(ack, () => table.emoji(userId, payload?.emoji)));
        socket.on("poker:leave", (payload, ack) => handle(ack, () => table.leave(userId)));

        socket.on("disconnecting", () => {
            if (!socket.rooms.has(ROOM)) return;
            // Once this page has left its rooms.
            setImmediate(() => maybeGone(userId).catch(() => {}));
        });
    });

    return table;
}

// An account was deleted (controllers/userControllers.js): off the table
// and out of the queue, chips forfeit.
async function forgetPokerPlayer(userId) {
    if (table) await table.forget(userId);
    await PokerSeat.deleteOne({ _id: userId });
}

module.exports = { startPoker, getTable, forgetPokerPlayer };
