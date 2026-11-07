import { useEffect, useState } from 'react'
import bret from '../../assets/Bret.png'
import StyledAvatar from '../cosmetics/StyledAvatar'
import { CHAMELEON_LINES } from '../../../../shared/blackMarket/lines.js'
import { pickLine } from '../../../../shared/loanShark/lines.js'

const LAST_LINE_KEY = 'blackMarket.lastLine'

function readLast() {
  try {
    const value = Number(localStorage.getItem(LAST_LINE_KEY))
    return Number.isInteger(value) ? value : null
  } catch {
    return null
  }
}

// The Black Market Chameleon: the boss's salesman, in the Rainbow border
// he's selling. A new line each time the page opens, never the one from
// last time (remembered in this browser), and another when he's tapped.
export default function Chameleon() {
  const [line, setLine] = useState(() => pickLine(CHAMELEON_LINES.length, readLast()))

  useEffect(() => {
    try {
      localStorage.setItem(LAST_LINE_KEY, String(line))
    } catch {
      // A private window: he might repeat himself.
    }
  }, [line])

  return (
    <section className="flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-ink/60 p-5 shadow-xl shadow-black/40 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:p-7" aria-labelledby="chameleon-heading">
      <button
        type="button"
        onClick={() => setLine((current) => pickLine(CHAMELEON_LINES.length, current))}
        className="shrink-0 rounded-full p-2 focus-visible:outline-2 focus-visible:outline-brand-gold"
        aria-label="Poke the Black Market Chameleon"
        title="Poke him"
      >
        <StyledAvatar borderId="border.rainbow">
          <img src={bret} alt="" className="size-24 rounded-full bg-plum object-cover sm:size-28" />
        </StyledAvatar>
      </button>
      <div className="flex w-full min-w-0 flex-col gap-2">
        <h2 id="chameleon-heading" className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
          Black Market <span className="text-emerald-300">Chameleon</span>
        </h2>
        <div className="relative rounded-2xl border border-emerald-400/40 bg-emerald-950/80 px-4 py-3 text-emerald-50 shadow-lg shadow-black/40 sm:px-5 sm:py-4">
          <span
            aria-hidden="true"
            className="absolute -top-2 left-10 size-4 rotate-45 border-t border-l border-emerald-400/40 bg-emerald-950/80 sm:top-8 sm:-left-2 sm:border-t-0 sm:border-b sm:border-l"
          />
          <p className="relative leading-snug" aria-live="polite">
            &ldquo;{CHAMELEON_LINES[line]}&rdquo;
          </p>
        </div>
      </div>
    </section>
  )
}
