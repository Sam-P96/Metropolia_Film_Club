import { api } from './api'

// Forrest Bounce (backend/routes/forrestRouter.js). Every answer carries
// `status`: { points, cashOutsLeft, buddies, choices, best, leaderboard,
// waiting }.

export function getForrest() {
  return api('/forrest')
}

// [on the branch, on the seesaw]: { buddies, status }.
export function setForrestBuddies(buddies) {
  return api('/forrest/buddies', { method: 'PUT', body: { buddies } })
}

// A new run (cost 0: free play): { run: { id, seed, cost, mult, free }, status }.
export function startForrestRun(cost) {
  return api('/forrest/runs', { method: 'POST', body: { cost } })
}

// The run's over: the steps it tapped on and the steps it played. The
// server plays it again: { run: { score, fruit, level, payout, ... },
// best: { personal, site, previous }, status }.
export function finishForrestRun(id, taps, endTick) {
  return api(`/forrest/runs/${id}/finish`, { method: 'POST', body: { taps, endTick } })
}

// { run, payout, status }.
export function cashOutForrestRun(id) {
  return api(`/forrest/runs/${id}/cashout`, { method: 'POST' })
}

export function discardForrestRun(id) {
  return api(`/forrest/runs/${id}/discard`, { method: 'POST' })
}

// Developer tool only (the Vite dev server, your own computer): today's
// cash-outs back.
export function devResetForrestDay() {
  return api('/forrest/dev/reset-day', { method: 'POST' })
}
