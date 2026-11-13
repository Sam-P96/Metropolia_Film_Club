const { FirstPlaceError, firstPlaceView, saveFirstPlaceFx } = require("../utils/firstPlace");

// First Place (routes/firstPlaceRouter.js): who's #1 on each ranking, and
// their name effect's settings.

async function handle(res, work) {
    try {
        await work();
    } catch (error) {
        if (!(error instanceof FirstPlaceError)) throw error;
        res.status(error.status).json({ error: error.message });
    }
}

// For anyone: { titles: { pp, critics, controversial, level }, settings: { [userId]: fx } }.
const getFirstPlace = (req, res) => handle(res, async () => res.json(await firstPlaceView()));

// A holder of any title saving their effect settings: { settings }.
const putFirstPlaceSettings = (req, res) =>
    handle(res, async () => res.json({ settings: await saveFirstPlaceFx(req.user._id, req.body) }));

module.exports = { getFirstPlace, putFirstPlaceSettings };
