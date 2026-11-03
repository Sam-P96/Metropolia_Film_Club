import { getSoulResonance } from '../services/resonance'
import { sessionCache } from './sessionCache'
import { resonanceTier } from '../../../shared/resonance.js'

// The members the logged-in member shares a Soul Resonance with:
// { [id]: { percent, icon } }, for the glow on their review cards and,
// when `icon`, the icon after their names. One answer shared by every name
// and card (hooks/sessionCache.js), asked for again every few minutes
// since Resonance changes every night, and straight away when a page gets
// fresher matches than it has (noteSoulMatches).
const soul = sessionCache(getSoulResonance, { maxAgeMs: 5 * 60 * 1000, empty: {} })

// After the member changes their Resonance settings.
export const refreshSoulResonance = soul.refresh

// A page that has just loaded matches (the home page's Resonance slide, the
// Resonance page): a Soul Resonance among them that the map doesn't have
// means the map is out of date.
export function noteSoulMatches(matches) {
  const map = soul.peek()
  if (matches?.some((match) => resonanceTier(match.percent).key === 'soul' && !map[match.user._id])) soul.refresh()
}

export default function useSoulResonance() {
  return soul.useValue()
}
