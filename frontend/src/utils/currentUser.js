// Login.jsx and Signup.jsx both do:
//   localStorage.setItem("user", JSON.stringify(user))
// localStorage can only hold strings, so reading it back always means
// parsing that string into an object again.

export function getCurrentUser() {
  const stored = localStorage.getItem('user')

  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    // Something non-JSON ended up in there. Clear it rather than
    // letting every page that reads it crash.
    localStorage.removeItem('user')
    return null
  }
}

export function getCurrentUserId() {
  return getCurrentUser()?._id ?? null
}

// Keeps the stored login in step when the member changes a setting it
// carries, like PVP.
export function updateCurrentUser(changes) {
  const user = getCurrentUser()
  if (user) localStorage.setItem('user', JSON.stringify({ ...user, ...changes }))
}

// Logins expire after 3 days, but the stored one stays until it's removed.
// When the server turns it down, forget it and tell App.jsx, so the whole
// site shows the member as logged out instead of failing every request.
export const LOGIN_EXPIRED_EVENT = 'login-expired'

export function forgetExpiredLogin() {
  localStorage.removeItem('user')
  window.dispatchEvent(new Event(LOGIN_EXPIRED_EVENT))
}