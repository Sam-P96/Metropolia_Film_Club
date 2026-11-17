import { Fragment, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SPEAKERS } from './speakers'

// How long each step stays before the next: narration is read a little
// slower than a short line.
const PAUSE_MS = { narration: 1700, bubble: 1400 }

// "*like this*" in italics.
export function Styled({ text }) {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <em key={i}>{part.slice(1, -1)}</em> : <Fragment key={i}>{part}</Fragment>
  )
}

function Bubble({ step, names }) {
  const who = SPEAKERS[step.speaker]
  return (
    <div className="flex items-start gap-3">
      {who && <img src={who.src} alt="" className="size-11 shrink-0 rounded-full border-2 border-white/20 object-cover" style={{ objectPosition: who.position }} />}
      <div className="min-w-0">
        <p className="mb-1 text-xs font-semibold tracking-widest text-white/55 uppercase">{names?.[step.speaker] ?? step.speaker}</p>
        <div className="relative rounded-2xl rounded-tl-sm border border-white/15 bg-white/95 px-4 py-2.5 text-[15px] leading-snug text-ink shadow-lg">
          <Styled text={step.text} />
        </div>
      </div>
    </div>
  )
}

// Plays a script one step at a time (narration as plain text, lines in
// speech bubbles with the speaker's picture and name), a short pause
// between, with Skip to show the rest at once. Give each new script a new
// React `key` to start it over. `onDone()` once everything is showing.
export default function ScriptPlayer({ steps, names, onDone }) {
  const [shown, setShown] = useState(() => (steps.length ? 1 : 0))
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    if (shown >= steps.length) {
      doneRef.current?.()
      return
    }
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(() => setShown((n) => n + 1), calm ? 500 : PAUSE_MS[steps[shown - 1]?.type] ?? 1400)
    return () => clearTimeout(timer)
  }, [shown, steps])

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <AnimatePresence initial={false}>
        {steps.slice(0, shown).map((step, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {step.type === 'narration' ? (
              <p className="text-[15px] leading-relaxed text-white/75">
                <Styled text={step.text} />
              </p>
            ) : (
              <Bubble step={step} names={names} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {shown < steps.length && (
        <button type="button" onClick={() => setShown(steps.length)} className="cursor-pointer self-end text-xs font-semibold tracking-widest text-white/50 uppercase hover:text-white">
          Skip ›
        </button>
      )}
    </div>
  )
}
