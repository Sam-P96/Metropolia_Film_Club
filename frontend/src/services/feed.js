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
