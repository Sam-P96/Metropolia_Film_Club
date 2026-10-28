// What the Ban Hammer can take away from a member, each on its own.
// Matches backend/utils/bans.js, which is the check that counts.
export const BAN_RIGHTS = [
  { key: 'reviews', label: 'Posting reviews', description: 'Writing or editing reviews. They can still rate films.' },
  { key: 'dislikeReviews', label: 'Disliking reviews', description: 'The thumbs down on reviews.' },
  { key: 'comments', label: 'Commenting', description: 'Comments and replies under reviews.' },
  { key: 'dislikeComments', label: 'Disliking comments', description: 'The thumbs down on comments.' },
  { key: 'reports', label: 'Reporting reviews', description: 'Reporting reviews to moderators and admins.' },
]

// The rights a member has lost, from their `bans`.
export function lostRights(bans = {}) {
  return BAN_RIGHTS.filter((right) => bans[right.key])
}
