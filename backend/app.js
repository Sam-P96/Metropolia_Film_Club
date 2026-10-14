require('dotenv').config();
const express = require("express")
const cors = require("cors");
const connectDB = require("./config/db");
const tmdbRouter = require("./routes/tmdb")
const userRouter = require("./routes/userRouter");
const wheelRouter = require("./routes/wheel");
const eventRouter = require("./routes/eventRouter");
const filmRouter = require("./routes/filmRouter");
const reviewRouter = require("./routes/reviewRouter");

const app = express();

//Middlewares
app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/tmdb", tmdbRouter);
app.use("/api/users", userRouter);

app.use("/api/wheel", wheelRouter);
app.use("/api/events", eventRouter);
app.use("/api/films", filmRouter);
app.use("/api/reviews", reviewRouter);

app.get("/api/health", (req, res) => {
    res.json({status: "ok"})
});

// Anything under /api that no router claimed.
app.use("/api", (req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Express 5 sends errors thrown in async handlers here. Answer in JSON, like
// every other API response, instead of Express's default HTML page.
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
});

module.exports = app;