import { api } from './api'

// The admin Send P-PP tool (backend/routes/adminRouter.js), admins only:
// in the admin panel and, for admins, the Wallet.

// Every send by every admin, newest first, 20 at a time:
// { grants: [{ _id, to, by, amount, note, at }], hasMore }. `before` is
// the last send already shown, for the next page.
export function getGrants(before = null) {
  return api(`/admin/grants${before ? `?before=${encodeURIComponent(before)}` : ''}`)
}

// Sends `amount` P-PP to `userId` (an admin can be sending it to
// themselves), with an optional note: { sent }.
export function sendPpp({ userId, amount, note }) {
  return api('/admin/grants', { method: 'POST', body: { userId, amount, note } })
}

// Runs today's 12:00 PP payout now, for everyone not paid today yet.
export function runPayoutNow() {
  return api('/wallet/payout', { method: 'POST' })
}
