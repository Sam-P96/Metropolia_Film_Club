// Resonance: how alike two members' taste in films is, from 0 to 100%
// (worked out by backend/utils/resonance.js). The tiers are here, read by
// the server and the pages alike, so they always agree on what a match is
// called.
export const RESONANCE_TIERS = {
  // This or more is a Soul Resonance, with the Resonance icon.
  soul: 80,
  // This or more is a Resonance. Anything below is a Dissonance, shown the
  // other way round: a 40% match is "Dissonance: 60%".
  resonance: 50,
}

// What a match of `percent` is called and the number it's shown with:
// { key: 'soul' | 'resonance' | 'dissonance', label, shown }.
export function resonanceTier(percent) {
  if (percent >= RESONANCE_TIERS.soul) return { key: 'soul', label: 'Soul Resonance', shown: percent }
  if (percent >= RESONANCE_TIERS.resonance) return { key: 'resonance', label: 'Resonance', shown: percent }
  return { key: 'dissonance', label: 'Dissonance', shown: 100 - percent }
}
