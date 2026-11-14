// Link previews (utils/linkPreview.js): every page is the built index.html
// with the site's preview, and an event's page gets the event's own: its
// title, when and where, and its image. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const mongoose = require("mongoose");
const express = require("express");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

// The block as frontend/index.html has it.
const INDEX = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <!-- link preview: the site's own. -->
    <title>Kino Kaverit</title>
    <meta property="og:title" content="Kino Kaverit" />
    <meta name="twitter:card" content="summary" />
    <!-- /link preview -->
  </head>
  <body><div id="root"></div></body>
</html>
`;

describe("link previews", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let Event;
    let User;
    let organiser;
    let dir;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        Event = require("../models/eventModel");
        User = require("../models/userModel");
        organiser = await User.create({ username: "organiser", email: "o@test.invalid", password: "x" });

        dir = fs.mkdtempSync(path.join(os.tmpdir(), "kino-preview-"));
        fs.writeFileSync(path.join(dir, "index.html"), INDEX);
        const { sendPage } = require("../utils/linkPreview");
        const app = express();
        app.use(sendPage(path.join(dir, "index.html")));
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
        server?.close();
        fs.rmSync(dir, { recursive: true, force: true });
        await mongoose.disconnect();
    });

    const page = async (address) => {
        const response = await fetch(base + address);
        return { status: response.status, type: response.headers.get("content-type"), cache: response.headers.get("cache-control"), html: await response.text() };
    };
    const event = (fields) =>
        Event.create({ title: "Dune night", startsAt: new Date("2026-11-21T16:00:00Z"), createdBy: organiser._id, ...fields });

    test("an event's page: its title, when and where, the start of its description, and its image", async () => {
        const dune = await event({
            location: "Kino Tapiola",
            description: "We're watching Dune: Part Two on the big screen. " + "Bring snacks. ".repeat(30),
            gifUrl: "https://media.example.com/dune.gif",
        });
        const { status, type, cache, html } = await page(`/club_events/${dune._id}`);
        assert.equal(status, 200);
        assert.match(type, /text\/html/);
        assert.equal(cache, "no-cache");
        assert.match(html, /<title>Dune night · Kino Kaverit<\/title>/);
        assert.match(html, /<meta property="og:title" content="Dune night" \/>/);
        assert.match(html, /<meta property="og:description" content="Sat 21 Nov, 18:00 · Kino Tapiola — We're watching Dune/);
        assert.match(html, /<meta property="og:image" content="https:\/\/media\.example\.com\/dune\.gif" \/>/);
        assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
        assert.match(html, new RegExp(`<meta property="og:url" content="http://127\\.0\\.0\\.1:\\d+/club_events/${dune._id}" />`));
        const description = html.match(/og:description" content="([^"]*)"/)[1];
        assert.ok(description.length < 220 && description.endsWith("…"), description);
        assert.ok(!html.includes('content="Kino Kaverit" />\n    <meta name="twitter:card" content="summary"'), "the site's block is gone");
        assert.equal(html.match(/<!-- \/link preview -->/g).length, 1);
    });

    test("member-written text is escaped, and an image that isn't a web address is left out", async () => {
        const sneaky = await event({ title: `"><script>alert(1)</script>`, description: "<b>bold</b> & more", gifUrl: "javascript:alert(1)" });
        const { html } = await page(`/club_events/${sneaky._id}`);
        assert.ok(!html.includes("<script>alert(1)</script>"));
        assert.match(html, /&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
        assert.match(html, /&lt;b&gt;bold&lt;\/b&gt; &amp; more/);
        assert.ok(!html.includes("og:image"));
        assert.match(html, /<meta name="twitter:card" content="summary" \/>/);
    });

    test("anything else is the page as it is: other pages, an unknown event, a bad id", async () => {
        for (const address of ["/", "/films/123", "/club_events", `/club_events/${new mongoose.Types.ObjectId()}`, "/club_events/nope", "/club_events/abc/edit"]) {
            const { status, html } = await page(address);
            assert.equal(status, 200, address);
            assert.equal(html, INDEX, address);
        }
    });
});
