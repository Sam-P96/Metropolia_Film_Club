import { motion, useReducedMotion } from 'motion/react'

// A row of cinema marquee bulbs, lighting up one after another like a
// sign outside a theatre. Still bulbs with reduced motion.
export function Bulbs({ count = 14, className = '' }) {
  const reduce = useReducedMotion()

  return (
    <div className={`flex justify-between ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-brand-gold shadow-[0_0_6px_1px_rgba(250,188,63,0.8)]"
          initial={{ opacity: 0.45 }}
          animate={reduce ? { opacity: 0.85 } : { opacity: [0.3, 1, 0.3] }}
          transition={reduce ? { duration: 0.2 } : { duration: 1.4, repeat: Infinity, delay: (i % 7) * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// A placeholder that shimmers softly while something loads, at the size of
// what it stands in for, so nothing jumps when the real thing arrives.
export function Skeleton({ className = '' }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      aria-hidden="true"
      className={`rounded-xl bg-linear-to-r from-white/5 via-white/12 to-white/5 bg-size-[200%_100%] ${className}`}
      initial={{ backgroundPosition: '100% 0' }}
      animate={reduce ? { opacity: [0.5, 0.8, 0.5] } : { backgroundPosition: ['100% 0', '-100% 0'] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
    />
  )
}
