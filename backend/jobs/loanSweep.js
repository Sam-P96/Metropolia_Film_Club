const cron = require("node-cron");
const { undoJobDislikes } = require("../utils/loanShark");
const { refreshStaleJobs } = require("../utils/loanShark/jobs");

// Loan Shark: every 10 minutes, the dislikes members made for a job come
// off again once they're 48 hours old, and anyone who hasn't paid King Loan
// Shark for a week gets a new set of jobs (utils/loanShark/jobs.js). The
// rest of Loan Shark's daily work happens in the 12:00 payout.
let task = null;

async function runLoanSweep() {
    try {
        const undone = await undoJobDislikes();
        if (undone > 0) console.log(`Loan Shark sweep: ${undone} job dislike(s) taken back.`);
        const dealt = await refreshStaleJobs();
        if (dealt > 0) console.log(`Loan Shark sweep: new jobs for ${dealt} borrower(s) who haven't paid in a week.`);
    } catch (error) {
        console.error("Loan Shark sweep failed:", error.message);
    }
}

// Call once, after the database is connected.
function startLoanSweep() {
    if (task) return;
    task = cron.schedule("*/10 * * * *", runLoanSweep, { name: "loan-shark-sweep" });
    runLoanSweep();
}

module.exports = { startLoanSweep, runLoanSweep };
