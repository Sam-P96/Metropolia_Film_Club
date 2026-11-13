const { AdminError, MAX_GRANT, MAX_NOTE, grantPpp, recentGrants } = require("../utils/admin");

// The admin panel (routes/adminRouter.js), admins only.

async function handle(res, work) {
    try {
        await work();
    } catch (error) {
        if (!(error instanceof AdminError)) throw error;
        res.status(error.status).json({ error: error.message });
    }
}

// What the panel shows: the latest P-PP sends, and the limits on one.
const getPanel = (req, res) =>
    handle(res, async () => res.json({ grants: await recentGrants(), maxGrant: MAX_GRANT, maxNote: MAX_NOTE }));

// { userId, amount, note }: send P-PP to a member.
const sendPpp = (req, res) =>
    handle(res, async () => {
        const sent = await grantPpp(req.user._id, req.body?.userId, req.body?.amount, req.body?.note);
        res.status(201).json({ sent, grants: await recentGrants() });
    });

module.exports = { getPanel, sendPpp };
