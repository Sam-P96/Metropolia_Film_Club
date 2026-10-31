import { api } from './api'

// A page of the logged-in member's Feed, newest first: { items, hasMore, next }.
// Each item has a type ('like', 'dislike', 'review', 'trending', 'reply',
// 'follow', 'pvp', 'event', 'cut' or 'cutReply'), `at` and the members
// involved (`actors`, newest first). Review ones have the `review` as a full
// review card and, for a reply, `reply` ({ _id, text, toComment }); an
// event one has the `event`; a cut one the `cut` ({ _id, text, likeCount,
// dislikeCount, myVote, replyCount }), and a cutReply one `cut`
// ({ _id, text }) and `reply`.
export function getFeed(skip = 0) {
  return api(`/feed?skip=${skip}`)
}

// What lights up the bell in the nav: { unread, games }. `unread`: there's
// something new since they last opened Notifications. `games`: some of it
// is a game notification, or a Farkle game come round to their turn.
export function getUnread() {
  return api('/feed/unread')
}

// Sent once Notifications has been opened, so the bell checks again.
export const NOTIFICATIONS_SEEN_EVENT = 'notifications-seen'

// They've seen their Notifications, up to `until` (the `now` the page came
// with). The bell goes dark straight away (hooks/useUnread.js).
export async function markNotificationsSeen(until) {
  await api('/feed/seen', { method: 'POST', body: { until } })
  window.dispatchEvent(new Event(NOTIFICATIONS_SEEN_EVENT))
}
