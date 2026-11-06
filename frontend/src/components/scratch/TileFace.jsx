import { useId } from 'react'
import { motion, useReducedMotion, useTransform } from 'motion/react'
import { TICKET_THEMES, ticketTheme } from './ticketThemes'

// What's under a tile's foil, and how it shows itself once the foil is gone
// (`uncovered`): a blank settles softly, a star pops with a spring and a
// glow, and the Golden Ticket pops bigger with a shine sweeping across it.
// `dim` is a tile shown by "Reveal card" that wasn't scratched; `missed` is
// a Golden Ticket that was on the card but never found. `type` is the
// card's ticket type, for its stars' colours (ticketThemes.js): gold, or on
// a VIP card, red, glowing in a slow pulse and drifting with the phone's
// tilt (`starMotion`, hooks/useStarMotion.js). The Golden Ticket is the
// same on every card.

// An id for an icon's gradient, different for every icon on the page (a
// card shows sixteen tiles, and ids have to be unique).
function useGradientId() {
  return `g${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}

// A star. `colors` is a theme's `star` (ticketThemes.js): gold unless told.
// Its edge glow (VIP's red) is an SVG filter inside the icon, painted with
// the icon itself. (It was a CSS filter on the <svg>: inside a VIP card's
// moving, glowing star, inside a masked, blurred, 3D-flipped ticket, Chrome
// on some computers sometimes stopped drawing the star at all.)
export function StarIcon({ className, colors = TICKET_THEMES.standard.star }) {
  const id = useGradientId()
  const glowId = `${id}-glow`
  const glow = colors.edgeGlow
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" overflow="visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors.hi} />
          <stop offset="0.55" stopColor={colors.mid} />
          <stop offset="1" stopColor={colors.lo} />
        </linearGradient>
        {glow && (
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation={glow.blur} floodColor={glow.color} floodOpacity={glow.opacity} />
          </filter>
        )}
      </defs>
      <path
        d="M12 2.6l2.84 5.76 6.36.92-4.6 4.48 1.08 6.33L12 17.1l-5.68 2.99 1.08-6.33-4.6-4.48 6.36-.92z"
        fill={`url(#${id})`}
        stroke={colors.edge}
        strokeWidth="0.6"
        strokeLinejoin="round"
        filter={glow ? `url(#${glowId})` : undefined}
      />
    </svg>
  )
}

export function GoldenTicketIcon({ className }) {
  const id = useGradientId()
  return (
    <svg viewBox="0 0 32 22" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF1C4" />
          <stop offset="0.45" stopColor="#FABC3F" />
          <stop offset="1" stopColor="#B87A0C" />
        </linearGradient>
      </defs>
      <path
        d="M3 2h26a2 2 0 0 1 2 2v4a3 3 0 0 0 0 6v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-4a3 3 0 0 0 0-6V4a2 2 0 0 1 2-2z"
        fill={`url(#${id})`}
        stroke="#8A5A06"
        strokeWidth="0.8"
      />
      <path d="M22 4v14" stroke="#8A5A06" strokeWidth="0.8" strokeDasharray="1.6 1.4" />
      <path d="M11.5 7.4l1.1 2.2 2.4.35-1.75 1.7.42 2.4-2.17-1.14-2.17 1.14.42-2.4-1.75-1.7 2.4-.35z" fill="#8A5A06" />
    </svg>
  )
}

// A blank: an empty film frame, faint.
function BlankIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M4 7h16M4 17h16" />
      <path d="M6.5 4.8v.4M6.5 18.8v.4M17.5 4.8v.4M17.5 18.8v.4" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  )
}

// A light that sweeps across the Golden Ticket, over and over.
function Shine({ className = '' }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <motion.span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/55 to-transparent ${className}`}
      initial={{ x: '-120%' }}
      animate={{ x: '120%' }}
      transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.9, ease: 'easeInOut' }}
    />
  )
}

// How far a floating star rises (px), how long one way takes (s), and how
// far apart in time neighbouring stars start, so they never move as one.
const FLOAT_PX = 2.5
const FLOAT_S = 1.6
const FLOAT_STAGGER_S = 0.37

// A gold star's glow as it's uncovered: a burst that settles to a soft glow.
// (A live VIP star pops with a flash of its halo instead: LiveStar.)
const burst = (color, settle) => [`drop-shadow(0 0 0px ${color})`, `drop-shadow(0 0 14px ${color})`, `drop-shadow(0 0 ${settle}px ${color})`]

// A VIP star, once uncovered (`glowing`): a soft red glow behind it pulsing
// every 1.2 s (index.css .star-pulse), and the star drifting, by tilt or
// floating (`starMotion`). Each star follows the tilt a little more or
// less, by its place on the card, for a touch of depth. Everything moves
// inside the tile, a few pixels at most, so nothing spills out.
//
// Nothing in here uses a CSS filter: only movement and fading, which every
// browser draws reliably. The pop as it's uncovered is a flash of glow
// behind it (growing and fading), not a drop-shadow, and its edge glow is
// inside the icon (StarIcon). With filters on these moving layers, inside
// the ticket's mask, blur and 3D flip, Chrome on some computers sometimes
// stopped drawing the star, mostly while it floated (computers only).
function LiveStar({ index, glowing, starMotion, colors }) {
  const depth = 0.8 + ((index * 3) % 5) * 0.1
  const x = useTransform(starMotion.x, (value) => value * depth)
  const y = useTransform(starMotion.y, (value) => value * depth)
  const rotate = useTransform(starMotion.rotate, (value) => value * depth)
  const floating = glowing && starMotion.mode === 'float'
  const halo = { background: `radial-gradient(circle, ${colors.glow} 0%, transparent 62%)` }

  return (
    <motion.span
      className="relative block size-[72%]"
      initial={false}
      animate={{ y: floating ? -FLOAT_PX : 0 }}
      transition={
        floating
          ? { duration: FLOAT_S, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror', delay: (index % 5) * FLOAT_STAGGER_S }
          : { duration: 0.5, ease: 'easeOut' }
      }
    >
      <motion.span className="relative block size-full" style={glowing ? { x, y, rotate } : undefined}>
        <span aria-hidden="true" className={`absolute -inset-[12%] rounded-full ${glowing ? 'star-pulse' : 'opacity-0'}`} style={halo} />
        <motion.span
          aria-hidden="true"
          className="absolute -inset-[18%] rounded-full"
          style={halo}
          initial={false}
          animate={glowing ? { opacity: [0, 1, 0], scale: [0.6, 1.1, 1.25] } : { opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        <StarIcon className="relative size-full" colors={colors} />
      </motion.span>
    </motion.span>
  )
}

export default function TileFace({ content, uncovered, dim = false, missed = false, type, index = 0, starMotion = null }) {
  // Greyed out only when dim: a revealed tile carries no filter at all.
  const settled = { opacity: dim ? 0.38 : 1, scale: 1, rotate: 0, ...(dim ? { filter: 'grayscale(0.4)' } : {}) }

  if (content === 'star') {
    const theme = ticketTheme(type)
    const colors = theme.star
    const glowing = uncovered && !dim

    return (
      <motion.div
        className="flex size-full items-center justify-center"
        initial={false}
        animate={uncovered ? settled : { opacity: 1, scale: 0.85, rotate: 0 }}
        transition={uncovered && !dim ? { type: 'spring', stiffness: 420, damping: 13 } : { duration: 0.3 }}
      >
        {theme.liveStars && starMotion ? (
          <LiveStar index={index} glowing={glowing} starMotion={starMotion} colors={colors} />
        ) : (
          <motion.span
            className="block size-[72%]"
            initial={false}
            animate={glowing ? { filter: burst(colors.glow, 6) } : { filter: `drop-shadow(0 0 0px ${colors.glow})` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <StarIcon className="size-full" colors={colors} />
          </motion.span>
        )}
      </motion.div>
    )
  }

  if (content === 'golden') {
    return (
      <motion.div
        className="relative flex size-full items-center justify-center overflow-hidden rounded-[inherit] bg-brand-gold/15"
        initial={false}
        animate={
          uncovered
            ? { opacity: 1, scale: 1, boxShadow: '0 0 22px 2px rgba(250,188,63,0.75) inset' }
            : { opacity: 1, scale: 0.8, boxShadow: '0 0 0px 0px rgba(250,188,63,0) inset' }
        }
        transition={uncovered ? { type: 'spring', stiffness: 300, damping: 11 } : { duration: 0.3 }}
      >
        <GoldenTicketIcon className="relative w-[82%]" />
        {(uncovered || missed) && <Shine />}
      </motion.div>
    )
  }

  return (
    <motion.div
      className="flex size-full items-center justify-center text-white/15"
      initial={false}
      animate={uncovered ? settled : { opacity: 0.8, scale: 0.94 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <BlankIcon className="size-[52%]" />
    </motion.div>
  )
}
