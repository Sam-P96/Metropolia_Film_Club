// Resonance's true difference: how far apart two members' ratings of a film
// are once each one's usual rating is taken into account, so a generous
// rater and a harsh one who feel the same about a film come out the same.
// The server scores with it (backend/utils/resonance.js filmGap) and the
// comparison page's charts draw with it (frontend/src/components/resonance/),
// so they always agree.
//
// Both ratings go on one scale they share. Its ends never move: half a star
// is the lowest anyone can give and 5 the highest, whoever gives it. Each
// member's average moves to the middle of the two averages, and the
// ratings in between stretch or squeeze to fit, below the average and
// above it separately. So nothing ever lands past either end, and the same
// top or bottom rating from both is no gap at all.

export const LOWEST = 0.5
export const HIGHEST = 5

// The middle of two members' averages: where both averages go on the
// shared scale.
export const sharedAverage = (average, otherAverage) => (average + otherAverage) / 2

// `rating`, from a member whose average is `average`, on the scale shared
// with another member (`shared`, sharedAverage of the two). The ends stay
// where they are, `average` lands on `shared`, and everything in between
// is in proportion: halfway between their lowest and their average is
// halfway between the lowest and `shared`.
export function onSharedScale(rating, average, shared) {
  if (rating <= LOWEST || rating >= HIGHEST) return rating
  if (rating <= average) return LOWEST + ((rating - LOWEST) * (shared - LOWEST)) / (average - LOWEST)
  return shared + ((rating - average) * (HIGHEST - shared)) / (HIGHEST - average)
}

// The true difference between two ratings, in stars: `mine` from a member
// whose average is `myAverage`, `theirs` from one whose average is
// `theirAverage`, both on their shared scale. The same either way round.
export function trueGap(mine, myAverage, theirs, theirAverage) {
  const shared = sharedAverage(myAverage, theirAverage)
  return Math.abs(onSharedScale(mine, myAverage, shared) - onSharedScale(theirs, theirAverage, shared))
}
