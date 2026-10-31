import { SCRATCH } from './config.js'

// The real odds of Box Office Scratch, worked out from config.js, for checking
// the simulation (backend/scripts/simulate-scratch.js).

// n choose k.
function choose(n, k) {
  if (k < 0 || k > n) return 0
  let result = 1
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i
  return result
}

// The chance your last needed star turns up on scratch `k`, scratching tiles
// in any order: the other needed stars somewhere in the first k - 1 tiles, a
// star on tile k, and the stars left over somewhere after it.
export function tierChance(k, s = SCRATCH) {
  const tiles = s.rows * s.cols
  return (choose(k - 1, s.starsToWin - 1) * choose(tiles - k, s.stars - s.starsToWin)) / choose(tiles, s.stars)
}

// Each tier's chance, the chance of a loss,
// the chance of finding a Golden Ticket (when you use all your scratches),
// and the share of what's spent on tickets that comes back to players over
// time ("return to player"). The jackpot's share counts each ticket's
// contribution, which all gets won in the end, plus the seed it starts from.
export function scratchOdds(s = SCRATCH) {
  const tiles = s.rows * s.cols
  const tiers = s.tiers.map((tier) => ({ ...tier, chance: tierChance(tier.scratch, s) }))
  const win = tiers.reduce((sum, tier) => sum + tier.chance, 0)
  const golden = (1 / s.goldenTicketOneIn) * (s.scratches / tiles)

  const fromTiers = tiers.reduce((sum, tier) => sum + tier.chance * (tier.refund ? s.ticketPrice : tier.ppp), 0)
  const fromJackpot = s.jackpotContribution + golden * s.jackpotSeed

  return {
    tiers,
    loss: 1 - win,
    golden,
    goldenOneIn: 1 / golden,
    rtp: (fromTiers + fromJackpot) / s.ticketPrice,
  }
}
