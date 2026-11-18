// Forrest Bounce's rules: entries, payouts, the daily cash-outs, the stages
// and the fruit. The engine (engine.js) plays a run from these, in the page
// and again on the server, which pays from its own replay
// (backend/utils/forrest.js); the page draws it
// (frontend/src/components/forrest/).

export const FORREST = {
  name: 'Forrest Bounce',
  // What a game costs to enter, in points (PP first, then P-PP). Fruit
  // counts this many times over in it: a 30 point game is x3.
  entries: [10, 20, 30, 50, 100],
  // Free play: once the day's cash-outs are used, x2, never cashed out.
  freeMult: 2,
  // A run's score is worth this many points to 1, rounded down.
  scorePerPoint: 5,
  // Cash-outs a member gets a play day (12:00 to 12:00 Helsinki). A run
  // can be cashed out or thrown away; throwing it away keeps the cash-out.
  cashOutsPerDay: 3,
  // A cash-out paying this many times the entry or more is big news: every
  // member hears it. Anything less, the player's followers do.
  bigWinTimes: 5,
}

// The fruit, from the commonest (low, slow) to the jackpot fruit (high,
// fast, gone in 9 seconds): m, what it's worth; w, how often it comes; y,
// the heights it floats at.
export const TIERS = [
  { m: 1, w: 55, y: [300, 385] },
  { m: 3, w: 25, y: [240, 350] },
  { m: 5, w: 13, y: [180, 290] },
  { m: 10, w: 6, y: [132, 230] },
  { m: 100, w: 1.2, y: [114, 134] },
]
export const TIER_COLORS = ['#ffffff', '#9be564', '#4cc9f0', '#c77dff', '#ffd166']

// The stages, one a level; past the last you stay in the Void.
export const SETS = [
  { name: 'Orchard', fruit: ['🍎', '🍐', '🍊', '🍉', '🍒'], sky: ['#79c3ef', '#e3f6ff'], hill: '#a6dc8f', grass: '#6cc35a', soil: '#5a3d2b', wood: '#7a4b2a', leaf: '#3f9a45' },
  { name: 'Tropics', fruit: ['🍌', '🍋', '🥝', '🍍', '🥭'], sky: ['#ff8e6e', '#ffe2a6'], hill: '#f0b77e', grass: '#c9a35c', soil: '#6e4a2c', wood: '#6b3f22', leaf: '#2f8f5b' },
  { name: 'Berry Night', fruit: ['🍓', '🫐', '🍇', '🥥', '🍈'], sky: ['#170f3d', '#4f63b8'], hill: '#27306b', grass: '#2f3d7a', soil: '#1c1f3f', wood: '#4a3326', leaf: '#24563c', fx: 'stars' },
  { name: 'Shooting Stars', fruit: ['🍏', '🍑', '🍅', '🫒', '🥑'], sky: ['#070b24', '#24306a'], hill: '#1d2858', grass: '#25336a', soil: '#121836', wood: '#3a2b2a', leaf: '#1f4a4f', fx: 'meteors' },
  { name: 'Galaxy', fruit: ['🍒', '🍇', '🫐', '🍑', '🍍'], sky: ['#0e0320', '#3a1260'], hill: '#3a1f5c', grass: '#4b2a78', soil: '#1d0f33', wood: '#2f1f3a', leaf: '#5b2a7a', fx: 'galaxy' },
  { name: 'The Void', fruit: ['🍎', '🍊', '🥝', '🍉', '🥭'], sky: ['#000000', '#0c0514'], hill: '#150a22', grass: '#1f0f31', soil: '#06030b', wood: '#1a1020', leaf: '#26133d', fx: 'void' },
]

export const setFor = (level) => SETS[Math.min(level, SETS.length) - 1]

// The fruit points (before the entry's multiplier) it takes to reach
// level `level`.
export function threshold(level) {
  const T = [0, 0, 60, 180, 400, 700, 1100]
  return level < T.length ? T[level] : 1100 + (level - 6) * 500
}

// A game's multiplier: a 30 point entry is x3; free play is x2.
export const multFor = (cost) => (cost === 0 ? FORREST.freeMult : cost / 10)

// What a run's score is worth, in points.
export const payoutFor = (score) => Math.floor(score / FORREST.scorePerPoint)

// The two buddies everyone has: the frog starts on the branch.
export const DEFAULT_BUDDIES = ['🐸', '🐰']
