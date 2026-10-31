import { api } from './api'

// "Forgot password?": ask for a reset link by email. Always resolves the same
// way whether or not the email has an account ({ message }), so it can't be
// used to find out who's a member.
export function requestPasswordReset(email) {
  return api('/password-resets', { method: 'POST', body: { email } })
}

// Set the new password with the token from the emailed link. Resolves to what
// logging in does, and logs the member in.
export function completePasswordReset(token, password) {
  return api('/password-resets/complete', { method: 'POST', body: { token, password } })
}
