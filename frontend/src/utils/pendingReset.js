// The password reset this browser asked for: { token, email }. Kept so that
// refreshing, or coming back to "Forgot password?", picks it up again, and so
// the reset page knows which request was approved.
const KEY = 'passwordReset'

export function getPendingReset() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY))
    return stored?.token ? stored : null
  } catch {
    return null
  }
}

export function savePendingReset({ token, email }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, email }))
  } catch {
    // Private browsing can refuse storage. The request still goes; this
    // page just can't pick it up again after a refresh.
  }
}

export function forgetPendingReset() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing was stored, then.
  }
}
