const crypto = require("crypto");
const dns = require("dns");
const fs = require("fs");
const http = require("http");
const https = require("https");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
const express = require("express");
const User = require("../models/userModel");

// Members' review card banners as small files the site serves itself: an
// animated picture (a GIF) as a short looping MP4 about 552px wide, which
// phones decode in hardware, pause off screen and hold still for reduce
// motion; a still picture as a small JPEG. Both with a first-frame poster.
// The pages use them in place of the original picture
// (frontend/src/components/profile/BannerFill.jsx), and fall back to the
// original until they exist.
//
// Made with the host's own ffmpeg: `ffmpeg` on the PATH, or FFMPEG_PATH in
// .env. Without it, banners simply stay as their original pictures. The
// files are kept on the server's disk (media/banners, not in git); if the
// disk is wiped on a redeploy, the start-up sweep makes them again.

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
// BANNER_MEDIA_DIR moves them (the tests use a folder of their own).
const MEDIA_DIR = process.env.BANNER_MEDIA_DIR || path.join(__dirname, "..", "media", "banners");
const PUBLIC_PATH = "/api/banner-media";

const WIDTH = 552;
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_SECONDS = 20; // of a long animation
const TIMEOUT_MS = 20000;
const MAX_REDIRECTS = 3;

// ---- fetching a member's link, safely ----
// The server fetching a link a member typed must never reach anything that
// isn't the public internet (this machine, the local network, a cloud
// host's metadata address). Every address a host name leads to is checked
// as the connection is made, redirects included.
const BLOCKED = new net.BlockList();
for (const [address, prefix] of [
    ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
    ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4],
]) BLOCKED.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["64:ff9b::", 96]]) {
    BLOCKED.addSubnet(address, prefix, "ipv6");
}

// Whether `address` (an IP) is on the public internet.
function isPublicAddress(address) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped) return isPublicAddress(mapped[1]);
    const family = net.isIP(address);
    if (family === 4) return !BLOCKED.check(address, "ipv4");
    if (family === 6) return !BLOCKED.check(address, "ipv6");
    return false;
}

// dns.lookup, refusing any host that leads to a non-public address.
function publicLookup(hostname, options, callback) {
    dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error);
        const refused = addresses.find((entry) => !isPublicAddress(entry.address));
        if (refused || addresses.length === 0) return callback(new Error(`Refused: ${hostname} isn't a public address.`));
        if (options?.all) return callback(null, addresses);
        callback(null, addresses[0].address, addresses[0].family);
    });
}

// Downloads the picture at `url` into `file`: http(s) only, an image, at most
// MAX_BYTES, following at most MAX_REDIRECTS redirects.
function download(url, file, redirects = MAX_REDIRECTS) {
    return new Promise((resolve, reject) => {
        let parsed;
        try {
            parsed = new URL(url);
        } catch {
            return reject(new Error("Not a link."));
        }
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return reject(new Error("Only http and https links."));
        // A link straight to an address never asks for a lookup, so it's
        // checked here.
        const literal = parsed.hostname.replace(/^\[|\]$/g, "");
        if (net.isIP(literal) && !isPublicAddress(literal)) return reject(new Error(`Refused: ${literal} isn't a public address.`));

        const get = parsed.protocol === "https:" ? https.get : http.get;
        const request = get(parsed, { lookup: publicLookup, timeout: TIMEOUT_MS, headers: { "User-Agent": "KinoKaverit-banners/1.0", Accept: "image/*" } }, (response) => {
            const { statusCode, headers } = response;
            if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location) {
                response.resume();
                if (redirects <= 0) return reject(new Error("Too many redirects."));
                return resolve(download(new URL(headers.location, parsed).href, file, redirects - 1));
            }
            if (statusCode !== 200) {
                response.resume();
                return reject(new Error(`The link answered ${statusCode}.`));
            }
            if (!/^image\//i.test(headers["content-type"] ?? "")) {
                response.resume();
                return reject(new Error("The link isn't an image."));
            }
            if (Number(headers["content-length"]) > MAX_BYTES) {
                response.resume();
                return reject(new Error("The image is too big."));
            }

            let size = 0;
            const out = fs.createWriteStream(file);
            response.on("data", (chunk) => {
                size += chunk.length;
                if (size > MAX_BYTES) request.destroy(new Error("The image is too big."));
            });
            response.on("error", reject);
            out.on("error", reject);
            out.on("finish", () => resolve(file));
            response.pipe(out);
        });
        request.on("timeout", () => request.destroy(new Error("The link took too long.")));
        request.on("error", reject);
    });
}

// ---- ffmpeg ----

// Runs ffmpeg with `args`, resolving to what it wrote to stderr.
function ffmpeg(args) {
    return new Promise((resolve, reject) => {
        const child = spawn(FFMPEG, ["-hide_banner", "-nostdin", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
        let log = "";
        child.stderr.on("data", (chunk) => {
            log = (log + chunk).slice(-8000);
        });
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve(log) : reject(new Error(`ffmpeg failed (${code}): ${log.split("\n").filter(Boolean).pop() ?? ""}`))));
    });
}

// Whether this host has ffmpeg, found out once.
let ready = null;
function ffmpegReady() {
    ready ??= ffmpeg(["-version"]).then(
        () => true,
        () => {
            console.log("Banner videos: no ffmpeg found (put it on the PATH or set FFMPEG_PATH), so banners stay as their pictures.");
            return false;
        }
    );
    return ready;
}

const SCALE = `scale='trunc(min(${WIDTH},iw)/2)*2':-2:flags=lanczos`;

// Turns the picture in `input` into `<base>.mp4` (if it moves) and
// `<base>.jpg` (its first frame, about WIDTH wide). Resolves to whether it
// moves.
async function convertFile(input, base) {
    const log = await ffmpeg([
        "-i", input, "-t", String(MAX_SECONDS), "-an", "-movflags", "+faststart", "-pix_fmt", "yuv420p",
        "-vf", SCALE, "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", `${base}.mp4`,
    ]);
    const frames = Number([...log.matchAll(/frame=\s*(\d+)/g)].pop()?.[1] ?? 0);
    const moves = frames > 1;

    if (moves) {
        await ffmpeg(["-i", `${base}.mp4`, "-frames:v", "1", "-q:v", "4", `${base}.jpg`]);
    } else {
        // A still picture: just the small copy.
        fs.rmSync(`${base}.mp4`, { force: true });
        await ffmpeg(["-i", input, "-frames:v", "1", "-vf", SCALE, "-q:v", "4", `${base}.jpg`]);
    }
    return moves;
}

// ---- the banners ----

const nameFor = (imageUrl) => crypto.createHash("sha1").update(imageUrl).digest("hex").slice(0, 20);
const filesFor = (name) => ({ mp4: path.join(MEDIA_DIR, `${name}.mp4`), jpg: path.join(MEDIA_DIR, `${name}.jpg`) });

// What a member's banner records once its files exist (models/userModel.js).
const convertedFor = (imageUrl, name, moves) => ({
    from: imageUrl,
    video: moves ? `${PUBLIC_PATH}/${name}.mp4` : null,
    poster: `${PUBLIC_PATH}/${name}.jpg`,
});

// Makes the files for `imageUrl` (unless they're there already) and records
// them on every member whose banner is still that picture. `fetchTo` is how
// the picture is fetched (the tests pass their own). Never throws: a link
// that can't be fetched or converted stays as the original picture.
async function convertBanner(imageUrl, { fetchTo = download } = {}) {
    if (!(await ffmpegReady())) return null;

    const name = nameFor(imageUrl);
    const files = filesFor(name);
    try {
        let moves = fs.existsSync(files.mp4);
        if (!fs.existsSync(files.jpg)) {
            fs.mkdirSync(MEDIA_DIR, { recursive: true });
            // Worked on beside where the files go (the same disk, so they can
            // be moved into place), in a hidden folder nobody is served.
            const work = fs.mkdtempSync(path.join(MEDIA_DIR, ".work-"));
            try {
                const input = path.join(work, "input");
                await fetchTo(imageUrl, input);
                moves = await convertFile(input, path.join(work, "out"));
                // Into place only once both are made.
                if (moves) fs.renameSync(path.join(work, "out.mp4"), files.mp4);
                fs.renameSync(path.join(work, "out.jpg"), files.jpg);
            } finally {
                fs.rmSync(work, { recursive: true, force: true });
            }
        }

        const converted = convertedFor(imageUrl, name, moves);
        await User.updateMany(
            { "reviewCardBanner.type": "image", "reviewCardBanner.imageUrl": imageUrl },
            { $set: { "reviewCardBanner.converted": converted } },
            { timestamps: false }
        );
        return converted;
    } catch (error) {
        console.error(`Banner video for ${imageUrl}: ${error.message}`);
        return null;
    }
}

// One conversion at a time, and each picture once however many ask.
let queue = Promise.resolve();
const waiting = new Map();

function queueBannerConversion(imageUrl, options) {
    if (!imageUrl) return Promise.resolve(null);
    if (waiting.has(imageUrl)) return waiting.get(imageUrl);
    const done = queue.then(() => convertBanner(imageUrl, options)).finally(() => waiting.delete(imageUrl));
    queue = done.catch(() => {});
    waiting.set(imageUrl, done);
    return done;
}

// After start-up: every picture banner without its files yet (new, saved
// while ffmpeg was missing, or wiped with the disk) is made, one at a time.
async function sweepBanners(options) {
    if (!(await ffmpegReady())) return 0;
    const members = await User.find({ "reviewCardBanner.type": "image", "reviewCardBanner.imageUrl": { $nin: [null, ""] } })
        .select("reviewCardBanner")
        .lean();
    const missing = new Set();
    for (const { reviewCardBanner: banner } of members) {
        const files = filesFor(nameFor(banner.imageUrl));
        const made = banner.converted?.from === banner.imageUrl && fs.existsSync(files.jpg);
        if (!made) missing.add(banner.imageUrl);
    }
    await Promise.all([...missing].map((imageUrl) => queueBannerConversion(imageUrl, options)));
    return missing.size;
}

// A member's saved banner, before it's saved: keeps the files already made
// for it if the picture hasn't changed (only its position, say).
function keepConverted(newBanner, oldBanner) {
    if (newBanner?.type === "image" && newBanner.imageUrl && oldBanner?.converted?.from === newBanner.imageUrl) {
        return { ...newBanner, converted: oldBanner.converted };
    }
    return newBanner;
}

// Serves the files (app.js mounts it at PUBLIC_PATH), with range requests for
// video seeking (iOS Safari needs them). A name is a hash of the picture's
// link, so a file never changes under it: cached for a week. Hidden folders
// (the work in progress) and anything that isn't there are a plain 404.
function bannerMediaRoute() {
    const router = express.Router();
    router.use(express.static(MEDIA_DIR, { maxAge: "7d", index: false, dotfiles: "ignore" }));
    router.use((req, res) => res.status(404).end());
    return router;
}

module.exports = {
    MEDIA_DIR,
    PUBLIC_PATH,
    bannerMediaRoute,
    isPublicAddress,
    download,
    convertBanner,
    queueBannerConversion,
    sweepBanners,
    keepConverted,
};
