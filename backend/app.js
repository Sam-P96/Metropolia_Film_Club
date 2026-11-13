require('dotenv').config();
const path = require("path");
const fs = require("fs");
const express = require("express")
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const tmdbRouter = require("./routes/tmdb")
const userRouter = require("./routes/userRouter");
const wheelRouter = require("./routes/wheel");
const eventRouter = require("./routes/eventRouter");
const filmRouter = require("./routes/filmRouter");
const reviewRouter = require("./routes/reviewRouter");
const passwordResetRouter = require("./routes/passwordResetRouter");
const commentRouter = require("./routes/commentRouter");
const feedRouter = require("./routes/feedRouter");
const cutRouter = require("./routes/cutRouter");
const walletRouter = require("./routes/walletRouter");
const farkleRouter = require("./routes/farkleRouter");
const scratchRouter = require("./routes/scratchRouter");
const doubleRouter = require("./routes/doubleRouter");
const slotRouter = require("./routes/slotRouter");
const resonanceRouter = require("./routes/resonanceRouter");
const stealRouter = require("./routes/stealRouter");
const pokerRouter = require("./routes/pokerRouter");
const loanSharkRouter = require("./routes/loanSharkRouter");
const loanSharkAdminRouter = require("./routes/loanSharkAdminRouter");
const blackMarketRouter = require("./routes/blackMarketRouter");
const gomokuRouter = require("./routes/gomokuRouter");
const quizRouter = require("./routes/quizRouter");
const adminRouter = require("./routes/adminRouter");
const { refuseGameBans } = require("./middleware/gameBans");
const { recountDislikes } = require("./utils/pvp");
const { giveEveryoneAWallet } = require("./utils/wallet");
const { startDailyPayout } = require("./jobs/dailyPayout");
const { startFarkleSweep } = require("./jobs/farkleSweep");
const { startScratchSweep } = require("./jobs/scratchSweep");
const { startResonanceSweep } = require("./jobs/resonanceSweep");
const { startStealSweep } = require("./jobs/stealSweep");
const { startLoanSweep } = require("./jobs/loanSweep");
const { startSlotSweep } = require("./jobs/slotSweep");
const { startGomokuSweep } = require("./jobs/gomokuSweep");
const { startQuizDraw } = require("./jobs/quizDraw");

const app = express();

// Behind nginx or Cloudflare, the real visitor IP arrives in X-Forwarded-For.
// Without this, every request looks like it came from the proxy and the rate
// limiters below would throttle all visitors as though they were one person.
app.set("trust proxy", 1);

// A batch of defensive HTTP headers. The image rule is widened because posters
// come from TMDB and event images from wherever the organiser linked them.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https:"],
        },
    },
}));

// The frontend is same-origin — served by this server in production, proxied
// through Vite in development — so no browser ever makes a cross-origin call
// here. Set CLIENT_ORIGIN in .env only if you host the frontend elsewhere.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || false }));

// Gzip every response that's worth it: the API's JSON and, in production,
// the built frontend's JS and CSS, which shrink to about a third. At 12:00
// everyone opens the site at once for the daily resets, and smaller
// responses get through quicker. Its default filter skips what's already
// compressed (the MP4s and images). socket.io answers /socket.io/ on the
// HTTP server before Express sees it, so the live games aren't affected.
app.use(compression());

// The Daily Quiz's bulk upload of questions can be long: it gets more
// room than the 100 KB everything else has (routes/quizRouter.js).
app.use("/api/quiz/questions/bulk", express.json({ limit: "5mb" }));
app.use(express.json());

// Logs every request that takes over half a second, with how long it took,
// to find out what's slow at 12:00, when everyone opens the site at once
// for the daily resets. Quiet the rest of the day.
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const ms = Date.now() - start;
        if (ms > 500) console.log(`SLOW ${ms}ms ${req.method} ${req.originalUrl}`);
    });
    next();
});

// Dislikes only count from members with PVP on (see utils/pvp.js). A full
// recount once connected keeps the stored totals right, including dislikes
// given before PVP existed.
const connected = connectDB();

connected
    .then(() => recountDislikes())
    .catch((error) => console.error("Couldn't recount dislikes:", error.message));

// Wallets: give older accounts an empty one, then start the 12:00 PP payout.
connected
    .then(() => giveEveryoneAWallet())
    .then(() => startDailyPayout())
    .catch((error) => console.error("Couldn't start the wallets:", error.message));

// Farkle: forfeits games quiet for three days and tidies up (jobs/farkleSweep.js).
connected
    .then(() => startFarkleSweep())
    .catch((error) => console.error("Couldn't start the Farkle sweep:", error.message));

// Box Office Scratch: the jackpot pool, and paying out what a failure left
// unpaid (jobs/scratchSweep.js).
connected
    .then(() => startScratchSweep())
    .catch((error) => console.error("Couldn't start the scratch sweep:", error.message));

// Resonance: everyone's taste matches, worked out again at 04:00
// (jobs/resonanceSweep.js).
connected
    .then(() => startResonanceSweep())
    .catch((error) => console.error("Couldn't start the Resonance sweep:", error.message));

// Steal and Defend: attacks timing out, and the 12:00 shop, durability and
// idle Infinity Stones (jobs/stealSweep.js).
connected
    .then(() => startStealSweep())
    .catch((error) => console.error("Couldn't start the Steal and Defend sweep:", error.message));

// Loan Shark: job dislikes coming off again after 48 hours
// (jobs/loanSweep.js). Its daily work is part of the 12:00 payout.
connected
    .then(() => startLoanSweep())
    .catch((error) => console.error("Couldn't start the Loan Shark sweep:", error.message));

// Slot Machine: machines left alone for 15 minutes cash themselves out
// (jobs/slotSweep.js).
connected
    .then(() => startSlotSweep())
    .catch((error) => console.error("Couldn't start the Slot Machine sweep:", error.message));

// Infinite Gomoku: forfeits games quiet for three days and tidies up
// (jobs/gomokuSweep.js).
connected
    .then(() => startGomokuSweep())
    .catch((error) => console.error("Couldn't start the Gomoku sweep:", error.message));

// The Daily Quiz: Monday 12:00's weekly draw (jobs/quizDraw.js).
connected
    .then(() => startQuizDraw())
    .catch((error) => console.error("Couldn't start the quiz draw:", error.message));

// Guessing a password is cheap for an attacker and expensive for us: every
// attempt costs a bcrypt comparison. 20 per 15 minutes is generous for a
// human and useless for a script.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Try again in a few minutes." },
});

// Our TMDB proxy carries our API token, so without a limit anyone who finds
// it can use it as their own free TMDB API and burn through our quota.
const tmdbLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Slow down." },
});

app.use("/api/users/login", authLimiter);
app.use("/api/users/signup", authLimiter);
// "Forgot password?" sends an email, so it's limited the same way as login,
// or a script could make us send a flood of them.
app.post("/api/password-resets", authLimiter);
app.use("/api/tmdb", tmdbLimiter);

app.use("/api/tmdb", tmdbRouter);
app.use("/api/users", userRouter);

app.use("/api/wheel", wheelRouter);
app.use("/api/events", eventRouter);
app.use("/api/films", filmRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/comments", commentRouter);
app.use("/api/feed", feedRouter);
app.use("/api/cuts", cutRouter);
app.use("/api/wallet", walletRouter);
// An admin's "All games" ban stops anything being played (middleware/gameBans.js).
app.use("/api/farkle", refuseGameBans, farkleRouter);
app.use("/api/gomoku", refuseGameBans, gomokuRouter);
app.use("/api/quiz", quizRouter);
// The admin panel: admins only (routes/adminRouter.js).
app.use("/api/admin", adminRouter);
app.use("/api/scratch", refuseGameBans, scratchRouter);
app.use("/api/double-or-nothing", refuseGameBans, doubleRouter);
app.use("/api/slots", refuseGameBans, slotRouter);
app.use("/api/resonance", resonanceRouter);
app.use("/api/steal", stealRouter);
// Kino Poker's table summary (the game itself is live: games/poker/live.js).
app.use("/api/poker", pokerRouter);
// Loan Shark: borrowing from King Loan Shark and from each other. Paying
// back always goes through a games ban (middleware/gameBans.js).
// /SECRETloanshark: who King Loan Shark's jobs can pick (admins only). Ahead
// of the rest, so a games ban never gets in the way of an admin.
app.use("/api/loan-shark/admin", loanSharkAdminRouter);
app.use("/api/loan-shark", refuseGameBans, loanSharkRouter);
// The Black Market: cosmetics bought with P-PP (utils/blackMarket.js).
app.use("/api/black-market", blackMarketRouter);
app.use("/api/password-resets", passwordResetRouter);

app.get("/api/health", (req, res) => {
    res.json({status: "ok"})
});

// Anything under /api that no router claimed.
app.use("/api", (req, res) => {
    res.status(404).json({ error: "Not found" });
});

// --- the built frontend ---
// In development this folder doesn't exist: Vite serves the frontend on :5173
// and proxies /api here. In production `npm run build` creates it, and the
// whole site becomes one server on one port.
const frontendDist = path.join(__dirname, "..", "frontend", "dist");

if (fs.existsSync(frontendDist)) {
    // Vite puts a content hash in every asset filename, so those can be cached
    // hard. index: false keeps index.html out of this middleware so it's
    // always served fresh by the handler below.
    app.use(express.static(frontendDist, { index: false, maxAge: "1y" }));

    // Not an API route, not a real file — so it's a React Router path. Hand
    // back index.html and let the browser's router read the URL. Without this,
    // refreshing /films/969681 returns 404.
    app.use((req, res) => {
        res.sendFile(path.join(frontendDist, "index.html"));
    });
} else {
    console.log("No frontend build found. Run `npm run build` in /frontend to serve it from here.");
}

// Express 5 sends errors thrown in async handlers here. Answer in JSON, like
// every other API response, instead of Express's default HTML page.
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
});

module.exports = app;