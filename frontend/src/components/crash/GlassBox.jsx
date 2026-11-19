import { useEffect, useId, useRef } from 'react'
import { motion } from 'motion/react'
import useGameFrame from '../../hooks/useGameFrame'

// A box that appears over Box Office Crash's game screen: translucent
// glass, the game showing blurred behind it. Invite (InviteBox.jsx) and the
// prompt to join a smaller game (JoinPrompt.jsx) use it. `onClose`, if
// given: a close button, and Escape or a tap outside closes it too.
//
// It stays in the space under the nav bar, the way the game screen does
// (hooks/useGameFrame.js: down to the bottom of what's on screen, so above
// a phone's keyboard too): however long its list grows (Invite's "Load
// more"), the box stops there, its title and close button stay put at the
// top, and the rest scrolls inside it. The nav bar sits above everything
// (z-100), so a box that grew past it lost its close button under it.
export default function GlassBox({ title, onClose, children }) {
  const titleId = useId()
  const boxRef = useRef(null)
  const frame = useGameFrame()

  // Focus goes into the box, so a keyboard or screen reader is in it.
  useEffect(() => {
    boxRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!onClose) return
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
      className="fixed inset-x-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
      style={{ top: frame.top, height: frame.height }}
      onClick={(event) => {
        if (onClose && event.target === event.currentTarget) onClose()
      }}
    >
      <motion.section
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        // Dark-tinted glass: the game shows through, blurred, but never
        // so brightly that the words in front of it are hard to read.
        className="flex max-h-full w-full max-w-md flex-col gap-4 overflow-hidden rounded-2xl border border-white/20 bg-[#04140F]/60 p-5 text-white shadow-2xl shadow-black/50 outline-none backdrop-blur-xl backdrop-saturate-150 sm:p-6"
      >
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h2 id={titleId} className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-[#B8FFE0]">
            {title}
          </h2>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </div>
        {/* Everything under the title: scrolls here when it's taller than
            the room left, never the page. */}
        <div className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-1">{children}</div>
      </motion.section>
    </motion.div>
  )
}
