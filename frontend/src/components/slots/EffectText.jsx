import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

// How long each word stays up.
const SHOW_MS = 1500

const RAINBOW = 'linear-gradient(90deg, #ff2a55, #ff8a00, #ffe600, #2bff5e, #00c8ff, #8a3dff, #ff2a55)'

// "CRITICAL HIT!" or "INFINITY" flashing big over the reel window, in
// rainbow with a glow: a few pulses, then a fade. With both, one after the
// other. It sits over the reels without taking up room, so nothing moves.
// `texts` is the words for this spin; a new `id` starts again. With reduced
// motion the words fade in and out without pulsing. `onWord(text)` hears
// each word as it appears, for its sound.
//
// The word is drawn twice: a dark, glowing, outlined copy behind, so it
// stands out on the light reels, and the rainbow copy on top (a shadow on
// the rainbow copy itself would paint over its colours).
export default function EffectText({ id, texts, onWord }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState({ id: null, index: 0 })
  const listener = useRef(onWord)
  const announced = useRef(null)
  useEffect(() => {
    listener.current = onWord
  })
  const index = shown.id === id ? shown.index : 0

  useEffect(() => {
    if (!texts?.length || index >= texts.length) return
    const timer = setTimeout(() => setShown({ id, index: index + 1 }), SHOW_MS)
    return () => clearTimeout(timer)
  }, [id, texts, index])

  const text = texts?.[index] ?? null

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-visible">
      <AnimatePresence mode="wait">
        {text && (
          <motion.span
            key={`${id}-${index}`}
            onAnimationStart={() => {
              // Once per word, as it starts to appear (not again as it goes).
              if (announced.current === `${id}-${index}`) return
              announced.current = `${id}-${index}`
              listener.current?.(text)
            }}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.4 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: [0.4, 1.18, 1, 1.12, 1, 1.08, 1] }}
            exit={{ opacity: 0, scale: reduce ? 1 : 1.25 }}
            transition={reduce ? { duration: 0.25 } : { scale: { duration: 1.1, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
            className="relative font-['Bebas_Neue'] text-[clamp(2.75rem,14vw,4.5rem)] leading-none tracking-wider whitespace-nowrap"
          >
            <span
              className="absolute inset-0 text-ink"
              style={{
                WebkitTextStroke: '7px rgba(11, 7, 16, 0.9)',
                textShadow: '0 0 10px rgba(11,7,16,0.95), 0 0 22px rgba(138,61,255,0.95), 0 0 34px rgba(0,200,255,0.75)',
              }}
            >
              {text}
            </span>
            <span
              className="slot-rainbow-text relative text-transparent"
              style={{ backgroundImage: RAINBOW, backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}
            >
              {text}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
