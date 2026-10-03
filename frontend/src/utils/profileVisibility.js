export function canViewProfile(profileUser, isOwner) {
  if (isOwner) return true

  if (profileUser.privacy === 'public') return true

  // 'friends' behaves exactly like 'private' until a friends system exists.
  // When it does, this is the only line that changes.
  return false
}