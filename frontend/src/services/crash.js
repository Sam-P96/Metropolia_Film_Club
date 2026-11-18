import { api } from './api'

// Crash over HTTP (backend/routes/crashRouter.js). The game itself is live,
// over Socket.IO (hooks/useCrash.js).

// Where they stand today: { dailyPp, maxBet, used, left, points, banned }.
export function getCrashStatus() {
  return api('/crash/status')
}

// ?skip=n. Invite's friends list: friends with the most points first, five
// at a time, each with `points`, `here` (in your room) and `invited`.
export function getCrashFriends(skip = 0) {
  return api(`/crash/friends?skip=${skip}`)
}

// A round they played, with its whole path.
export function getCrashRound(id) {
  return api(`/crash/rounds/${id}`)
}

// Developer tool only: answers on your own computer's dev server, and only
// the Vite dev server's page has the button. Today's rounds back to none.
export function devResetCrashDay() {
  return api('/crash/dev/reset-day', { method: 'POST' })
}
