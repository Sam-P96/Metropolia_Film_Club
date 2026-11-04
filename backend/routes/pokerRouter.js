const express = require("express");
const { POKER } = require("../../shared/poker/config.js");
const { getTable } = require("../games/poker/live");

const router = express.Router();

// How busy the Kino Poker table is, for the Games page and the game's
// intro: { members, bots, queue, seats, playing }. Anyone can look. Playing
// itself is over the live connection (games/poker/live.js).
router.get("/table", (req, res) => {
    res.json(getTable()?.summary() ?? { members: 0, bots: 0, queue: 0, seats: POKER.seats, playing: false });
});

module.exports = router;
