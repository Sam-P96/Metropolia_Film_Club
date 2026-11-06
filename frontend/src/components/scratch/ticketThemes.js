import { DEFAULT_TICKET_TYPE } from '../../../../shared/scratch/tickets.js'

// How each Box Office Scratch ticket type looks, all in this one place.
//
// `vars` are CSS variables, set on the ticket (ScratchTicket's TicketFrame)
// and on each type's Buy button. Every coloured part of those reads them
// (text-(--tk-label), border-(--tk-edge) and so on), so a ticket takes its
// type's look from the one element its type is set on. The rest is what CSS
// variables can't reach:
//   star       the star icon's SVG colours (gradient top to bottom, outline)
//              and the glow it pops with, plus a drop-shadow it always has
//   liveStars  revealed stars glow in a slow pulse and drift: with the
//              phone's tilt, or floating gently on a computer
//              (hooks/useStarMotion.js)
//   bodyClass  an extra class for the ticket's body, and its Buy button
//              (index.css, "Box Office Scratch tickets")
//   aura       a CardShine tone round the Buy button
//   tag        the type's name on the dark page (Recent jackpots, How to
//              play, jackpot notifications)
//   jackpotGlow  the glow breathing round its jackpot notification
//
// Standard is the ticket as it always was: deep blue, gold stars.

const GOLD_STAR = {
  hi: '#FFE7A3',
  mid: '#FABC3F',
  lo: '#C98A12',
  edge: '#8A5A06',
  glow: '#FABC3F',
  shadow: null,
}

// `colour` at `percent`% strength, mixed exactly the way Tailwind mixes
// text-white/60 and the like, so Standard comes out pixel for pixel as it
// did when these were Tailwind classes.
const see = (colour, percent) => `color-mix(in oklab, ${colour} ${percent}%, transparent)`
const WHITE = 'var(--color-white)'
const GOLD = 'var(--color-brand-gold)'

const STANDARD = {
  // The ticket
  '--tk-body': see('var(--color-ticket)', 90),
  '--tk-edge': see(WHITE, 10),
  '--tk-rule': see(WHITE, 20),
  '--tk-footer-rule': see(WHITE, 10),
  '--tk-well': '#14133A',
  '--tk-tile-edge': see(WHITE, 10),
  '--tk-focus': GOLD,
  '--tk-bulb': GOLD,
  '--tk-bulb-glow': 'rgba(250, 188, 63, 0.8)',
  // The marquee a win (or the Bomb) shows on, and the Golden Ticket's
  '--tk-banner': see('var(--color-black)', 60),
  '--tk-banner-strong': see('var(--color-black)', 70),
  // Its words
  '--tk-title': GOLD,
  '--tk-title-glow': 'rgba(250, 188, 63, 0.35)',
  '--tk-fine': see(WHITE, 50),
  '--tk-label': see(WHITE, 60),
  '--tk-value': WHITE,
  '--tk-status': see(WHITE, 70),
  '--tk-ask': see(WHITE, 80),
  '--tk-seal': see(WHITE, 45),
  '--tk-ok': 'var(--color-emerald-300)',
  '--tk-bad': 'var(--color-red-300)',
  '--tk-highlight': GOLD,
  '--tk-highlight-via': WHITE,
  // Its buttons: the main one (Reveal card), and the quieter ones (Collect)
  '--tk-cta': GOLD,
  '--tk-cta-text': 'var(--color-ink)',
  '--tk-ghost': see(WHITE, 5),
  '--tk-ghost-hover': see(WHITE, 10),
  '--tk-ghost-edge': see(WHITE, 20),
  '--tk-ghost-hover-edge': see(GOLD, 60),
  '--tk-ghost-text': WHITE,
  // The Buy button, and how strong its small "PP + P-PP" line is
  '--tk-buy': GOLD,
  '--tk-buy-text': 'var(--color-ink)',
  '--tk-buy-glow': 'rgba(250, 188, 63, 0.3)',
  '--tk-buy-detail': '0.75',
  // Its notifications (ScratchNotice). A win is on the ticket's own body:
  // its words, the ticket's name in them, the prize, and the winner's name
  // under the pointer. A jackpot is on dark glass, with a coloured rim
  // (and the glow round it, `jackpotGlow` below).
  '--tk-notice-text': see(WHITE, 90),
  '--tk-notice-faint': see(WHITE, 40),
  '--tk-notice-name': GOLD,
  '--tk-prize': GOLD,
  '--tk-link-hover': GOLD,
  '--tk-jackpot-bg': see('var(--color-black)', 75),
  '--tk-jackpot-edge': GOLD,
}

// VIP's gold: the ticket's body, and its Buy button, where the same light
// sweeps and glitter twinkles (bodyClass, ticket-gold).
const VIP_GOLD =
  'linear-gradient(135deg, #CF9A33 0%, #F2C964 16%, #E0AE45 32%, #FFE7A6 50%, #DDA944 68%, #F5D07A 84%, #D29D36 100%)'

// The glow that breathes round a jackpot notification, from small to big.
const glow = (rgb, small, big) => ({ small: `0 0 14px 1px rgba(${rgb}, ${small})`, big: `0 0 30px 4px rgba(${rgb}, ${big})` })

export const TICKET_THEMES = {
  standard: {
    star: GOLD_STAR,
    liveStars: false,
    bodyClass: '',
    aura: null,
    tag: '#FABC3F',
    jackpotGlow: glow('250, 188, 63', 0.45, 0.75),
    vars: STANDARD,
  },

  // The Standard ticket in cinema red: body, edges, the title's glow and
  // the small accents. Stars, Golden Ticket and bulbs stay gold.
  premium: {
    star: GOLD_STAR,
    liveStars: false,
    bodyClass: '',
    aura: null,
    tag: '#FF8A9B',
    jackpotGlow: glow('226, 61, 87', 0.45, 0.8),
    vars: {
      ...STANDARD,
      '--tk-notice-name': '#FF8A9B',
      '--tk-jackpot-bg': 'rgb(42 7 17 / 0.8)',
      '--tk-jackpot-edge': '#E23D57',
      '--tk-body': 'rgb(92 22 40 / 0.9)',
      '--tk-edge': 'rgb(251 113 133 / 0.22)',
      '--tk-rule': 'rgb(253 164 175 / 0.28)',
      '--tk-footer-rule': 'rgb(251 113 133 / 0.16)',
      '--tk-well': '#2E0A14',
      '--tk-tile-edge': 'rgb(251 113 133 / 0.18)',
      '--tk-title-glow': 'rgb(239 54 82 / 0.6)',
      '--tk-ghost-hover-edge': 'rgb(251 113 133 / 0.65)',
      // A deep crimson, so its white words (the small line too, at 90%)
      // stay at least 4.5:1.
      '--tk-buy': 'linear-gradient(180deg, #B8243D 0%, #8E1529 100%)',
      '--tk-buy-text': '#FFF5F6',
      '--tk-buy-glow': 'rgb(199 37 62 / 0.4)',
      '--tk-buy-detail': '0.9',
    },
  },

  // Sparkly gold, outlined and buttoned in purple, with red bulbs and
  // glowing red stars. The gold never goes darker than #CF9A33, and every
  // word on it is a deep purple at least 4.5:1 against that.
  vip: {
    star: {
      hi: '#FFC9CF',
      mid: '#F23B55',
      lo: '#A3112C',
      edge: '#5E0716',
      glow: '#F23B55',
      shadow: 'drop-shadow(0 0 3px rgb(242 59 85 / 0.75))',
    },
    liveStars: true,
    bodyClass: 'ticket-gold',
    aura: 'friend',
    tag: '#C9A8FF',
    // A gold rim in a purple aura, like VIP's Buy button.
    jackpotGlow: glow('168, 110, 255', 0.5, 0.85),
    vars: {
      ...STANDARD,
      '--tk-notice-text': '#240A38',
      '--tk-notice-faint': '#4A1D6E',
      '--tk-notice-name': '#5B1374',
      '--tk-prize': '#3B0764',
      '--tk-link-hover': '#5B1374',
      '--tk-jackpot-bg': 'rgb(24 8 44 / 0.82)',
      '--tk-body': VIP_GOLD,
      '--tk-edge': '#7C3AED',
      '--tk-edge-glow': 'rgb(124 58 237 / 0.28)',
      '--tk-rule': 'rgb(109 40 217 / 0.7)',
      '--tk-footer-rule': 'rgb(109 40 217 / 0.35)',
      '--tk-well': '#1F0B35',
      '--tk-tile-edge': 'rgb(139 92 246 / 0.8)',
      '--tk-focus': '#6D28D9',
      '--tk-bulb': '#F0384F',
      '--tk-bulb-glow': 'rgb(240 56 79 / 0.8)',
      '--tk-banner': 'rgb(31 11 53 / 0.94)',
      '--tk-banner-strong': 'rgb(26 8 46 / 0.96)',
      '--tk-title': '#3B0764',
      '--tk-title-glow': 'rgb(255 247 222 / 0.85)',
      '--tk-fine': '#4A1D6E',
      '--tk-label': '#44195F',
      '--tk-value': '#240A38',
      '--tk-status': '#33114D',
      '--tk-ask': '#2E0F47',
      '--tk-seal': '#4A1D6E',
      '--tk-ok': '#063D20',
      '--tk-bad': '#6B0F1A',
      '--tk-highlight': '#3B0764',
      '--tk-highlight-via': '#5B1374',
      '--tk-cta': '#6D28D9',
      '--tk-cta-text': '#FFFFFF',
      // The quieter buttons in solid lavender: see-through, the gold under
      // them turned them beige.
      '--tk-ghost': '#ECE2FF',
      '--tk-ghost-hover': '#DDCBFF',
      '--tk-ghost-edge': '#7C3AED',
      '--tk-ghost-hover-edge': '#5B21B6',
      '--tk-ghost-text': '#3B0764',
      '--tk-buy': VIP_GOLD,
      '--tk-buy-text': '#0B0710',
      '--tk-buy-glow': 'rgb(250 188 63 / 0)',
    },
  },
}

// A type's theme; Standard's for anything else.
export const ticketTheme = (type) => TICKET_THEMES[type] ?? TICKET_THEMES[DEFAULT_TICKET_TYPE]
