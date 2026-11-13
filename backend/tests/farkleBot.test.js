// Kino Farkle against Clanker (POST /api/farkle/bot): a die decides who
// starts, 1 to 3 Clanker (whose first turn is played straight away), 4 to 6
// the member. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "farkle-bot-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");
const { botPrize, clankerStarts } = require("../../shared/farkle/rules.js");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("Farkle against Clanker: who starts", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let token;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        const FarkleMatch = require("../models/farkleMatchModel");
        await Promise.all([User, FarkleMatch].map((model) => model.syncIndexes()));
        const player = await User.create({ username: "roller", email: "roller@test.invalid", password: "x", wallet: { pp: 0, ppp: 10000 } });
        token = jwt.sign({ _id: player._id }, process.env.SECRET);

        const app = express();
        app.use(express.json());
        app.use("/api/farkle", require("../routes/farkleRouter"));
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api/farkle`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    const call = async (method, path, body) => {
        const response = await fetch(base + path, {
            method,
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: body && JSON.stringify(body),
        });
        return { status: response.status, body: await response.json() };
    };

    test("each new game rolls a die: 1 to 3 Clanker has had its first turn and a win pays double, 4 to 6 it's the member's to start", async () => {
        const seen = new Set();
        for (let i = 0; i < 16; i++) {
            const started = await call("POST", "/bot", { target: 8000, stake: 10 });
            assert.equal(started.status, 201, JSON.stringify(started.body));
            const match = started.body;
            assert.ok(Number.isInteger(match.firstRoll) && match.firstRoll >= 1 && match.firstRoll <= 6, String(match.firstRoll));
            seen.add(clankerStarts(match.firstRoll));
            // Stake 10: 20 when Clanker starts, 15 when the member does.
            assert.equal(match.prize, clankerStarts(match.firstRoll) ? 20 : 15);
            assert.deepEqual([botPrize(10), botPrize(10, true)], [15, 20]);

            if (clankerStarts(match.firstRoll)) {
                // Clanker went first: its turn is done, and it's the member's go (seat 1).
                assert.equal(match.lastTurns[0]?.seat, 0);
                assert.equal(match.current, 1);
                assert.equal(match.turn, 2);
            } else {
                assert.deepEqual([match.lastTurns.length, match.current, match.turn, match.scores], [0, 1, 1, [0, 0]]);
            }

            // Fold, so the next game can start.
            const folded = await call("POST", `/matches/${match._id}/moves`, { version: match.version, type: "resign" });
            assert.equal(folded.body.status, "over");
        }
        // Sixteen rolls: both ways came up (a 1 in 32,768 chance they wouldn't).
        assert.deepEqual([...seen].sort(), [false, true]);
    });

    test("stakes against Clanker go up to 1,500", async () => {
        assert.equal((await call("POST", "/bot", { target: 8000, stake: 1501 })).status, 400);
        const started = await call("POST", "/bot", { target: 8000, stake: 1500 });
        assert.equal(started.status, 201, JSON.stringify(started.body));
        assert.equal(started.body.prize, clankerStarts(started.body.firstRoll) ? 3000 : 2250);
        await call("POST", `/matches/${started.body._id}/moves`, { version: started.body.version, type: "resign" });
    });
});
