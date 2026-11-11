const cron = require("node-cron");
const { runDraw, payUnpaidDraws } = require("../utils/quiz");

// Every Monday at 12:00 (Helsinki): the Daily Quiz's weekly draw for the
// week just ended (utils/quiz.js runDraw). Also on starting, for a draw
// missed while the server was down, and any payout that failed.
let task = null;

async function draw() {
    try {
        await payUnpaidDraws();
        const done = await runDraw();
        if (done) console.log(`Quiz draw: ${done.winner ? `won by ${done.winner}, ${done.prize} P-PP` : "nobody played"} (${done.tickets} tickets).`);
    } catch (error) {
        console.error("Quiz draw failed:", error.message);
    }
}

// Call once, after the database is connected.
function startQuizDraw() {
    if (task) return;
    task = cron.schedule("0 12 * * 1", draw, { timezone: "Europe/Helsinki", name: "quiz-draw", noOverlap: true });
    draw();
}

module.exports = { startQuizDraw, draw };
