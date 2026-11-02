import { useEffect } from 'react'
import { motion } from 'motion/react'

// A panel over the machine, dimming it: Add credits, Cash out and the
// paytable. Tapping outside it, the close button or Escape closes it.
// `placement` "bottom" slides it up from the bottom (a sheet), "center"
// fades it in the middle.
export default function Sheet({ title, onClose, placement = 'bottom', children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const bottom = placement === 'bottom'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`absolute inset-0 z-30 flex justify-center bg-black/60 ${bottom ? 'items-end' : 'items-center p-3'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={bottom ? { y: '100%' } : { scale: 0.96, opacity: 0 }}
        animate={bottom ? { y: 0 } : { scale: 1, opacity: 1 }}
        exit={bottom ? { y: '100%' } : { scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full max-w-md border border-(--slot-gold-dim) bg-(--slot-panel) p-4 text-white shadow-2xl shadow-black/60 ${
          bottom ? 'rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]' : 'max-h-full overflow-hidden rounded-2xl'
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-['Bebas_Neue'] text-2xl tracking-wide text-(--slot-gold)">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 cursor-pointer place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </motion.section>
    </motion.div>
  )
}
