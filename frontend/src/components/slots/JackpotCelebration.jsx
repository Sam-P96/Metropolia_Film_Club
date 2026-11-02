import { useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import Confetti from '../wheel/Confetti'
import SymbolArt from './SymbolArt'
import { formatPoints } from './format'
import { SLOTS } from '../../../../shared/slots/config.js'

const JACKPOT = SLOTS.symbols.find((symbol) => symbol.jackpot).key

// The jackpot, on the winner's own screen: the whole screen in gold, the
// logo, the win, and confetti. A tap anywhere, or Escape, carries on.
export default function JackpotCelebration({ amount, onClose }) {
  const reduce = useReducedMotion()

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      role="alertdialog"
      aria-label={`Jackpot! You won ${formatPoints(amount)} PP`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={onClose}
      className="fixed inset-0 z-200 flex cursor-pointer flex-col items-center justify-center gap-4 p-6 text-center"
      style={{ background: 'radial-gradient(circle at 50% 40%, #FFE7A3 0%, var(--color-brand-gold) 35%, #B9821A 75%, var(--color-ink) 120%)' }}
    >
      <Confetti fire={1} count={260} duration={7000} />
      <motion.div
        initial={{ scale: 0.4, rotate: -12 }}
        animate={reduce ? { scale: 1, rotate: 0 } : { scale: [0.4, 1.15, 1], rotate: [-12, 6, 0] }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="rounded-full bg-white/80 p-5 shadow-[0_0_60px_rgba(255,255,255,0.8)]"
      >
        <SymbolArt symbolKey={JACKPOT} size={110} />
      </motion.div>
      <h2 className="font-['Bebas_Neue'] text-7xl leading-none tracking-wider text-ink drop-shadow-[0_2px_0_rgba(255,255,255,0.6)] sm:text-8xl">
        Jackpot!
      </h2>
      <p className="font-['Bebas_Neue'] text-5xl tracking-wide text-ink">+{formatPoints(amount)} PP</p>
      <p className="text-sm font-semibold text-ink/70">Everyone on the site is hearing about this. Tap to keep playing.</p>
    </motion.div>
  )
}
