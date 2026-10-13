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