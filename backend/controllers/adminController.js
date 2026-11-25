const { AdminError, awardPackFromPanel, grantPpp, membersList, recentGrants } = require("../utils/admin");

// The admin panel's own tools (routes/adminRouter.js), admins only: Send
// P-PP (in the admin panel and, for admins, the Wallet) and Award booster
// packs.

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

// Every member, A to Z, 30 at a time: { members, hasMore }. `?q=` narrows
// it to usernames containing it; `?skip=` is how many already shown.
const listMembers = (req, res) => handle(res, async () => res.json(await membersList(String(req.query.q ?? ""), Number(req.query.skip ?? 0))));

// { userId, kind }: a Catflix No Chill booster pack for a member.
const awardPack = (req, res) =>
    handle(res, async () => {
        const awarded = await awardPackFromPanel(req.user._id, req.body?.userId, req.body?.kind);
        res.status(201).json({ awarded });
    });

module.exports = { listGrants, sendPpp, listMembers, awardPack };
