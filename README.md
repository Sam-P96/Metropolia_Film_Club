# Metropolia Film Club

Website for the Metropolia Film Club. Members can see trending films, read
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
Backend: `npm run dev` (nodemon), `npm start`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR. Changes go in
[CHANGELOG.md](CHANGELOG.md).
