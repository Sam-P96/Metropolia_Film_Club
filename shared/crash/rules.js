// Crash's rules for players: rooms, bets and the daily plays. The server
// (backend/games/crash/rooms.js, backend/utils/crash.js) enforces them; the
// page (frontend/src/pages/Crash.jsx) shows them. How a round's multiplier
// moves is the server's alone (backend/games/crash/engine.js).

export const CRASH_RULES = {
  // Players in a room, at most.
  roomSize: 30,
  // Rooms open at once (rounds played alone don't count).
  maxRooms: 3,
  // In a room of 2 or more, the first one ready starts this countdown: the
  // round starts straight away once every player is ready (spectators
  // don't count). If the countdown ends first, whoever's ready can press
  // Start Game to play without the rest.
  readyMs: 30000,
  // Start Game: the other ready players get this long to say whether
  // they'll join the smaller game. Whoever doesn't answer sits it out. (A
  // smaller round can mean fewer rounds a day, and no half back, so nobody
  // is put in one without saying yes.)
  offerMs: 30000,
  // Invites one member can send from one room.
  invitesPerRoom: 30,
  // Rounds a member can play a day, 12:00 to 12:00 Helsinki time, by how
  // many players the round starts with: [alone, 2, 3, 4, 5 or more]. Each
  // is a cap on all of the day's rounds together, so the more players, the
  // more rounds: after 3 alone there are still 3 to play with 2 players, 9
  // with 3, 21 with 4 and 22 with 5 or more.
  roundsPerDay: [3, 6, 12, 24, 25],
  // A round that starts with this many players or more is protected:
  // everyone who loses in it gets this share of what they lost back (whole
  // points, rounded down).
  protectedPlayers: 5,
  protectShare: 0.5,
  // The smallest bet, and the biggest as a share of the member's daily PP
  // (1 PP per review they've written).
  minBet: 1,
  maxBetShare: 0.25,
  // Auto-cash-out targets, from just above 1x to the cap.
  autoMin: 1.01,
  autoMax: 25,
  // How long everyone sees the round coming before the first tick.
  countdownMs: 1500,
  // A cash-out at this or more is big news: every member hears about it.
  // Anything else, their followers do.
  bigWinAt: 10,
}

// The biggest bet for a member whose daily PP is `dailyPp`: a quarter of
// it, rounded down, but always at least 1.
export const maxBetFor = (dailyPp) => Math.max(1, Math.floor(dailyPp * CRASH_RULES.maxBetShare))

// Rounds a day for a round of `players` (1: alone; 5 or more all get the
// last).
export const roundsFor = (players) => CRASH_RULES.roundsPerDay[Math.min(Math.max(1, players), CRASH_RULES.roundsPerDay.length) - 1]

// Whether a round of `players` protects whoever loses in it.
export const isProtected = (players) => players >= CRASH_RULES.protectedPlayers

// The kind of round `players` start: "solo" alone, "protected" with 5 or
// more, else "group".
export const roundKindFor = (players) => (isProtected(players) ? 'protected' : players <= 1 ? 'solo' : 'group')

// Rounds left today in a round of `players` (the most, a round of 5 or
// more, if not given), after `used` ({ total }: rounds played today).
export function playsLeft(used = {}, players = CRASH_RULES.roomSize) {
  return Math.max(0, roundsFor(players) - (used.total ?? 0))
}

// The fewest players a round needs for them to play it after `used`, or
// null if they've played every round they can today.
export function playersNeeded(used = {}) {
  const index = CRASH_RULES.roundsPerDay.findIndex((rounds) => rounds > (used.total ?? 0))
  return index === -1 ? null : index + 1
}

// "4 played today", or in a round of `players`, "8/12 left": that round's
// rounds a day, and how many of them are left.
export function playsLine(used, players) {
  if (!players) return `${used?.total ?? 0} played today`
  return `${playsLeft(used, players)}/${roundsFor(players)} left`
}

// An auto-cash-out target as typed, or null for none: a number from
// autoMin to autoMax, kept to 2 decimals. Anything else is null.
export function autoTarget(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Math.round(Number(value) * 100) / 100
  if (!Number.isFinite(number) || number < CRASH_RULES.autoMin || number > CRASH_RULES.autoMax) return null
  return number
}

// Why a member can't ready up with `bet` in a room of `players` (counting
// them; a round played alone is 1), or null if they can. `status`: where
// they stand today ({ dailyPp, maxBet, used, points, banned }, from the
// server). The server checks this again as the round starts.
export function blockedFor(status, bet, players) {
  if (!status) return 'Checking your points…'
  if (status.banned) return status.banned
  if (status.dailyPp < 1) return 'Write a review to play: your daily PP comes from your reviews.'
  if (playsLeft(status.used) < 1) return 'No rounds left today. More at 12:00.'
  if (playsLeft(status.used, players) < 1) {
    const needed = playersNeeded(status.used)
    if (players <= 1) return `No rounds alone left (${roundsFor(1)} a day): play in a room of ${needed} or more.`
    return `A round of ${players} gets ${roundsFor(players)} rounds a day and you've played them: wait for ${needed} players.`
  }
  if (!Number.isInteger(bet) || bet < CRASH_RULES.minBet) return 'Pick a bet first.'
  if (bet > status.maxBet) return `Bets go up to ${status.maxBet} for you (a quarter of your daily PP).`
  if (status.points < bet) return 'Not enough points for that bet.'
  return null
}

// Lord Gang Orca's offer, not in the page's rules (it just turns up): once a
// play day, for anyone who's played all their rounds alone, one more round
// alone with everything they have on it, PP and P-PP, past the usual
// biggest bet and with no auto cash-out. `status.allIn`: null when it isn't
// on offer, else { elsewhere: [{ points, where }] }, points they've put
// somewhere they could get back (backend/utils/pointsElsewhere.js). All in
// means all of it, so it won't go while there are any. Why they can't take
// it, or null if they can.
export function allInBlockedFor(status) {
  if (!status?.allIn) return 'Not today, kid.'
  if (status.banned) return status.banned
  if (status.dailyPp < 1) return 'Write a review to play: your daily PP comes from your reviews.'
  if (status.points < 1) return "You've got nothing to put in."
  const elsewhere = status.allIn.elsewhere ?? []
  if (elsewhere.length > 0) {
    const places = elsewhere.map((place) => `${place.points.toLocaleString('en-US')} ${place.where}`)
    const list = places.length > 1 ? `${places.slice(0, -1).join(', ')} and ${places.at(-1)}` : places[0]
    return `All in means all of it, and you've got ${list}. Bring it home first.`
  }
  return null
}

// A multiplier for people: "1.87x".
export const formatMultiplier = (m) => `${(Math.floor(m * 100) / 100).toFixed(2)}x`
