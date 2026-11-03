// Works out everyone's Resonance again now, instead of waiting for 04:00
// (jobs/resonanceSweep.js), for after changing the weights in
// utils/resonance.js or the tiers in shared/resonance.js.
//
// From backend/, with MONGO_URI in .env:
//   npm run resonance:sweep
require("dotenv").config();
const mongoose = require("mongoose");
const { recalculateResonance } = require("../utils/resonanceStore");

mongoose
    .connect(process.env.MONGO_URI)
    .then(recalculateResonance)
    .then(({ members, pairs }) => console.log(`Resonance worked out again: ${pairs} pair(s) between ${members} member(s).`))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
