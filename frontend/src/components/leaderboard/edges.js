// Where a row sits in a list of `count`: 'first', 'last', 'only' or null.
// Lists of LeaderboardRow don't hide their overflow (it would cut off the
// particles of cosmetics in the top and bottom rows), so the end rows round
// their own corners.
export function edgeOf(index, count) {
  if (count === 1) return 'only'
  if (index === 0) return 'first'
  if (index === count - 1) return 'last'
  return null
}
