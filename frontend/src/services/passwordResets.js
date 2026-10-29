import { api } from './api'

// "Forgot password?": a member asks the moderators and admins for a password
// reset, and one of them approves or dismisses it.

// Step one: is there an account with this email? Fails with 404 if not.
export function checkResetEmail(email) {
  return api('/password-resets/check', { method: 'POST', body: { email } })
}

// Step two: send the request. Resolves to { token, email, expiresAt }; keep
// the token (utils/pendingReset.js), it's the only way back to the request.
// Fails with 409 while one is already open for the account.
export function requestPasswordReset(email) {
  return api('/password-resets', { method: 'POST', body: { email } })
}

// { status, email, expiresAt, approvedBy }: status is 'pending', 'approved',
// 'dismissed' or 'expired', and approvedBy { username, role } once approved.
export function getResetStatus(token) {
  return api('/password-resets/status', { method: 'POST', body: { token } })
}

// Once approved: sets the password and logs the member in. Resolves to what
// logging in does.
export function completePasswordReset(token, password) {
  return api('/password-resets/complete', { method: 'POST', body: { token, password } })
}

// Moderators and admins, from Notifications: 'approve' or 'dismiss'.
export function decidePasswordReset(id, decision) {
  return api(`/password-resets/${encodeURIComponent(id)}`, { method: 'PUT', body: { decision } })
}
