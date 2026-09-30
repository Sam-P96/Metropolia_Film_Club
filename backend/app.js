require('dotenv').config();
const express = require("express")
const cors = require("cors");
const connectDB = require("./config/db");
const tmdbRouter = require("./routes/tmdb")
const userRouter = require("./routes/userRouter");

const app = express();

//Middlewares
app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/tmdb", tmdbRouter);
app.use("/api/users", userRouter);

app.get("/api/health", (req, res) => {
    res.json({status: "ok"})
});

module.exports = app;