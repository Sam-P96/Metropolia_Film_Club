// One definition of "this member wants to see this film", used everywhere.
// A film is wanted if they haven't seen it, or they have and flagged a rewatch.
// The backend counts "wanting" with the same rule (controllers/filmController.js).
export function isWanted(entry) {
  return entry.status === 'plan_to_watch' || entry.wantsRewatch === true
}

export function describeOthersWanting(count) {
  if (count === 0) return 'No one else has this on their list yet'
  if (count === 1) return '1 other member wants to see this'
  return `${count} other members want to see this`
}
