import { useEffect, useRef } from 'react'

// The big CASH OUT button, showing what it would pay right now: the bet
// times the multiplier as shown (`displayRef`, from CrashStage.jsx), in
// whole points, rounded down, as the server pays. Its label keeps up at the
// screen's rate without React. Space presses it too (pages/Crash.jsx).
// `pays`: the share of the multiplier a cash-out pays (less than 1 with
// the betting cap off: shared/crash/rules.js uncappedPays).
export default function CashOutButton({ bet, displayRef, onCashOut, busy, pays = 1 }) {
  const amountRef = useRef(null)

  useEffect(() => {
    let frame
    const update = () => {
      const m = displayRef.current?.m ?? 1
      if (amountRef.current) amountRef.current.textContent = String(Math.floor(bet * m * pays + 1e-9))
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [bet, displayRef, pays])

  return (
    <button
      type="button"
      onClick={onCashOut}
      disabled={busy}
      className="min-h-16 w-full cursor-pointer rounded-2xl bg-gradient-to-b from-[#FFE08A] to-[#E8B23A] px-6 font-['Bebas_Neue'] text-4xl tracking-wide text-[#2a1a00] shadow-[0_0_32px_rgba(255,215,106,0.45)] transition active:scale-[0.98] disabled:opacity-60 sm:text-5xl"
    >
      Cash out <span ref={amountRef} className="tabular-nums">{bet}</span>
      <span className="ml-2 align-middle font-sans text-xs font-semibold tracking-normal opacity-70 max-sm:hidden">Space</span>
    </button>
  )
}
