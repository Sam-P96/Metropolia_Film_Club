require('dotenv').config();
const path = require("path");
const fs = require("fs");
const express = require("express")
const cors = require("cors");
const helmet = require("helmet");
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
const { recountDislikes } = require("./utils/pvp");

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

app.use(express.json());

// Dislikes only count from members with PVP on (see utils/pvp.js). A full
// recount once connected keeps the stored totals right, including dislikes
// given before PVP existed.
connectDB()
    .then(() => recountDislikes())
    .catch((error) => console.error("Couldn't recount dislikes:", error.message));

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
// "Forgot password?" tells you whether an email has an account, so it's
// limited the same way, or a script could check a whole list.
app.use("/api/password-resets/check", authLimiter);
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