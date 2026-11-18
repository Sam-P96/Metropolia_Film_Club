import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SPEAKERS } from '../orca/speakers'
import { QUIET_BUTTON } from '../steal/style'
import { allInBlockedFor } from '../../../../shared/crash/rules.js'

// The button glows blue; the words "All In" (and the button that says yes)
// glow red.
const GLOW_SMALL = '0 0 14px 2px rgba(56,189,248,0.35)'
const GLOW_BIG = '0 0 34px 8px rgba(56,189,248,0.75)'
const RED_GLOW = '[text-shadow:0_0_8px_rgba(255,59,59,0.95),0_0_18px_rgba(255,59,59,0.6)]'
const RED_BUTTON =
  'inline-flex items-center justify-center rounded-xl border-2 border-[#FF3B3B] bg-[#3a0808] px-5 font-bold text-[#FF6B6B] shadow-[0_0_18px_rgba(255,59,59,0.6)] transition hover:bg-[#4a0a0a] hover:shadow-[0_0_28px_rgba(255,59,59,0.85)] disabled:opacity-60'

// Lord Gang Orca's offer (shared/crash/rules.js allInBlockedFor), which
// nothing on the page explains: it just turns up, glowing, once someone's
// rounds alone are used up. One more round alone, with everything they have
// on it. A tap asks first; if they've points stashed elsewhere, he says so
// instead. `compact` (in a room): without his line, to fit the game screen.
export default function AllInOffer({ me, onPlay, busy, compact = false }) {
  const reduce = useReducedMotion()
  const [asking, setAsking] = useState(false)
  const blocked = allInBlockedFor(me)

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        type="button"
        onClick={() => setAsking((open) => !open)}
        disabled={busy}
        aria-expanded={asking}
        initial={{ boxShadow: GLOW_SMALL }}
        animate={reduce ? { boxShadow: GLOW_BIG } : { boxShadow: [GLOW_SMALL, GLOW_BIG, GLOW_SMALL] }}
        transition={reduce ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="flex w-full max-w-md cursor-pointer items-center gap-3 rounded-2xl border-2 border-sky-400 bg-[#061a2e] px-3 py-2 text-left transition hover:bg-[#08223c] disabled:cursor-default disabled:opacity-60"
      >
        <img
          src={SPEAKERS.orca.src}
          alt="Lord Gang Orca"
          style={{ objectPosition: SPEAKERS.orca.position }}
          className={`${compact ? 'size-10' : 'size-14'} shrink-0 rounded-full border-2 border-sky-400 bg-ink object-cover shadow-[0_0_16px_rgba(56,189,248,0.7)]`}
        />
        <span className="flex min-w-0 flex-col">
          <span className={`font-['Bebas_Neue'] leading-none tracking-wide text-sky-100 ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>
            Play One More Time <span className={`text-[#FF4D4D] ${RED_GLOW}`}>All In</span>
          </span>
          {!compact && <span className="mt-1 text-xs text-white/75 italic sm:text-sm">&ldquo;One more. All of it. Family doesn&apos;t walk away from the table.&rdquo;</span>}
        </span>
      </motion.button>

      {asking &&
        (blocked ? (
          <p className="max-w-md text-center text-sm text-white/80">{blocked}</p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-white">
            <span>
              All <strong className="text-[#FF6B6B] tabular-nums">{me.points.toLocaleString('en-US')}</strong> points on one round?
            </span>
            <button
              type="button"
              onClick={() => {
                setAsking(false)
                onPlay()
              }}
              disabled={busy}
              className={`${RED_BUTTON} min-h-10 font-['Bebas_Neue'] text-xl tracking-wide ${RED_GLOW}`}
            >
              All in
            </button>
            <button type="button" onClick={() => setAsking(false)} className={`${QUIET_BUTTON} min-h-10`}>
              Not today
            </button>
          </div>
        ))}
    </div>
  )
}
