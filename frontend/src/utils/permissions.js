import { resolveMemberId } from './reviewLookup'

// Every account is a plain user until someone promotes it. Accounts created
// before this field existed have no role at all, and fall back to this.
export const DEFAULT_ROLE = 'user'

// Ranked lowest to highest. Each role can do everything the ones below it can.
const ROLE_RANK = {
  user: 0,
  moderator: 1,
  admin: 2,
}

// For badges and dropdowns.
export const ROLE_LABELS = {
  user: 'Member',
  moderator: 'Moderator',
  admin: 'Admin',
}

export function getRole(users, currentUser) {
  if (!currentUser) return DEFAULT_ROLE

  // Once the backend sends a role on login, this is the only line that runs.
  if (currentUser.role) return currentUser.role

  // Until then, match the logged-in account to a placeholder member.
  const memberId = resolveMemberId(users, currentUser)
  const member = users.find((user) => user._id === memberId)

  return member?.role ?? DEFAULT_ROLE
}

// "Is this account at least a moderator?" — one comparison, instead of
// listing every role that qualifies at every call site.
export function hasAtLeast(users, currentUser, minimum) {
  const rank = ROLE_RANK[getRole(users, currentUser)] ?? 0
  const needed = ROLE_RANK[minimum] ?? 0

  return rank >= needed
}

// Name the permission, not the role. If moderators lose event creation one
// day, this file changes and none of the components do.
export function canCreateEvents(users, currentUser) {
  return hasAtLeast(users, currentUser, 'moderator')
}

export function canEditAnyReview(users, currentUser) {
  return hasAtLeast(users, currentUser, 'moderator')
}

export function canManageMembers(users, currentUser) {
  return hasAtLeast(users, currentUser, 'admin')
}