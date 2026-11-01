import { useEffect, useId, useRef, useState } from 'react'
import { formatPoints } from '../../hooks/useDoubleOrNothing'

const LISTS = {
  BANNED: {
    name: 'The Ban List',
    info: "You lost a round in this pot, so you're out for now. You can play again when someone wins the pot, or at the Monday 12:00 reset.",
    className: 'border-brand-red/60 from-brand-red/15',
  },
  'IN QUEUE': {
    name: 'The Waiting List',
    info: 'You drew twice without losing, so you have to sit out one turn. You can play again as soon as another player finishes a game. The bet will be doubled by then.',
    className: 'border-dashed border-brand-gold/60 from-brand-gold/10',
  },
}

// The "i" beside a list's name, and the explanation it opens. A tap or a
// click opens and closes it (so it works on phones, where there's no
// hover), and so do Enter and Space; Escape or a tap anywhere else closes
// it.
function InfoButton({ label, children }) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef(null)
  const button = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (!wrapper.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span ref={wrapper} className="static inline-flex sm:relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`What is ${label}?`}
        className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-white/5 font-serif text-sm font-bold text-white italic transition-colors hover:border-brand-gold/70 hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          className="absolute top-full left-0 z-20 mt-2 block w-full rounded-xl border border-white/15 bg-ink/95 p-4 text-left text-sm leading-relaxed font-normal text-white/85 shadow-xl shadow-black/60 sm:w-72"
        >
          {children}
        </span>
      )}
    </span>
  )
}

// In place of the throw buttons while they're on a list: which one, an
// "i" that explains it, and the bet they'll come back to. The same dark
// glass as the page's other boxes, with a faint wash of the list's colour.
export default function ListStatus({ status, currentBet }) {
  const list = LISTS[status]
  if (!list) return null

  return (
    <div
      className={`rounded-2xl border-2 bg-ink/60 bg-linear-to-br to-transparent p-5 shadow-xl shadow-black/40 backdrop-blur-xl ${list.className}`}
    >
      <p className="text-xs tracking-widest text-white/50 uppercase">You're on</p>
      {/* The popover hangs under this row on a phone, as wide as it, and
          under the "i" itself on a wider screen. */}
      <div className="relative mt-1 flex items-center gap-3">
        <h3 className="text-2xl font-bold text-white">{list.name}</h3>
        <InfoButton label={list.name}>{list.info}</InfoButton>
      </div>
      <p className="mt-3 text-sm text-white/70">
        {status === 'BANNED'
          ? `The bet is ${formatPoints(currentBet)} now. You're back in when someone wins it, or on Monday.`
          : `The bet is ${formatPoints(currentBet)} now. You're back in as soon as someone else plays.`}
      </p>
    </div>
  )
}
