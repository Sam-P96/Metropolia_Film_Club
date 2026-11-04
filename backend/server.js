const http = require("http");
const app = require('./app');
const { startLive } = require("./games/farkle/live");
const { startPoker } = require("./games/poker/live");

const PORT = process.env.PORT || 3000;

// One HTTP server for both the API (app) and the live games (socket.io,
// which answers at /socket.io/): Kino Farkle's Play Live and the Kino Poker
// table share one connection. app.listen would make a server of its own
// that socket.io couldn't share.
const server = http.createServer(app);
const io = startLive(server);
startPoker(io);

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
