import { motion } from 'motion/react'
import { EASE } from './motion'

// A section that slides up and fades in once its page has loaded, a moment
// after the one before (`order`: 0, 1, 2...), so a page builds up rather
// than snapping into place all at once.
export default function Reveal({ order = 0, className = '', children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE, delay: order * 0.07 } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// What shows while a page loads: soft pulsing boxes that fade away as
// the real thing slides in.
export function Placeholder({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-white/10 motion-reduce:animate-none ${className}`} />
}
