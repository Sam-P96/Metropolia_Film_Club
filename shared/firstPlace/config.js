// First Place: the name effect for whoever is #1 on the PP Leaderboard, the
// Critics Leaderboard (Top or Controversial) or by level, in this one file.
// The titles themselves are in backend/utils/firstPlace.js. The server
// (backend/utils/firstPlace.js) checks saved settings with it; the pages
// (frontend/src/components/firstPlace/) read the stones and the defaults.
// The look itself was made in the prototype next to this file.
//
// The six stones each own a sixth of the name, left to right in `order`.
// A stone that's on lights its sixth up, pulses its glow and flares, every
// `intervals[id]` seconds; all six on adds a sheen across the whole name.
// The ids never change once members have saved settings with them.

export const STONES = {
  power: { name: 'Power', color: '#a23bff' },
  space: { name: 'Space', color: '#2f7bff' },
  time: { name: 'Time', color: '#1fe07a' },
  mind: { name: 'Mind', color: '#ffd21f' },
  soul: { name: 'Soul', color: '#ff8a1f' },
  reality: { name: 'Reality', color: '#ff2a2a' },
}

export const STONE_IDS = Object.keys(STONES)
export const DEFAULT_ORDER = [...STONE_IDS]

// Seconds per glow pulse and flare, and how far they can be set.
export const DEFAULT_INTERVAL = 2.8
export const MIN_INTERVAL = 0.3
export const MAX_INTERVAL = 20

// Wave (Random off): each flare starts this many seconds after the one to
// its left.
export const WAVE_STEP = 0.14

// The settings anyone gets the first time they hold a title, and what
// "Reset everything to default" goes back to.
export function defaultFirstPlaceFx() {
  return {
    enabled: true,
    stones: [...STONE_IDS],
    order: [...DEFAULT_ORDER],
    intervals: Object.fromEntries(STONE_IDS.map((id) => [id, DEFAULT_INTERVAL])),
    random: true,
  }
}

// Saved settings (or none yet) as the effect draws them: anything missing
// or broken falls back to the default, so bad data can never break a name.
export function firstPlaceFxOf(saved) {
  const fallback = defaultFirstPlaceFx()
  if (!saved || typeof saved !== 'object') return fallback

  let order = Array.isArray(saved.order) ? [...new Set(saved.order.filter((id) => STONES[id]))] : []
  order = [...order, ...DEFAULT_ORDER.filter((id) => !order.includes(id))]

  const stones = Array.isArray(saved.stones) ? STONE_IDS.filter((id) => saved.stones.includes(id)) : fallback.stones

  const intervals = Object.fromEntries(
    STONE_IDS.map((id) => {
      const seconds = Number(saved.intervals?.[id])
      const ok = Number.isFinite(seconds) && seconds >= MIN_INTERVAL && seconds <= MAX_INTERVAL
      return [id, ok ? seconds : DEFAULT_INTERVAL]
    })
  )

  return {
    enabled: typeof saved.enabled === 'boolean' ? saved.enabled : fallback.enabled,
    stones: stones.length > 0 ? stones : fallback.stones,
    order,
    intervals,
    random: typeof saved.random === 'boolean' ? saved.random : fallback.random,
  }
}

// What's wrong with settings someone is saving, or null if nothing is.
// Nothing is filled in or fixed here: anything off is refused.
//   order      all six ids, each once
//   stones     some of the ids, at least one, each once
//   intervals  a number from MIN_INTERVAL to MAX_INTERVAL for every id
//   enabled, random  true or false
export function firstPlaceFxProblem(fx) {
  if (!fx || typeof fx !== 'object' || Array.isArray(fx)) return 'Send the settings.'
  if (typeof fx.enabled !== 'boolean') return '"enabled" is true or false.'
  if (typeof fx.random !== 'boolean') return '"random" is true or false.'

  const { order, stones, intervals } = fx
  if (!Array.isArray(order) || order.length !== STONE_IDS.length || new Set(order).size !== order.length || !order.every((id) => STONES[id])) {
    return 'The order has every stone, each once.'
  }
  if (!Array.isArray(stones) || stones.length === 0 || new Set(stones).size !== stones.length || !stones.every((id) => STONES[id])) {
    return 'Keep at least one stone on, each once.'
  }
  if (!intervals || typeof intervals !== 'object' || Array.isArray(intervals)) return 'Send an interval for every stone.'
  if (Object.keys(intervals).some((id) => !STONES[id])) return 'Intervals are only for the six stones.'
  for (const id of STONE_IDS) {
    const seconds = intervals[id]
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < MIN_INTERVAL || seconds > MAX_INTERVAL) {
      return `Each interval is ${MIN_INTERVAL} to ${MAX_INTERVAL} seconds.`
    }
  }
  return null
}
