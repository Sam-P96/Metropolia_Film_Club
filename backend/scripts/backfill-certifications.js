// One-off: fills in `certification` (the US age rating) on film log entries
// saved before it existed, from TMDB, then works out everyone's Resonance
// again so the age rating counts straight away. New and updated entries get
// it when they're saved (controllers/filmController.js).
//
// From backend/, with MONGO_URI and TMDB_TOKEN in .env:
//   npm run backfill:certifications
//
// Each film is looked up once, however many members logged it, with a pause
// between lookups so TMDB's rate limit is never near. Safe to stop and run
// again: it only looks at entries that don't have the field yet. A film TMDB
// has no US age rating for is stored as null, so it isn't asked about
// twice; a lookup that fails is left for the next run.
require("dotenv").config();
const mongoose = require("mongoose");
const FilmLog = require("../models/filmLogModel");
const { getMovie, usCertification } = require("../services/tmdbService");
const { recalculateResonance } = require("../utils/resonanceStore");

// Between TMDB lookups.
const DELAY_MS = 250;

const MISSING = { certification: { $exists: false } };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function backfill() {
    const tmdbIds = await FilmLog.distinct("tmdbId", MISSING);
    console.log(`${tmdbIds.length} film(s) to look up.`);

    let filled = 0;
    let failed = 0;

    for (const [index, tmdbId] of tmdbIds.entries()) {
        try {
            const film = await getMovie(tmdbId);
            const certification = usCertification(film);

            // timestamps: false, so the entries don't look freshly edited.
            await FilmLog.updateMany({ tmdbId, ...MISSING }, { $set: { certification } }, { timestamps: false });
            filled += 1;
        } catch (error) {
            failed += 1;
            console.error(`Film ${tmdbId}: ${error.message}`);
        }

        if ((index + 1) % 50 === 0) console.log(`${index + 1} / ${tmdbIds.length}`);
        if (index < tmdbIds.length - 1) await wait(DELAY_MS);
    }

    console.log(`Done: ${filled} film(s) filled in${failed ? `, ${failed} failed (run it again for those)` : ""}.`);

    const { members, pairs } = await recalculateResonance();
    console.log(`Resonance worked out again: ${pairs} pair(s) between ${members} member(s).`);
}

mongoose
    .connect(process.env.MONGO_URI)
    .then(backfill)
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
