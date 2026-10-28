import { api } from './api'

// A page of the logged-in member's Feed, newest first: { items, hasMore, next }.
// Each item has a type ('like', 'dislike', 'review', 'trending' or 'reply'),
// `at`, the `review` as a full review card, the members involved (`actors`,
// newest first) and, for a reply, `reply` ({ _id, text, toComment }).
export function getFeed(skip = 0) {
  return api(`/feed?skip=${skip}`)
}
