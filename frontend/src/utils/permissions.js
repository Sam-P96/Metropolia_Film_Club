// Every account is a plain user until someone promotes it. Accounts created
// before this field existed have no role at all, and fall back to this.
export const DEFAULT_ROLE = 'user'

// Ranked lowest to highest. Each role can do everything the ones below it can.
// Matches backend/middleware/auth.js, which is the check that actually counts;
// these only decide what to show.
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

// The role comes back from the server on login and is kept with the user in
// localStorage. Someone promoted since they logged in sees it after logging in again.
export function getRole(currentUser) {
  return currentUser?.role ?? DEFAULT_ROLE
}

// "Is this account at least a moderator?" — one comparison, instead of
// listing every role that qualifies at every call site.
export function hasAtLeast(currentUser, minimum) {
  const rank = ROLE_RANK[getRole(currentUser)] ?? 0
  const needed = ROLE_RANK[minimum] ?? 0

  return rank >= needed
}

// Name the permission, not the role. If moderators lose event creation one
// day, this file changes and none of the components do.

// Anyone logged in can host a member screening.
export function canCreateEvents(currentUser) {
  return Boolean(currentUser)
}

// Creating official club events, and promoting member screenings to official
// (or demoting them back).
export function canMakeEventsOfficial(currentUser) {
  return hasAtLeast(currentUser, 'moderator')
}

// Editing and deleting any event, not only ones they made.
export function canManageEvents(currentUser) {
  return hasAtLeast(currentUser, 'moderator')
}

// Editing and deleting this one event: moderators and admins, or the member
// who made it while it's still a member screening. Matches the backend.
export function canManageEvent(currentUser, event) {
  if (canManageEvents(currentUser)) return true
  return Boolean(currentUser) && !event.official && event.createdBy === currentUser._id
}

// The "Theatre Screening Link" box on the event form, which becomes the
// "Purchase Tickets" button.
export function canSetTicketLinks(currentUser) {
  return hasAtLeast(currentUser, 'moderator')
}

// Removing anyone's seat entry at a theatre screening.
export function canRemoveSeats(currentUser) {
  return hasAtLeast(currentUser, 'moderator')
}

// Seeing reports at the top of Notifications, and the Banned List. Who can
// ban whom is the server's call (it sends `canBan` with a profile).
export function canModerate(currentUser) {
  return hasAtLeast(currentUser, 'moderator')
}

// Deleting someone else's review (after confirming twice). Authors delete
// their own by clearing the text when editing it. Matches the backend.
export function canDeleteAnyReview(currentUser) {
  return hasAtLeast(currentUser, 'admin')
}

export function canEditAnyReview(currentUser) {
  return hasAtLeast(currentUser, 'moderator')
}

// Marking someone else's review as containing spoilers.
export function canMarkSpoilers(currentUser) {
  return hasAtLeast(currentUser, 'moderator')
}

// Deleting anyone's comment. Everyone can delete their own.
export function canDeleteAnyComment(currentUser) {
  return hasAtLeast(currentUser, 'moderator')
}

export function canManageMembers(currentUser) {
  return hasAtLeast(currentUser, 'admin')
}
