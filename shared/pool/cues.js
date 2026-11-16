// 8 Ball Pool's cues: the shop (8 Ball Pool's page → Shop,
// backend/utils/poolShop.js), and how each one is drawn
// (frontend/src/components/pool/draw.js drawCue). Bought with points, PP
// first, then P-PP; kept for good. Classic is everyone's. The Glowing ones
// (1,000) glow on the table, and the Sabers (2,000; the Crossguard Saber
// 3,000) are blades of light.
//
// Ids never change once members own them.
//
// A cue's look:
//   shaft    [near the tip, near the joint]: the light wood up front
//   butt     [at the joint, at the end]: the heavy back half
//   joint    the ring where they meet
//   inlay    a pattern on the butt: null, 'stripes', 'diamonds' or 'flames',
//            in `inlayColor`
//   glow     the colour it glows (Glowing cues), or 'rainbow': every
//            colour, going round
//   pulse    how it glows: 'breathe' (swells and eases), 'flicker' (like
//            a flame) or 'flow' (light running down it)
//   saber    a Saber: the front is a blade of light in this colour, the
//            back a metal hilt (`shaft` and `butt` are only used if a
//            saber can't be drawn). `crossguard`: two short blades out of
//            the sides at the hilt, crackling.

export const CUE_PRICES = { standard: 100, fine: 250, luxury: 500, glowing: 1000, saber: 2000 }

const CUES = [
  { key: 'classic', name: 'Classic', tier: 'free', shaft: ['#f1dfb5', '#d8b37a'], butt: ['#1a0d06', '#3b1b0a'], joint: '#c9982f' },

  { key: 'ebony', name: 'Ebony', tier: 'standard', shaft: ['#efe3c8', '#d9c29a'], butt: ['#0c0c0e', '#26262b'], joint: '#c8ccd4' },
  { key: 'cherry', name: 'Cherry', tier: 'standard', shaft: ['#f3dcb8', '#dcb27c'], butt: ['#5c0a12', '#9e1b26'], joint: '#e8d3a0' },
  { key: 'ocean', name: 'Ocean', tier: 'standard', shaft: ['#f0e6d0', '#cfc1a0'], butt: ['#08304f', '#1a6aa0'], joint: '#d9e8f2' },
  { key: 'forest', name: 'Forest', tier: 'standard', shaft: ['#efdfba', '#cdb07a'], butt: ['#0d3b22', '#1f6b3f'], joint: '#d6c38c' },

  { key: 'tiger', name: 'Tiger Maple', tier: 'fine', shaft: ['#f6e3b4', '#e2b866'], butt: ['#b5651d', '#7a3b0c'], joint: '#1b1b1b', inlay: 'stripes', inlayColor: '#2a1405' },
  { key: 'carbon', name: 'Carbon', tier: 'fine', shaft: ['#e9e9e9', '#bdbdbd'], butt: ['#1d1f22', '#3a3e44'], joint: '#7fd0ff', inlay: 'diamonds', inlayColor: '#5a6068' },
  { key: 'rose-gold', name: 'Rose Gold', tier: 'fine', shaft: ['#fbe7dc', '#e9c0aa'], butt: ['#b76e79', '#7d3f4a'], joint: '#f5d0b5', inlay: 'diamonds', inlayColor: '#f5d0b5' },
  { key: 'hot-rod', name: 'Hot Rod', tier: 'fine', shaft: ['#f3e2c0', '#d8b37a'], butt: ['#151515', '#2b2b2b'], joint: '#ff7b00', inlay: 'flames', inlayColor: '#ff7b00' },

  { key: 'royal', name: 'Royal', tier: 'luxury', shaft: ['#f6ead0', '#e2c68c'], butt: ['#2a0f4d', '#5b2a96'], joint: '#f2c04b', inlay: 'diamonds', inlayColor: '#f2c04b' },
  { key: 'emerald', name: 'Emerald Crown', tier: 'luxury', shaft: ['#f4e8cc', '#dcc58e'], butt: ['#03361f', '#0b7a47'], joint: '#f2c04b', inlay: 'stripes', inlayColor: '#f2c04b' },
  { key: 'obsidian', name: 'Obsidian', tier: 'luxury', shaft: ['#e8e2d6', '#bfb6a4'], butt: ['#050506', '#1b1820'], joint: '#d4af37', inlay: 'flames', inlayColor: '#d4af37' },

  { key: 'neon', name: 'Neon', tier: 'glowing', shaft: ['#ffe6f3', '#ff9cd0'], butt: ['#2b0420', '#5c0b45'], joint: '#ff4fd8', inlay: 'stripes', inlayColor: '#ff4fd8', glow: '#ff3db8', pulse: 'breathe' },
  { key: 'plasma', name: 'Plasma', tier: 'glowing', shaft: ['#e6f7ff', '#8fd8ff'], butt: ['#04203a', '#0a4d80'], joint: '#7fe3ff', inlay: 'diamonds', inlayColor: '#7fe3ff', glow: '#2fb8ff', pulse: 'flow' },
  { key: 'inferno', name: 'Inferno', tier: 'glowing', shaft: ['#fff1c9', '#ffb347'], butt: ['#2a0700', '#6b1400'], joint: '#ffd23f', inlay: 'flames', inlayColor: '#ff7b00', glow: '#ff5a00', pulse: 'flicker' },
  { key: 'void', name: 'Void', tier: 'glowing', shaft: ['#efe2ff', '#b48cff'], butt: ['#0b0216', '#2a0a52'], joint: '#c79bff', inlay: 'diamonds', inlayColor: '#8a3dff', glow: '#9b4dff', pulse: 'breathe' },
  { key: 'toxic', name: 'Toxic', tier: 'glowing', shaft: ['#f2ffe0', '#b6ff6b'], butt: ['#0a1f02', '#1f4d06'], joint: '#c6ff3d', inlay: 'stripes', inlayColor: '#7dff2f', glow: '#6dff2a', pulse: 'flow' },
  { key: 'prism', name: 'Prism', tier: 'glowing', shaft: ['#ffffff', '#e8e8ff'], butt: ['#120a1f', '#2a1a40'], joint: '#ffffff', inlay: 'diamonds', inlayColor: '#ffffff', glow: 'rainbow', pulse: 'flow' },

  { key: 'saber-red', name: 'Red Saber', tier: 'saber', shaft: ['#ffffff', '#ffd6d6'], butt: ['#2a2d33', '#8a9099'], joint: '#c0c6cf', glow: '#ff2a2a', pulse: 'saber', saber: '#ff2a2a' },
  { key: 'saber-blue', name: 'Blue Saber', tier: 'saber', shaft: ['#ffffff', '#d6e8ff'], butt: ['#2a2d33', '#8a9099'], joint: '#c0c6cf', glow: '#2f8bff', pulse: 'saber', saber: '#2f8bff' },
  { key: 'saber-green', name: 'Green Saber', tier: 'saber', shaft: ['#ffffff', '#d6ffdc'], butt: ['#2a2d33', '#8a9099'], joint: '#c0c6cf', glow: '#3dff5a', pulse: 'saber', saber: '#3dff5a' },
  // The one Saber dearer than the rest.
  { key: 'saber-crossguard', name: 'Crossguard Saber', tier: 'saber', price: 3000, shaft: ['#ffffff', '#ffd6d6'], butt: ['#1b1b1e', '#4a4d55'], joint: '#8a9099', glow: '#ff1e1e', pulse: 'saber', saber: '#ff1e1e', crossguard: true },
]

const TIER_NAMES = { free: 'Free', standard: 'Standard', fine: 'Fine', luxury: 'Luxury', glowing: 'Glowing', saber: 'Sabers' }
export const CUE_TIERS = ['free', 'standard', 'fine', 'luxury', 'glowing', 'saber']

export const ALL_CUES = CUES.map((cue) => ({
  id: `cue.${cue.key}`,
  kind: 'cue',
  name: cue.name,
  tier: cue.tier,
  category: TIER_NAMES[cue.tier],
  price: cue.price ?? (cue.tier === 'free' ? 0 : CUE_PRICES[cue.tier]),
  look: {
    shaft: cue.shaft,
    butt: cue.butt,
    joint: cue.joint,
    inlay: cue.inlay ?? null,
    inlayColor: cue.inlayColor ?? null,
    glow: cue.glow ?? null,
    pulse: cue.pulse ?? null,
    saber: cue.saber ?? null,
    crossguard: Boolean(cue.crossguard),
  },
}))

export const DEFAULT_CUE = 'cue.classic'

const BY_ID = new Map(ALL_CUES.map((cue) => [cue.id, cue]))

// The cue with `id`, or null.
export function cueItem(id) {
  return (typeof id === 'string' && BY_ID.get(id)) || null
}

// A cue's look, or Classic's if `id` isn't a cue.
export const cueLook = (id) => (cueItem(id) ?? BY_ID.get(DEFAULT_CUE)).look
