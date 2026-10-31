import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import AnimatedNumber from '../AnimatedNumber'
import CoinIcon from '../wallet/CoinIcon'
import { SCRATCH } from '../../../../shared/scratch/config.js'

const GLASS = 'rounded-2xl border border-white/10 bg-black/40 shadow-xl shadow-black/40 backdrop-blur-md'

// 1 -> "1st", 3 -> "3rd", 4 -> "4th", for whatever starsToWin is set to.
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`
const NEEDED = ordinal(SCRATCH.starsToWin)

// The jackpot prize: bold gold that glows, breathing slowly. With reduced
// motion it holds the glow still instead.
const GLOW = {
  textShadow: ['0 0 6px rgba(250,188,63,0.45)', '0 0 16px rgba(250,188,63,0.9)', '0 0 6px rgba(250,188,63,0.45)'],
}

// "How to play": the rules, and what every tier pays. Opens and closes
// smoothly. `jackpot` is the pool right now (null while it loads), so the
// Golden Ticket's row shows the real amount.
export default function HowToPlay({ jackpot = null }) {
  const [open, setOpen] = useState(false)
  const calm = useReducedMotion()

  return (
    <section className={GLASS}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">How to play</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="text-white/60" aria-hidden="true">
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="rules"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 px-5 pb-5 text-sm text-white/80">
              <ol className="flex list-decimal flex-col gap-1 pl-5">
                <li>
                  A ticket costs {SCRATCH.ticketPrice} points: your PP first, then P-PP for the rest.
                </li>
                <li>
                  The card has {SCRATCH.rows * SCRATCH.cols} tiles, {SCRATCH.stars} of them stars. You get {SCRATCH.scratches} scratches.
                </li>
                <li>
                  Find {SCRATCH.starsToWin} stars to win. The sooner your {NEEDED} star turns up, the bigger the win, and it&apos;s
                  paid the moment it does.
                </li>
                <li>Then keep scratching: the scratches left are a hunt for the Golden Ticket, which wins the whole jackpot.</li>
                <li>Collect ends the card early, leaving your scratches left unused.</li>
              </ol>

              {/* What each tier pays, big enough to be the point of the table. */}
              <table className="w-full text-left tabular-nums">
                <thead className="text-xs uppercase tracking-widest text-white/50">
                  <tr>
                    <th className="py-1 font-medium">{NEEDED} star on</th>
                    <th className="py-1 font-medium">Tier</th>
                    <th className="py-1 text-right font-medium">Prize</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {SCRATCH.tiers.map((tier) => (
                    <tr key={tier.key}>
                      <td className="py-2 text-white/70">Scratch {tier.scratch}</td>
                      <td className="py-2 text-white">{tier.name}</td>
                      <td className="py-2 text-right">
                        {tier.refund ? (
                          <span className="font-semibold text-white">Ticket price back</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-lg font-bold text-brand-gold">
                            <CoinIcon kind="ppp" size={16} /> {tier.ppp} P-PP
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 text-white/50">No {NEEDED} star</td>
                    <td className="py-2 text-white/50">{SCRATCH.loss.name}</td>
                    <td className="py-2 text-right text-white/50">Nothing</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-brand-gold/80">Any scratch</td>
                    <td className="py-2 text-brand-gold">Golden Ticket</td>
                    <td className="py-2 text-right">
                      <motion.span
                        animate={calm ? undefined : GLOW}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ textShadow: '0 0 12px rgba(250,188,63,0.75)' }}
                        className="inline-flex flex-col items-end text-xl leading-tight font-black text-brand-gold"
                      >
                        {jackpot === null ? (
                          'The whole jackpot'
                        ) : (
                          <>
                            <span>
                              <AnimatedNumber value={jackpot} /> P-PP
                            </span>
                            <span className="text-[0.65rem] font-bold tracking-widest uppercase">The whole jackpot</span>
                          </>
                        )}
                      </motion.span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="text-xs text-white/50">
                One card in {SCRATCH.goldenTicketOneIn} hides a Golden Ticket, and each ticket sold adds {SCRATCH.jackpotContribution} P-PP to
                the jackpot, which starts at {SCRATCH.jackpotSeed}. Every card is sealed when you buy it, and Reveal card lets you check the
                seal. Points can&apos;t be bought or cashed out.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
