const http = require("http");
const app = require('./app');
const { startLive } = require("./games/farkle/live");

const PORT = process.env.PORT || 3000;

// One HTTP server for both the API (app) and Play Live (socket.io, which
// answers at /socket.io/). app.listen would make a server of its own that
// socket.io couldn't share.
const server = http.createServer(app);
startLive(server);

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
