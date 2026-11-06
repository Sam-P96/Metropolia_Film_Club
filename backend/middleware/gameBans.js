const { userFromToken } = require("./auth");
const { activeBansOf, banFor, banMessage } = require("../utils/steal/moderation");

// An admin's "All games" ban (utils/steal/moderation.js): the games' pages
// still load, but nothing that plays, bets or changes anything goes
// through. Taking points back out (the Slot Machine's cash-out, collecting
// a finished scratch card) still works, so a ban never traps anyone's
// points. Mounted in front of each game's router in app.js, where nobody
// has checked the login yet, so it reads the token itself; with no login
// it lets the router's own requireAuth answer.
// In Steal and Defend the same goes for selling items back, taking them off
// the market, out of an offer, or declining one. (Turning PVP off is a
// profile setting, which a games ban doesn't touch.) In Loan Shark, paying
// back and taking an offer down always work, so a ban never traps anyone
// in debt.
const ALWAYS_ALLOWED = [
    /^\/api\/slots\/cash-out$/,
    /^\/api\/scratch\/cards\/[^/]+\/collect$/,
    /^\/api\/steal\/items\/[^/]+\/(sell|unequip)$/,
    /^\/api\/steal\/trades\/[^/]+\/(cancel|decline)$/,
    /^\/api\/loan-shark\/shark\/pay$/,
    /^\/api\/loan-shark\/debts\/[^/]+\/pay$/,
];

async function refuseGameBans(req, res, next) {
    if (req.method === "GET" || req.method === "HEAD") return next();
    const path = (req.originalUrl ?? "").split("?")[0];
    if (ALWAYS_ALLOWED.some((pattern) => pattern.test(path))) return next();
    if (req.method === "DELETE" && /^\/api\/(steal\/market|loan-shark\/offers)\/[^/]+$/.test(path)) return next();

    let user = req.user ?? null;
    if (!user) {
        const [scheme, token] = (req.headers.authorization ?? "").split(" ");
        user = scheme === "Bearer" ? await userFromToken(token) : null;
    }
    if (!user) return next();

    const ban = banFor(await activeBansOf(user._id), "games");
    if (ban) return res.status(403).json({ error: banMessage(ban, "games"), code: "BANNED" });
    next();
}

module.exports = { refuseGameBans };
