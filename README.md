# Kino Kaverit

Website for Kino Kaverit, a film club at Metropolia. Members can see trending films, read
reviews, check upcoming events, and create an account.

The repo has two parts:

- `frontend/` is the React app (Vite, Tailwind, React Router).
- `backend/` is the Express API (MongoDB via Mongoose, JWT auth). It also calls
  TMDB so the token stays on the server.

## Requirements

- Node.js 20 or newer
- MongoDB running locally or on Atlas
- A TMDB v4 Read Access Token (from https://www.themoviedb.org/settings/api)

## Running it

You need the backend and frontend running at the same time, in two terminals.

Backend:

```bash
cd backend
cp .env.example .env   # fill in the values
npm install
npm run dev
```

The `.env` needs:

- `PORT` - API port, defaults to 3000
- `MONGO_URI` - your MongoDB connection string
- `SECRET` - any long random string, used to sign JWTs
- `TMDB_TOKEN` - your TMDB v4 token

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend calls `/api/...` and Vite proxies that to the backend on port 3000,
so start the backend first.

## MongoDB has to be a replica set

Double or Nothing (`backend/utils/double.js`) does each move as one MongoDB
transaction: the bet, the game and the pot change together or not at all.
Transactions only work on a replica set. MongoDB Atlas (a `mongodb+srv://`
connection string) always is one, so there's nothing to do there.

A plain `mongod` on your own server (like the Hetzner box) usually runs on its
own, "standalone". The game then answers every move with an error. Turning it
into a replica set of one takes a few minutes and keeps all your data:

1. Add this to `/etc/mongod.conf`:

   ```yaml
   replication:
     replSetName: rs0
   ```

2. Restart MongoDB: `sudo systemctl restart mongod`
3. Run this once, in `mongosh`:

   ```js
   rs.initiate()
   ```

   `rs.status()` should then say this server is `PRIMARY`.
4. Add `replicaSet=rs0` to `MONGO_URI` in `backend/.env`, for example
   `mongodb://127.0.0.1:27017/kinokaverit?replicaSet=rs0` (if the string
   already has a `?`, add `&replicaSet=rs0` instead), then restart the backend.

The tests need the same: point `MONGO_TEST_URI` at a replica set, or the
Double or Nothing and Slot Machine route tests skip themselves.

## Where things are

```
backend/
  app.js          express app, middleware, routes
  server.js       starts the server
  config/         db connection
  controllers/    route handlers
  models/         mongoose schemas
  routes/         routes (users, tmdb)
frontend/src/
  pages/          one file per route
  components/      ui components by feature
  services/       api calls
  hooks/          react hooks
  data/           local seed data
  utils/          helpers
```

## Endpoints

- `GET /api/health`
- `GET /api/tmdb/trending`
- `POST /api/users/signup`
- `POST /api/users/login`

## Scripts

Frontend: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.
Backend: `npm run dev` (nodemon), `npm start`, `npm test` (with
`MONGO_TEST_URI` set to a database whose name ends in `_test`, which the
tests wipe, like `mongodb://127.0.0.1:27017/kino_test?replicaSet=rs0`).
Slot Machine: `npm run slots:rtp` prints the exact RTP of every weight table
(add `-- --simulate 1000000` to simulate the hit rate too), and
`npm run slots:tune` makes the tables again after the paytable or base
weights change (`backend/games/slots/`).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR. Changes go in
[CHANGELOG.md](CHANGELOG.md).
