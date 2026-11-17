import { Fragment, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
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
  // Your own answers, on the right.
  if (step.speaker === 'you') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-gold px-4 py-2.5 text-[15px] leading-snug font-semibold text-ink shadow-lg">
          <Styled text={step.text} />
        </div>
      </div>
    )
  }
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

// The conversation on Lord Gang Orca's page, like a chat: everything said
// stays, new lines come in at the bottom one at a time (a short pause
// between, Skip to show the rest at once), and it scrolls up to keep the
// newest in view. `messages`: every step so far, each with its own `id`;
// the page adds to the end. Nothing is kept past a refresh. `onIdle()`
// whenever everything is showing.
export default function Chat({ messages, names, onIdle }) {
  const [shown, setShown] = useState(0)
  const box = useRef(null)
  const lastAt = useRef(0)
  const idleRef = useRef(onIdle)
  useEffect(() => {
    idleRef.current = onIdle
  })

  // The next line, after a pause (shorter if it's been quiet a while).
  useEffect(() => {
    if (shown >= messages.length) {
      idleRef.current?.()
      return
    }
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const pause = calm ? 400 : (PAUSE_MS[messages[shown - 1]?.type] ?? 1400)
    const wait = shown === 0 ? 0 : Math.max(250, pause - (Date.now() - lastAt.current))
    const timer = setTimeout(() => {
      lastAt.current = Date.now()
      setShown((n) => n + 1)
    }, wait)
    return () => clearTimeout(timer)
  }, [shown, messages])

  // Keep the newest in view.
  useEffect(() => {
    const element = box.current
    if (!element) return
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    element.scrollTo({ top: element.scrollHeight, behavior: calm ? 'auto' : 'smooth' })
  }, [shown])

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={box} className="flex h-80 flex-col gap-3 overflow-y-auto overscroll-contain pr-1 sm:h-96" aria-live="polite" aria-label="The conversation">
        {messages.slice(0, shown).map((step) => (
          <motion.div key={step.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {step.type === 'narration' ? (
              <p className="text-[15px] leading-relaxed text-white/75">
                <Styled text={step.text} />
              </p>
            ) : (
              <Bubble step={step} names={names} />
            )}
          </motion.div>
        ))}
      </div>
      {shown < messages.length && (
        <button
          type="button"
          onClick={() => setShown(messages.length)}
          className="absolute right-1 bottom-1 cursor-pointer rounded-full bg-black/60 px-3 py-1 text-xs font-semibold tracking-widest text-white/70 uppercase hover:text-white"
        >
          Skip ›
        </button>
      )}
    </div>
  )
}
