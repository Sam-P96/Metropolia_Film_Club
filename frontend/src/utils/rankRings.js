// Gold, silver and bronze rings around the avatars of the top 3 critics:
// always on the Critics Leaderboard, and on review cards unless the member
// turns "Ranking" off. Everyone else gets the faint ring.
export const RANK_RINGS = {
  1: 'ring-3 ring-brand-gold',
  2: 'ring-3 ring-brand-silver',
  3: 'ring-3 ring-brand-bronze',
}

export const PLAIN_RING = 'ring-2 ring-white/20'

export const RANK_TITLES = { 1: '#1 critic', 2: '#2 critic', 3: '#3 critic' }

export function rankRing(rank) {
  return RANK_RINGS[rank] ?? PLAIN_RING
}
