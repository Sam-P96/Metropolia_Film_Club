import { RESONANCE_TIERS } from '../../../shared/resonance.js'

// How Resonance matches are labelled, for the card and the Resonance page.
// The tiers themselves are in shared/resonance.js.

// How the logged-in member and the other one follow each other.
export const RELATIONS = {
  friends: 'Friend',
  following: 'You follow them',
  followsYou: 'Follows you',
}

// The two Resonance settings, as Edit profile and the Resonance page show
// them: the label, and what it means on and off. Keyed by the profile field.
export const RESONANCE_SETTINGS = {
  resonance: {
    label: 'Resonance',
    on: 'Your taste match with other members, from your film ratings, shows on the home page and the Resonance page. It needs 20 rated films.',
    off: "You don't appear in anyone's suggestions, rankings or icons, and you won't see Resonance yourself. Turning it back on brings it all straight back.",
  },
  resonanceIcon: {
    label: 'Resonance icon',
    on: `The Resonance icon shows after the names of members you share a Soul Resonance (${RESONANCE_TIERS.soul}%+) with, and after yours for them.`,
    off: "No Resonance icon after your name for anyone, and none after anyone else's for you.",
  },
}

// The colour of each tier's number.
export const TIER_COLOURS = {
  soul: 'text-brand-gold',
  resonance: 'text-emerald-300',
  dissonance: 'text-red-300',
}
