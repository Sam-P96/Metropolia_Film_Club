import { useEffect } from 'react'
import { motion } from 'motion/react'
import { FORREST } from '../../../../shared/forrest/rules.js'
import { FruitLegend, HowToText } from './HowTo'

// The start page's How to Play: the controls, the fruit, and how entries,
// cash-outs and free play work. Escape, the close button or a tap outside
// closes it.
export default function HowToDialog({ onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="forrest-how-to"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl border-2 border-[#8b5a2b] bg-[linear-gradient(160deg,#16301a_0%,#1d2a14_55%,#3a2716_100%)] p-5 text-white shadow-2xl shadow-black/60 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="forrest-how-to" className="font-['Bebas_Neue'] text-3xl tracking-wide text-[#b8e986]">
            How to play
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 cursor-pointer place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <HowToText className="flex flex-col gap-2 text-[15px] leading-relaxed" />
        <FruitLegend className="gap-4 text-base" />
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed text-[#f3ead8]/85">
          <li>
            Pick an entry: {FORREST.entries.join(', ')} PP (PP first, then P-PP). Fruit counts as many times over as the entry is tens: a 30 PP game is ×3.
          </li>
          <li>
            When the run ends, {FORREST.scorePerPoint} score is worth 1 PP. Cash it out (your entry back, the rest in P-PP) or throw it away to keep the
            cash-out for a better run.
          </li>
          <li>
            {FORREST.cashOutsPerDay} cash-outs a day, from 12:00. Once they&apos;re used, free play (×{FORREST.freeMult}) until 12:00: just for fun.
          </li>
          <li>Leaving the game mid-run loses the entry. A run ends after 20 minutes at most.</li>
          <li>
            Your followers hear about your cash-outs, and every member does when one pays {FORREST.bigWinTimes}× your entry or more. A new best (yours, or
            the site&apos;s) goes to every member.
          </li>
        </ul>
      </motion.section>
    </motion.div>
  )
}
