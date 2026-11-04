import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { POKER } from '../../../../shared/poker/config.js'
import { GOLD, QUIET, RED } from './style'

const EASE = [0.25, 0.8, 0.25, 1]

// Fold, check or call, and bet or raise, on your turn in a betting round.
// `legal` is the server's legalActions. Raising swaps the row for a slider
// and the amount, with quick picks floating just above it, so the bar
// never grows and the table above never shifts.
export function ActionBar({ legal, pot, onAct, busy }) {
  const [raising, setRaising] = useState(false)
  const [amount, setAmount] = useState(legal.minRaiseTo)
  const to = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, amount))
  const allIn = to >= legal.maxRaiseTo
  const word = legal.raiseLabel === 'bet' ? 'Bet' : 'Raise to'
  const quick = [
    { label: 'Min', value: legal.minRaiseTo },
    { label: '½ pot', value: legal.minRaiseTo + Math.round(pot / 2) },
    { label: 'Pot', value: legal.minRaiseTo + pot },
    { label: 'All in', value: legal.maxRaiseTo },
  ]

  if (raising && legal.canRaise) {
    return (
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } }}
          className="absolute inset-x-0 bottom-full z-30 mb-4 grid grid-cols-4 gap-1.5"
        >
          {quick.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setAmount(Math.min(legal.maxRaiseTo, option.value))}
              className="min-h-8 cursor-pointer rounded-lg border border-white/20 bg-ink/90 text-xs font-semibold text-white shadow-lg shadow-black/50 transition-colors duration-300 hover:border-brand-gold/70"
            >
              {option.label}
            </button>
          ))}
        </motion.div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Back" onClick={() => setRaising(false)} className={`${QUIET} px-3`}>
            ✕
          </button>
          <input
            type="range"
            min={legal.minRaiseTo}
            max={legal.maxRaiseTo}
            value={to}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="min-w-0 flex-1 accent-brand-gold"
            aria-label={`${word} amount`}
          />
          <button type="button" disabled={busy} onClick={() => onAct(allIn ? 'allIn' : 'raise', to)} className={`${GOLD} min-w-28`}>
            {allIn ? `All in ${to}` : `${word} ${to}`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <button type="button" disabled={busy} onClick={() => onAct('fold')} className={RED}>
        Fold
      </button>
      {legal.canCheck ? (
        <button type="button" disabled={busy} onClick={() => onAct('check')} className={QUIET}>
          Check
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => onAct('call')} className={QUIET}>
          Call {legal.toCall}
        </button>
      )}
      {legal.canRaise ? (
        <button type="button" disabled={busy} onClick={() => setRaising(true)} className={GOLD}>
          {legal.raiseLabel === 'bet' ? 'Bet' : 'Raise'}
        </button>
      ) : (
        <button type="button" disabled className={QUIET}>
          Raise
        </button>
      )}
    </div>
  )
}

// The draw: tap up to POKER.maxDraw of your cards (on the table above),
// then swap them, or keep all five.
export function DrawBar({ selected, onDraw, busy }) {
  return (
    <div className="flex items-center gap-2">
      <p className="min-w-0 flex-1 text-xs text-white/70">
        {selected.length ? `${selected.length} card${selected.length === 1 ? '' : 's'} picked.` : `Tap up to ${POKER.maxDraw} cards to swap.`}
      </p>
      <button type="button" disabled={busy} onClick={() => onDraw([])} className={QUIET}>
        Keep all
      </button>
      <button type="button" disabled={busy || selected.length === 0} onClick={() => onDraw(selected)} className={GOLD}>
        Swap {selected.length || ''}
      </button>
    </div>
  )
}

// Not at the table: how much to sit down with (PP first, then P-PP), or
// your place in the queue. `label` is the button: sit down now, next hand,
// or join the queue.
export function JoinPanel({ queued, wallet, onJoin, onLeaveQueue, busy, label }) {
  const total = wallet ? wallet.pp + wallet.ppp : null
  const most = total === null ? POKER.buyIn.max : Math.max(POKER.buyIn.min, Math.min(POKER.buyIn.max, total))
  const [amount, setAmount] = useState(Math.min(POKER.buyIn.default, most))
  const buyIn = Math.min(most, Math.max(POKER.buyIn.min, amount))
  const canAfford = total === null || total >= POKER.buyIn.min

  if (queued) {
    return (
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-sm text-white">
          You&apos;re <span className="font-bold text-brand-gold">#{queued}</span> in the queue. You&apos;ll sit down between hands.
        </p>
        <button type="button" disabled={busy} onClick={onLeaveQueue} className={QUIET}>
          Leave queue
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/60">Buy in</span>
        <input
          type="range"
          min={POKER.buyIn.min}
          max={most}
          value={buyIn}
          disabled={!canAfford}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="min-w-0 flex-1 accent-brand-gold"
          aria-label="Buy-in"
        />
        <span className="w-12 text-right text-sm font-bold text-brand-gold tabular-nums">{buyIn}</span>
      </div>
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-[11px] text-white/50">
          {canAfford ? `PP first, then P-PP. Blinds ${POKER.blinds.small}/${POKER.blinds.big}.` : `You need at least ${POKER.buyIn.min} points.`}
        </p>
        <button type="button" disabled={busy || !canAfford} onClick={() => onJoin(buyIn)} className={GOLD}>
          {label}
        </button>
      </div>
    </div>
  )
}

// The emoji button: tap it for the four, or type any one emoji.
export function EmojiButton({ onSend, disabled }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const send = (emoji) => {
    onSend(emoji)
    setOpen(false)
    setTyped('')
  }
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Send an emoji"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`${QUIET} min-h-9 px-2.5 text-lg`}
      >
        😊
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: EASE } }}
            exit={{ opacity: 0, y: -6, scale: 0.95, transition: { duration: 0.15 } }}
            className="absolute top-full right-0 z-40 mt-2 flex w-60 flex-col gap-2 rounded-2xl border border-white/15 bg-ink/95 p-2 shadow-2xl shadow-black/60"
          >
            <div className="grid grid-cols-4 gap-1">
              {POKER.emoji.presets.map((preset) => (
                <button
                  key={preset.emoji}
                  type="button"
                  aria-label={preset.label}
                  title={preset.label}
                  onClick={() => send(preset.emoji)}
                  className="cursor-pointer rounded-xl py-1.5 text-2xl transition-[background-color,scale] duration-300 hover:scale-110 hover:bg-white/10"
                >
                  {preset.emoji}
                </button>
              ))}
            </div>
            <form
              className="flex gap-1.5"
              onSubmit={(event) => {
                event.preventDefault()
                if (typed.trim()) send(typed.trim())
              }}
            >
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder="Or type one emoji"
                aria-label="Your own emoji"
                maxLength={16}
                autoComplete="off"
                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-base text-white placeholder:text-xs placeholder:text-white/40"
              />
              <button type="submit" disabled={!typed.trim()} className={`${GOLD} min-h-9 px-3`}>
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
