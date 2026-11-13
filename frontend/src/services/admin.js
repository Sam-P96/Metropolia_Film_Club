import { api } from './api'

// The admin panel (backend/routes/adminRouter.js), admins only.

// { grants: [{ _id, to, by, amount, at }], maxGrant, maxNote }
export function getAdminPanel() {
  return api('/admin')
}

// Sends `amount` P-PP to `userId`, with an optional note: { sent, grants }.
export function sendPpp({ userId, amount, note }) {
  return api('/admin/grants', { method: 'POST', body: { userId, amount, note } })
}

// Runs today's 12:00 PP payout now, for everyone not paid today yet.
export function runPayoutNow() {
  return api('/wallet/payout', { method: 'POST' })
}
