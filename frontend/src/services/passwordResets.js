import { api } from './api'

// "Forgot password?": ask for a reset link by email. Always resolves the same
// way whether or not the email has an account ({ message }), so it can't be
// used to find out who's a member.
export function requestPasswordReset(email) {
  return api('/password-resets', { method: 'POST', body: { email } })
}

// "Reset Locally": send the request to the moderators and admins instead, to
// approve in person. Resolves to { token, email, expiresAt }; keep the token
// (utils/pendingReset.js), it's the only way back to the request. Fails with
// 404 if there's no account, and 409 while one is already open for it.
export function requestLocalReset(email) {
  return api('/password-resets/local', { method: 'POST', body: { email } })
}

// A "Reset Locally" request: { status, email, expiresAt, approvedBy }, where
// status is 'pending', 'approved', 'dismissed' or 'expired', and approvedBy
// { username, role } once approved.
export function getResetStatus(token) {
  return api('/password-resets/status', { method: 'POST', body: { token } })
}

// Set the new password, with the token from the emailed link or from an
// approved "Reset Locally" request. Resolves to what logging in does, and
// logs the member in.
export function completePasswordReset(token, password) {
  return api('/password-resets/complete', { method: 'POST', body: { token, password } })
}

// Moderators and admins, from Notifications: 'approve' or 'dismiss' a
// "Reset Locally" request.
export function decidePasswordReset(id, decision) {
  return api(`/password-resets/${encodeURIComponent(id)}`, { method: 'PUT', body: { decision } })
}
