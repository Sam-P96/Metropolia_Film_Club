const { ShopError, WalletError, shopView, buyCosmetic, wearCosmetic, wishCosmetic } = require("../utils/blackMarket");

// The Black Market (routes/blackMarketRouter.js). Every rule is checked in
// utils/blackMarket.js; these read the request and answer with what
// happened and the member's shop state as it now is.

async function handle(res, work) {
    try {
        await work();
    } catch (error) {
        if (!(error instanceof ShopError) && !(error instanceof WalletError)) throw error;
        res.status(error.status).json({ error: error.message });
    }
}

const getShop = (req, res) => handle(res, async () => res.json(await shopView(req.user._id)));

const buy = (req, res) =>
    handle(res, async () => {
        const done = await buyCosmetic(req.user._id, req.body?.itemId);
        res.status(201).json({ done, view: await shopView(req.user._id) });
    });

const wear = (req, res) =>
    handle(res, async () => {
        const done = await wearCosmetic(req.user._id, req.body?.type, req.body?.itemId ?? null);
        res.json({ done, view: await shopView(req.user._id) });
    });

const wish = (req, res) =>
    handle(res, async () => {
        const done = await wishCosmetic(req.user._id, req.body?.itemId, req.body?.on);
        res.json({ done, view: await shopView(req.user._id) });
    });

// Admins only: the developer test tool asks this to know it may open. It
// reads and writes nothing else.
const devAccess = (req, res) => res.json({ ok: true });

module.exports = { getShop, buy, wear, wish, devAccess };
