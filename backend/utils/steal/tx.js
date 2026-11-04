const mongoose = require("mongoose");

// Runs `work(session, after)` as one MongoDB transaction where the database
// can do them (a replica set, like MongoDB Atlas), so a crash halfway
// through paying out an attack can't take a fine without paying the
// defender. On a single local MongoDB, which can't, it runs the same steps
// one after another (session is null), which is fine for development.
//
// `after(job)` queues something to do once it has all gone through, like
// notifications: a transaction that clashed and ran again can't send
// anything twice, and nothing is sent for one that was undone.
let supported = null;

async function transactionsSupported() {
    if (supported !== null) return supported;
    try {
        const hello = await mongoose.connection.db.admin().command({ hello: 1 });
        supported = Boolean(hello.setName || hello.msg === "isdbgrid");
    } catch {
        supported = false;
    }
    return supported;
}

async function inSession(work) {
    let jobs = [];
    const after = (job) => jobs.push(job);
    let result;

    if (await transactionsSupported()) {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                jobs = [];
                result = await work(session, after);
            });
        } finally {
            await session.endSession();
        }
    } else {
        result = await work(null, after);
    }

    for (const job of jobs) {
        await job().catch((error) => console.error("Steal and Defend, afterwards:", error.message));
    }
    return result;
}

// Tests can say which way to run.
function useTransactions(value) {
    supported = value;
}

module.exports = { inSession, transactionsSupported, useTransactions };
