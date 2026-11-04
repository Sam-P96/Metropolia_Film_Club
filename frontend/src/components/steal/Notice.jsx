import { AnimatePresence, motion } from 'motion/react'
import { EASE } from './motion'

// The line saying how a buy, sale or trade went ({ ok, text }, or null for
// none). It slides down and fades in, and a new one replaces the last.
export default function Notice({ message }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {message && (
        <motion.p
          key={message.text}
          role="status"
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto', transition: { duration: 0.28, ease: EASE } }}
          exit={{ opacity: 0, y: -6, height: 0, transition: { duration: 0.18 } }}
          className="overflow-hidden"
        >
          <span
            className={`block rounded-xl border bg-black/40 p-3 text-sm ${message.ok ? 'border-emerald-400/50 text-emerald-200' : 'border-brand-red/50 text-white/80'}`}
          >
            {message.text}
          </span>
        </motion.p>
      )}
    </AnimatePresence>
  )
}
