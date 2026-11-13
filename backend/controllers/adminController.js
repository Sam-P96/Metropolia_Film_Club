const { AdminError, grantPpp, recentGrants } = require("../utils/admin");

// The admin panel's Send P-PP tool (routes/adminRouter.js), admins only.
// It's in the admin panel and, for admins, the Wallet.

async function handle(res, work) {
    try {
        await work();
    } catch (error) {
        if (!(error instanceof AdminError)) throw error;
        res.status(error.status).json({ error: error.message });
    }
}

// Every send by every admin, newest first, a page at a time:
// { grants, hasMore }. `?before=` is the last one of the page before.
const listGrants = (req, res) => handle(res, async () => res.json(await recentGrants(req.query.before || null)));

// { userId, amount, note }: send P-PP to a member, or to themselves.
const sendPpp = (req, res) =>
    handle(res, async () => {
        const sent = await grantPpp(req.user._id, req.body?.userId, req.body?.amount, req.body?.note);
        res.status(201).json({ sent });
    });

module.exports = { listGrants, sendPpp };
