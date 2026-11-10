// Developer tools that only work while testing on your own computer, never
// on the live site. A request gets through only if both are true:
//   - the server was started with GOMOKU_DEV_TOOLS=true (in backend/.env on
//     your computer; never set it where the site is hosted), and
//   - it came from this same computer: through the Vite dev server's proxy
//     or straight to localhost, not from another machine or through a
//     hosting provider's proxy (which adds X-Forwarded-For).
// Anything else gets a 404, as if there were nothing there. The pages that
// use them only exist in the Vite dev server (import.meta.env.DEV), so a
// production build doesn't even have the buttons.

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function devToolsOn() {
    return process.env.GOMOKU_DEV_TOOLS === "true";
}

function fromThisComputer(req) {
    return LOOPBACK.has(req.socket?.remoteAddress) && !req.headers["x-forwarded-for"];
}

function requireDevTools(req, res, next) {
    if (!devToolsOn() || !fromThisComputer(req)) return res.status(404).json({ error: "Not found." });
    next();
}

module.exports = { requireDevTools, devToolsOn, fromThisComputer };
