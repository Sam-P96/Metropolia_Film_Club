const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Ranked lowest to highest. Matches frontend/src/utils/permissions.js.
const ROLE_RANK = { user: 0, moderator: 1, admin: 2 };

// Reads "Authorization: Bearer <token>" and returns the user it belongs to,
// or null. Never throws, so routes can decide whether a login is required.
async function userFromRequest(req) {
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) return null;

    try {
        const { _id } = jwt.verify(token, process.env.SECRET);
        return await User.findById(_id).select("_id username role privacy").lean();
    } catch {
        return null;
    }
}

// The route needs a logged-in member.
async function requireAuth(req, res, next) {
    const user = await userFromRequest(req);

    if (!user) {
        return res.status(401).json({ error: "Please log in again." });
    }

    req.user = user;
    next();
}

// The route works for everyone, but answers differently for a logged-in
// member (their own private profile, for example).
async function optionalAuth(req, res, next) {
    req.user = await userFromRequest(req);
    next();
}

// Each role can do everything the ones below it can.
function hasRole(user, minimum) {
    return (ROLE_RANK[user?.role] ?? 0) >= ROLE_RANK[minimum];
}

// Use after requireAuth.
function requireRole(minimum) {
    return (req, res, next) => {
        if (!hasRole(req.user, minimum)) {
            return res.status(403).json({ error: "You don't have permission to do that." });
        }

        next();
    };
}

module.exports = { requireAuth, optionalAuth, requireRole, hasRole };
