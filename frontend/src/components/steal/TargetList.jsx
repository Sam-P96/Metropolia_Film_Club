import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import MemberAvatar from '../profile/MemberAvatar'
import { EASE, FADE, LAYOUT, SLIDE } from './motion'
import useApi from '../../hooks/useApi'
import { getTargets, startAttack } from '../../services/steal'
import { STEAL } from '../../../../shared/steal/config.js'
import { GLASS, GOLD_BUTTON, LIFT, QUIET_BUTTON, SCROLL, formatPp } from './style'

// 1, 2, 3, 4, 5, 10, 20, 30, 40 and 50%.
const PERCENTS = STEAL.percents

// The people they follow, as targets (spec §6.1): available ones first,
// the rest greyed out with why, and how far along the follow timer is.
// Picking one opens the percentage picker and the Start button.
export default function TargetList({ version = 0, disabledReason = null }) {
  const navigate = useNavigate()
  // Loaded once; the hub's `version` going up loads it again without
  // clearing what's showing.
  const { data, error, reload } = useApi(getTargets, [])
  useEffect(() => {
    if (version) reload()
  }, [version, reload])
  const [picked, setPicked] = useState(null)
  const [percent, setPercent] = useState(PERCENTS[0])
  const [starting, setStarting] = useState(false)
  const [problem, setProblem] = useState(null)

  const targets = data?.targets ?? []
  const blocked = disabledReason ?? (data && !data.canAttack ? data.refusal : null)

  const start = async () => {
    setStarting(true)
    setProblem(null)
    try {
      const attack = await startAttack(picked.user._id, percent)
      navigate(`/games/steal-and-defend/attacks/${attack._id}`)
    } catch (failure) {
      setProblem(failure.message)
      setStarting(false)
      reload()
    }
  }

  return (
    <section className={`${GLASS} p-5`} aria-labelledby="steal-targets">
      <h2 id="steal-targets" className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">
        Targets
      </h2>
      <p className="mt-1 text-xs text-white/50">
        People you follow. You need to have followed someone for {STEAL.follow.hours} hours in a row before you can attack them.
      </p>
      <AnimatePresence initial={false}>
        {blocked && (
          <motion.p key="blocked" {...SLIDE} className="mt-3 rounded-lg border border-brand-red/50 bg-brand-red/10 px-3 py-2 text-sm text-white/80">
            {blocked}
          </motion.p>
        )}
        {data?.active && (
          <motion.div key="active" {...SLIDE}>
            <button type="button" onClick={() => navigate(`/games/steal-and-defend/attacks/${data.active._id}`)} className={`${GOLD_BUTTON} mt-3`}>
              Back to your attack
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p key="error" {...FADE} className="mt-3 text-sm text-white/50">
            Couldn&apos;t load your targets.
          </motion.p>
        ) : !data ? (
          <motion.div key="loading" {...FADE} className="mt-3 flex flex-col gap-2" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
            ))}
          </motion.div>
        ) : targets.length === 0 ? (
          <motion.p key="none" {...FADE} className="mt-3 text-sm text-white/50">
            You don&apos;t follow anyone yet. Follow members from their profile pages.
          </motion.p>
        ) : (
        <motion.ul key="list" {...FADE} className={`mt-3 flex max-h-112 flex-col gap-2 overflow-y-auto pr-1 ${SCROLL}`}>
          <AnimatePresence initial={false}>
          {targets.map((target, index) => {
            const isPicked = picked?.user._id === target.user._id
            const progress = target.follow.requiredHours ? target.follow.followedHours / target.follow.requiredHours : 0
            const usable = target.available && !blocked
            return (
              <motion.li
                key={target.user._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE, delay: Math.min(index, 8) * 0.04 } }}
                exit={SLIDE.exit}
                {...LAYOUT}
              >
                <button
                  type="button"
                  disabled={!usable}
                  onClick={() => setPicked(isPicked ? null : target)}
                  aria-expanded={isPicked}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${usable ? LIFT : 'transition-colors'} ${
                    isPicked ? 'border-brand-gold/70 bg-white/10' : 'border-white/10 bg-white/5'
                  } ${usable ? 'cursor-pointer hover:border-white/30' : 'cursor-not-allowed opacity-50'}`}
                >
                  <MemberAvatar user={target.user} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{target.user.username}</span>
                    <span className="block text-xs text-white/50">{target.available ? 'Ready to attack' : target.reason}</span>
                    {target.follow.following && progress < 1 && (
                      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                        <span className="block h-full rounded-full bg-brand-gold" style={{ width: `${Math.max(0.03, progress) * 100}%` }} />
                      </span>
                    )}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                {isPicked && (
                  <motion.div
                    key="picker"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', transition: { duration: 0.3, ease: EASE } }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                    className="overflow-hidden"
                  >
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/40 p-3">
                    <p className="text-xs tracking-widest text-white/50 uppercase">How much to steal</p>
                    <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Percentage">
                      {PERCENTS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={percent === value}
                          onClick={() => setPercent(value)}
                          className={`rounded-lg border px-1 py-2 text-center ${LIFT} hover:shadow-md hover:shadow-black/30 ${
                            percent === value ? 'border-brand-gold bg-brand-gold/15 text-brand-gold' : 'border-white/10 text-white hover:border-white/30'
                          }`}
                        >
                          <span className="block text-sm font-bold">{value}%</span>
                          <span className="block text-[11px] text-white/60">{formatPp(target.amounts?.[value])}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-white/50">
                      Fail and you&apos;re fined about {STEAL.fine.base}% of that ({formatPp(Math.ceil((target.amounts?.[percent] ?? 0) * (STEAL.fine.base / 100)))}
                      ), before items. Both of your balances freeze until it&apos;s over.
                    </p>
                    {problem && <p className="mt-2 text-sm text-brand-red">{problem}</p>}
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={start} disabled={starting} className={GOLD_BUTTON}>
                        {starting ? 'Starting…' : `Start the attack on ${target.user.username}`}
                      </button>
                      <button type="button" onClick={() => setPicked(null)} className={QUIET_BUTTON}>
                        Cancel
                      </button>
                    </div>
                  </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.li>
            )
          })}
          </AnimatePresence>
        </motion.ul>
        )}
      </AnimatePresence>
    </section>
  )
}
