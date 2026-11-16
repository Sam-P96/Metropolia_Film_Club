// 8 Ball Pool's Ignitions: what flies off when balls collide (the shop,
// backend/utils/poolShop.js; drawn by frontend/src/components/pool/draw.js
// addSparks). Classic Sparks are everyone's and look as they always did;
// every other Ignition throws its own kind of particle instead, twice the
// size, so it's easy to see. The shooter's Ignition is the one that goes
// off, on every screen at the table. Bought with points, PP first, then
// P-PP; kept for good; the dearest 1,000.
//
// Ids never change once members own them.
//
// An Ignition's look:
//   shape    'spark' (Classic), 'ember', 'bubble', 'flake', 'petal',
//            'pixel', 'star', 'heart', 'confetti', 'bolt', 'coin', 'nebula'
//   colors   its own colours, or null: the colour of the ball that was hit
//            (purple for the 8 ball), like Classic Sparks
//   fall     how it drifts after the burst, in view units a second each
//            second: down (+) or up (-)
//   spin     turns a second, for shapes that turn
//   glow     drawn as light (added on top), not paint

import { CUE_PRICES } from './cues.js'

const IGNITIONS = [
  { key: 'sparks', name: 'Classic Sparks', tier: 'free', shape: 'spark', colors: null, glow: true },

  { key: 'embers', name: 'Embers', tier: 'standard', shape: 'ember', colors: ['#ffe27a', '#ff8a1f', '#e0200a'], fall: -120, glow: true },
  { key: 'bubbles', name: 'Bubbles', tier: 'standard', shape: 'bubble', colors: null, fall: -80 },

  { key: 'snow', name: 'Snowfall', tier: 'fine', shape: 'flake', colors: ['#ffffff', '#cdf3ff', '#9edcff'], fall: 60, spin: 0.6, glow: true },
  { key: 'petals', name: 'Petals', tier: 'fine', shape: 'petal', colors: null, fall: 50, spin: 1.2 },
  { key: 'pixels', name: 'Pixels', tier: 'fine', shape: 'pixel', colors: null },

  { key: 'stars', name: 'Stars', tier: 'luxury', shape: 'star', colors: null, spin: 1, glow: true },
  { key: 'hearts', name: 'Hearts', tier: 'luxury', shape: 'heart', colors: ['#ff5c9a', '#ff9cc4', '#ff2e6e'], fall: -60 },
  { key: 'confetti', name: 'Confetti', tier: 'luxury', shape: 'confetti', colors: ['#ff3d5a', '#ffe83d', '#3dff8b', '#3dc8ff', '#ff3dd8'], fall: 140, spin: 2.5 },

  { key: 'lightning', name: 'Lightning', tier: 'glowing', shape: 'bolt', colors: ['#bfe6ff', '#7fd0ff', '#ffffff'], glow: true },
  { key: 'coins', name: 'Coin Burst', tier: 'glowing', shape: 'coin', colors: ['#ffd65a', '#f0c040', '#a8791d'], fall: 220, spin: 3 },
  { key: 'nebula', name: 'Nebula', tier: 'glowing', shape: 'nebula', colors: null, spin: 0.4, glow: true },
]

const TIER_NAMES = { free: 'Free', standard: 'Standard', fine: 'Fine', luxury: 'Luxury', glowing: 'Glowing' }

export const ALL_IGNITIONS = IGNITIONS.map((ignition) => ({
  id: `ignition.${ignition.key}`,
  kind: 'ignition',
  name: ignition.name,
  tier: ignition.tier,
  category: TIER_NAMES[ignition.tier],
  price: ignition.tier === 'free' ? 0 : CUE_PRICES[ignition.tier],
  look: {
    shape: ignition.shape,
    colors: ignition.colors,
    fall: ignition.fall ?? 0,
    spin: ignition.spin ?? 0,
    glow: Boolean(ignition.glow),
  },
}))

export const DEFAULT_IGNITION = 'ignition.sparks'

const BY_ID = new Map(ALL_IGNITIONS.map((ignition) => [ignition.id, ignition]))

// The Ignition with `id`, or null.
export function ignitionItem(id) {
  return (typeof id === 'string' && BY_ID.get(id)) || null
}

// An Ignition's look, or Classic Sparks' if `id` isn't one.
export const ignitionLook = (id) => (ignitionItem(id) ?? BY_ID.get(DEFAULT_IGNITION)).look
