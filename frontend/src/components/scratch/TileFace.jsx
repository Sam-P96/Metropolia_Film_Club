import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'

// What's under a tile's foil, and how it shows itself once the foil is gone
// (`uncovered`): a blank settles softly, a star pops with a spring and a
// gold glow, and the Golden Ticket pops bigger with a shine sweeping across
// it. `dim` is a tile shown by "Reveal card" that wasn't scratched;
// `missed` is a Golden Ticket that was on the card but never found.

// An id for an icon's gradient, different for every icon on the page (a
// card shows sixteen tiles, and ids have to be unique).
function useGradientId() {
  return `g${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}

export function StarIcon({ className }) {
  const id = useGradientId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE7A3" />
          <stop offset="0.55" stopColor="#FABC3F" />
          <stop offset="1" stopColor="#C98A12" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.6l2.84 5.76 6.36.92-4.6 4.48 1.08 6.33L12 17.1l-5.68 2.99 1.08-6.33-4.6-4.48 6.36-.92z"
        fill={`url(#${id})`}
        stroke="#8A5A06"
        strokeWidth="0.6"
        strokeLinejoin="round"
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

export default function TileFace({ content, uncovered, dim = false, missed = false }) {
  const settled = { opacity: dim ? 0.38 : 1, scale: 1, rotate: 0, filter: dim ? 'grayscale(0.4)' : 'grayscale(0)' }

  if (content === 'star') {
    return (
      <motion.div
        className="flex size-full items-center justify-center"
        initial={false}
        animate={uncovered ? settled : { opacity: 1, scale: 0.85, rotate: 0 }}
        transition={uncovered && !dim ? { type: 'spring', stiffness: 420, damping: 13 } : { duration: 0.3 }}
      >
        <motion.span
          className="block size-[72%]"
          initial={false}
          animate={
            uncovered && !dim
              ? { filter: ['drop-shadow(0 0 0px #FABC3F)', 'drop-shadow(0 0 14px #FABC3F)', 'drop-shadow(0 0 6px #FABC3F)'] }
              : { filter: 'drop-shadow(0 0 0px #FABC3F)' }
          }
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <StarIcon className="size-full" />
        </motion.span>
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
