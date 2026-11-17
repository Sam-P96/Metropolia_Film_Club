// Crash's rules for players: rooms, bets and the daily plays. The server
// (backend/games/crash/rooms.js, backend/utils/crash.js) enforces them; the
// page (frontend/src/pages/Crash.jsx) shows them. How a round's multiplier
// moves is the server's alone (backend/games/crash/engine.js).

export const CRASH_RULES = {
  // Players in a room, at most.
  roomSize: 4,
  // Rooms open at once (rounds played alone don't count).
  maxRooms: 3,
  // Rounds a member can play a day, 12:00 to 12:00 Helsinki time.
  roundsPerDay: 6,
  // Of those, "solo" rounds: any round that starts with fewer than 4
  // players (alone, or a room of 2 or 3).
  soloPerDay: 3,
  // A round that starts with this many players is a bonus round: it only
  // counts towards roundsPerDay.
  bonusPlayers: 4,
  // The smallest bet, and the biggest as a share of the member's daily PP
  // (1 PP per review they've written).
  minBet: 1,
  maxBetShare: 0.25,
  // Auto-cash-out targets, from just above 1x to the cap.
  autoMin: 1.01,
  autoMax: 25,
  // How long everyone sees the round coming before the first tick.
  countdownMs: 1500,
}

// The biggest bet for a member whose daily PP is `dailyPp`: a quarter of
// it, rounded down, but always at least 1.
export const maxBetFor = (dailyPp) => Math.max(1, Math.floor(dailyPp * CRASH_RULES.maxBetShare))

// The kind of round `players` players start: "bonus" with 4, else "solo".
export const roundKindFor = (players) => (players >= CRASH_RULES.bonusPlayers ? 'bonus' : 'solo')

// What's left of today's plays, from what's been used: { solo, total }.
export function playsLeft(used = {}) {
  const total = Math.max(0, CRASH_RULES.roundsPerDay - (used.total ?? 0))
  const solo = Math.min(total, Math.max(0, CRASH_RULES.soloPerDay - (used.solo ?? 0)))
  return { solo, total }
}

// "Solo 2/3 · Total 4/6": what's left, out of the day's.
export function playsLine(used) {
  const left = playsLeft(used)
  return `Solo ${left.solo}/${CRASH_RULES.soloPerDay} · Total ${left.total}/${CRASH_RULES.roundsPerDay}`
}

// An auto-cash-out target as typed, or null for none: a number from
// autoMin to autoMax, kept to 2 decimals. Anything else is null.
export function autoTarget(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Math.round(Number(value) * 100) / 100
  if (!Number.isFinite(number) || number < CRASH_RULES.autoMin || number > CRASH_RULES.autoMax) return null
  return number
}

// A multiplier for people: "1.87x".
export const formatMultiplier = (m) => `${(Math.floor(m * 100) / 100).toFixed(2)}x`
