const cron = require("node-cron");
const mongoose = require("mongoose");
const { STEAL } = require("../../shared/steal/config.js");
const { shopDay } = require("../games/steal/rules");
const { sweepAttacks } = require("../utils/steal/attacks");
const { ensureShop } = require("../utils/steal/shop");
const { dailyTickdown } = require("../utils/steal/inventory");
const { expireTrades } = require("../utils/steal/market");
const { reclaimIdleStones } = require("../utils/steal/upkeep");

// Steal and Defend's clockwork:
//   every 20 seconds  attacks whose question ran out of time move on, and
//                     ones whose player left are finished (unanswered
//                     questions count as wrong)
//   12:00 daily       the shop's nine new listings, daily durability
//                     tickdown, Infinity Stones back from holders idle for
//                     3 months, and week-old trade offers cancelled
// The daily and weekly limits need no job: they're worked out from the
// time of each attack (games/steal/rules.js). If the server was down at
// 12:00, the daily work runs as it starts; the shop also makes the day's
// listings the first time anyone opens it.

let sweepTask = null;
let dailyTask = null;
let sweeping = false;

const MODELS = ["StealPlayer", "StealItem", "StealAttack", "StealListing", "StealMarket", "StealTrade", "StealFlag", "GameBan", "DeviceSighting"];

async function sweep() {
    if (sweeping) return;
    sweeping = true;
    try {
        await sweepAttacks();
    } catch (error) {
        console.error("Steal and Defend sweep failed:", error.message);
    } finally {
        sweeping = false;
    }
}

// Each part of the day's work runs once per shop day, whichever server or
// restart gets there first: the day is claimed in the database.
async function claimDay(job, day) {
    try {
        const result = await mongoose.connection
            .collection("stealjobs")
            .updateOne({ _id: job, day: { $ne: day } }, { $set: { day, at: new Date() } }, { upsert: true });
        return result.modifiedCount + result.upsertedCount > 0;
    } catch (error) {
        if (error.code === 11000) return false; // already done today
        throw error;
    }
}

async function runDaily(now = new Date()) {
    const day = shopDay(now);
    const jobs = [
        ["shop", () => ensureShop(day)],
        ["tickdown", () => dailyTickdown()],
        ["stones", () => reclaimIdleStones(now)],
        ["trades", () => expireTrades(now)],
    ];
    for (const [name, job] of jobs) {
        try {
            if (name === "shop" || (await claimDay(name, day))) {
                const result = await job();
                if (typeof result === "number" && result > 0) console.log(`Steal and Defend ${name}: ${result}.`);
            }
        } catch (error) {
            console.error(`Steal and Defend's daily ${name} failed:`, error.message);
        }
    }
}

// Call once, after the database is connected.
async function startStealSweep() {
    if (sweepTask) return;
    // Makes the collections and indexes first: transactions can't.
    await Promise.all(MODELS.map((name) => mongoose.model(name).init()));
    sweepTask = cron.schedule("*/20 * * * * *", sweep, { name: "steal-sweep" });
    dailyTask = cron.schedule(`0 ${STEAL.daily.hour} * * *`, () => runDaily(), { timezone: STEAL.zone, name: "steal-daily" });
    // Down at 12:00 (a restart, a deploy): today's work, now. Each part
    // only runs once a day, so this is safe on every start.
    runDaily();
    sweep();
}

module.exports = { startStealSweep, runDaily, sweep };
