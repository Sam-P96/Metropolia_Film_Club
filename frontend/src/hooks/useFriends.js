import { getMyFriendIds } from '../services/users'
import { sessionCache } from './sessionCache'

// The logged-in member's friends (members who follow each other), as a Set
// of ids, for the purple glow on friends' review cards. One answer shared
// by every card (hooks/sessionCache.js); the Follow button refreshes it.
const friends = sessionCache(() => getMyFriendIds().then((data) => new Set(data.friends)), {
  maxAgeMs: 5 * 60 * 1000,
  empty: new Set(),
})

// After the member follows or unfollows someone.
export const refreshFriends = friends.refresh

export default function useFriends() {
  return friends.useValue()
}
