// Banner videos (utils/bannerMedia.js): fetching a member's picture safely,
// turning it into a small MP4 (or a small JPEG for a still picture),
// recording it on the members whose banner it is, serving it, and keeping it
// when a banner is saved with the same picture. Against a real MongoDB.
//
// The conversions need ffmpeg (on the PATH, or FFMPEG_PATH); without it they
// skip. From backend/, with a MongoDB running:
//   bash:  MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test FFMPEG_PATH=/path/to/ffmpeg node --test tests/bannerMedia.test.js
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");

// Before bannerMedia is loaded: a media folder of the tests' own.
const MEDIA = fs.mkdtempSync(path.join(os.tmpdir(), "kino-banner-media-"));
process.env.BANNER_MEDIA_DIR = MEDIA;
process.env.SECRET ??= "banner-media-test-secret";

const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const hasFfmpeg = spawnSync(FFMPEG, ["-version"]).status === 0;
const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";
const media = require("../utils/bannerMedia");

describe("where a banner picture may be fetched from", () => {
    test("only the public internet", () => {
        for (const address of ["8.8.8.8", "1.1.1.1", "151.101.1.69", "2606:4700:4700::1111"]) assert.equal(media.isPublicAddress(address), true, address);
        for (const address of ["127.0.0.1", "10.1.2.3", "172.16.5.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "nonsense"]) {
            assert.equal(media.isPublicAddress(address), false, address);
        }
    });

    test("download refuses other kinds of link, this machine (by name or address) and the local network", async () => {
        // A real picture server here, so a refusal is the check and not a failed fetch.
        const server = http.createServer((req, res) => res.writeHead(200, { "Content-Type": "image/gif" }).end("GIF89a"));
        await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
        const port = server.address().port;
        const file = path.join(MEDIA, "never.gif");
        try {
            await assert.rejects(media.download("file:///etc/passwd", file), /http/);
            await assert.rejects(media.download("ftp://example.com/a.gif", file), /http/);
            await assert.rejects(media.download(`http://127.0.0.1:${port}/a.gif`, file), /public/);
            await assert.rejects(media.download(`http://localhost:${port}/a.gif`, file), /public/);
            await assert.rejects(media.download("http://169.254.169.254/latest/meta-data/", file), /public/);
            assert.equal(fs.existsSync(file), false, "nothing was written");
        } finally {
            server.close();
        }
    });
});

describe("banner videos", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : !hasFfmpeg ? "needs ffmpeg (FFMPEG_PATH)" : false }, () => {
    let User;
    let base;
    let server;
    const pictures = {};
    const fetched = [];
    // Instead of the network: the test's own pictures, by link.
    const fetchTo = async (url, file) => {
        fetched.push(url);
        if (!pictures[url]) throw new Error("No such picture.");
        fs.copyFileSync(pictures[url], file);
    };
    const ANIMATED = "https://pictures.example/animated.gif";
    const STILL = "https://pictures.example/still.png";
    const OTHER = "https://pictures.example/other.gif";

    before(async () => {
        const work = fs.mkdtempSync(path.join(os.tmpdir(), "kino-banner-src-"));
        pictures[ANIMATED] = path.join(work, "animated.gif");
        pictures[STILL] = path.join(work, "still.png");
        assert.equal(spawnSync(FFMPEG, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=800x300:rate=10", "-t", "1.5", pictures[ANIMATED]]).status, 0);
        assert.equal(spawnSync(FFMPEG, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=1201x500", "-frames:v", "1", pictures[STILL]]).status, 0);

        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");

        const app = express();
        app.use(express.json());
        app.use(media.PUBLIC_PATH, media.bannerMediaRoute());
        app.use("/api/users", require("../routes/userRouter"));
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
        fs.rmSync(MEDIA, { recursive: true, force: true });
    });

    let count = 0;
    const member = (imageUrl) => {
        count += 1;
        return User.create({
            username: `bannered${count}`,
            email: `b${count}@test.invalid`,
            password: "x",
            reviewCardBanner: { type: "image", color: "#2D1B47", imageUrl, style: "opaque", position: { x: 30, y: 70 } },
        });
    };
    const bannerOf = async (user) => (await User.findById(user._id).lean()).reviewCardBanner;
    const widthOf = (file) => Number(/, (\d+)x\d+/.exec(spawnSync(FFMPEG, ["-hide_banner", "-i", file]).stderr.toString())?.[1]);

    test("an animated picture: a small MP4 and its poster, recorded on everyone whose banner it is", async () => {
        const [a, b, other] = [await member(ANIMATED), await member(ANIMATED), await member(OTHER)];
        const made = await media.convertBanner(ANIMATED, { fetchTo });
        assert.ok(made?.video?.startsWith(`${media.PUBLIC_PATH}/`) && made.video.endsWith(".mp4"), JSON.stringify(made));
        assert.ok(made.poster.endsWith(".jpg"));

        const mp4 = path.join(MEDIA, path.basename(made.video));
        assert.ok(fs.existsSync(mp4));
        assert.equal(widthOf(mp4), 552);
        assert.ok(fs.statSync(mp4).size < 300 * 1024, `small: ${fs.statSync(mp4).size} bytes`);

        for (const user of [a, b]) assert.deepEqual((await bannerOf(user)).converted, { from: ANIMATED, video: made.video, poster: made.poster });
        assert.equal((await bannerOf(other)).converted, undefined, "a different picture isn't touched");
        assert.deepEqual((await bannerOf(a)).position, { x: 30, y: 70 }, "nothing else about the banner changes");

        // Made once: asking again doesn't fetch it again.
        const before = fetched.length;
        await media.convertBanner(ANIMATED, { fetchTo });
        assert.equal(fetched.length, before);
    });

    test("a still picture: only its small copy, no video; an odd width still works", async () => {
        const still = await member(STILL);
        const made = await media.convertBanner(STILL, { fetchTo });
        assert.equal(made.video, null);
        assert.equal(widthOf(path.join(MEDIA, path.basename(made.poster))), 552);
        assert.equal((await bannerOf(still)).converted.video, null);
    });

    test("a picture that can't be fetched stays as it is", async () => {
        const broken = await member("https://pictures.example/missing.gif");
        assert.equal(await media.convertBanner("https://pictures.example/missing.gif", { fetchTo }), null);
        assert.equal((await bannerOf(broken)).converted, undefined);
    });

    test("served with range requests, and nothing else from the folder", async () => {
        const made = (await bannerOf(await User.findOne({ "reviewCardBanner.imageUrl": ANIMATED }))).converted;
        const part = await fetch(base + made.video, { headers: { Range: "bytes=0-99" } });
        assert.equal(part.status, 206);
        assert.equal(part.headers.get("content-type"), "video/mp4");
        assert.equal((await part.arrayBuffer()).byteLength, 100);
        assert.match(part.headers.get("cache-control"), /max-age=604800/);
        assert.equal((await fetch(`${base}${media.PUBLIC_PATH}/nope.mp4`)).status, 404);
        fs.mkdirSync(path.join(MEDIA, ".work-x"), { recursive: true });
        fs.writeFileSync(path.join(MEDIA, ".work-x", "input"), "x");
        assert.equal((await fetch(`${base}${media.PUBLIC_PATH}/.work-x/input`)).status, 404);
    });

    test("the start-up sweep makes what's missing, and again if the files were wiped", async () => {
        const later = await member(OTHER);
        pictures[OTHER] = pictures[ANIMATED];
        assert.ok((await media.sweepBanners({ fetchTo })) >= 1);
        assert.equal((await bannerOf(later)).converted.from, OTHER);

        // The disk wiped (a redeploy): made again.
        for (const file of fs.readdirSync(MEDIA)) if (!file.startsWith(".")) fs.rmSync(path.join(MEDIA, file));
        assert.ok((await media.sweepBanners({ fetchTo })) >= 1);
        assert.ok(fs.existsSync(path.join(MEDIA, path.basename((await bannerOf(later)).converted.poster))));
    });

    test("saving a banner: the same picture keeps its copies, any style is saved as opaque", async () => {
        const me = await member(ANIMATED);
        await media.convertBanner(ANIMATED, { fetchTo });
        const token = jwt.sign({ _id: me._id }, process.env.SECRET);
        const save = (banner) =>
            fetch(`${base}/api/users/me`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ reviewCardBanner: banner }),
            });

        // Moved, and asking for glass: still its copies, and opaque.
        let response = await save({ type: "image", color: "#2D1B47", imageUrl: ANIMATED, style: "glass", position: { x: 10, y: 20 } });
        assert.equal(response.status, 200);
        let banner = await bannerOf(me);
        assert.equal(banner.style, "opaque");
        assert.deepEqual(banner.position, { x: 10, y: 20 });
        assert.equal(banner.converted.from, ANIMATED);
        assert.equal((await response.json()).reviewCardBanner.converted.from, ANIMATED, "sent back to the page");

        // A colour banner: the copies go with the picture.
        response = await save({ type: "color", color: "#821131", imageUrl: null });
        assert.equal(response.status, 200);
        banner = await bannerOf(me);
        assert.equal(banner.converted, undefined);
    });
});
