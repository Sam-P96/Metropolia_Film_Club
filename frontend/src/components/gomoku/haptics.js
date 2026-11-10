import { haptic } from '../slots/feedback'

// Infinite Gomoku's haptics, through the Slot Machine's haptic() (which
// also ticks on iPhones, which have no vibration API). Patterns are
// [on, off, on, ...] in milliseconds.
export const HAPTIC = {
  // Tapping a point to pick it: a light tick.
  pick: 8,
  // A piece landing, and its shockwave rolling out across the board and
  // fading away (about as long as the shockwave itself).
  land: [40, 30, 24, 35, 14, 40, 7],
}

// Pressing Place piece: a click, then the landing straight after. One
// pattern, because a new vibration cuts off the one before it.
HAPTIC.confirm = [14, 40, ...HAPTIC.land]

export { haptic }
