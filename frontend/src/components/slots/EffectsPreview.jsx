import { useState } from 'react'
import { SLOTS, SYMBOL_BY_KEY } from '../../../../shared/slots/config.js'

// Development only: SlotScreen loads this with import.meta.env.DEV, so it
// never reaches a production build. A small panel in the slot screen's
// bottom-left corner (tap FX to open it) that plays a winning spin's
// effects and sounds on demand, without waiting for a real one.
//
// Each button is a made-up spin result, shaped like the server's
// (spinView in backend/utils/slots.js), its lines exactly what the engine
// (evaluate in backend/games/slots/engine.js) reads from its grid, with
// the coin landing on Rings. SlotScreen shows the grid on the reels and
// celebrates it as it would a real spin. Nothing is sent to the server,
// and the machine's balance doesn't change.

const GAUNTLET = SLOTS.link.by

// The grids are the reels, left to right, each top to bottom. A line is
// [payline key, what it paid as, how many in a row, effect, text].
const PREVIEWS = [
  {
    key: 'fireworks',
    label: 'Fireworks',
    // Maps linked by a Gauntlet in the middle of the middle row.
    grid: [
      ['clapper', 'map', 'ticket'],
      ['popcorn', 'map', 'clapper'],
      ['ticket', 'gauntlet', 'popcorn'],
      ['clapper', 'map', 'popcorn'],
      ['popcorn', 'clapper', 'ticket'],
    ],
    lines: [['middle', 'map', 4, 'fireworks']],
  },
  {
    key: 'lightning',
    label: 'Lightning',
    // Rings linked by a Gauntlet in the middle row.
    grid: [
      ['clapper', 'ring', 'ticket'],
      ['popcorn', 'ring', 'clapper'],
      ['ticket', 'gauntlet', 'popcorn'],
      ['clapper', 'ring', 'popcorn'],
      ['popcorn', 'clapper', 'ticket'],
    ],
    lines: [['middle', 'ring', 4, 'lightning']],
  },
  {
    key: 'critical',
    label: 'CRITICAL HIT!',
    // A Map and Rings linked by a Gauntlet, the coin landing on Rings.
    grid: [
      ['clapper', 'ring', 'ticket'],
      ['popcorn', 'map', 'clapper'],
      ['ticket', 'gauntlet', 'popcorn'],
      ['clapper', 'ring', 'popcorn'],
      ['popcorn', 'clapper', 'ticket'],
    ],
    lines: [['middle', 'ring', 4, 'lightning', 'CRITICAL HIT!']],
  },
  {
    key: 'infinity',
    label: 'INFINITY',
    // 4 Gauntlets along the middle row.
    grid: [
      ['clapper', 'gauntlet', 'ticket'],
      ['popcorn', 'gauntlet', 'clapper'],
      ['ticket', 'gauntlet', 'popcorn'],
      ['clapper', 'gauntlet', 'popcorn'],
      ['popcorn', 'clapper', 'ticket'],
    ],
    lines: [['middle', 'gauntlet', 4, 'lightning', 'INFINITY']],
  },
  {
    key: 'everything',
    label: 'Everything at once',
    // Fireworks, lightning, CRITICAL HIT! and INFINITY from one spin, the
    // middle Gauntlet in both the fireworks and the INFINITY.
    grid: [
      ['map', 'map', 'gauntlet'],
      ['gauntlet', 'clapper', 'gauntlet'],
      ['ring', 'gauntlet', 'popcorn'],
      ['ticket', 'clapper', 'ticket'],
      ['popcorn', 'clapper', 'ticket'],
    ],
    lines: [
      ['top', 'ring', 3, 'lightning', 'CRITICAL HIT!'],
      ['slideDown', 'map', 3, 'fireworks'],
      ['slideUp', 'gauntlet', 3, 'lightning', 'INFINITY'],
    ],
  },
  {
    key: 'jackpot',
    label: 'Jackpot',
    // 5 logos along the middle row.
    grid: [
      ['clapper', 'logo', 'ticket'],
      ['popcorn', 'logo', 'clapper'],
      ['ticket', 'logo', 'popcorn'],
      ['clapper', 'logo', 'popcorn'],
      ['popcorn', 'logo', 'ticket'],
    ],
    lines: [['middle', 'logo', 5]],
  },
]

const PAYLINE_INDEX = Object.fromEntries(SLOTS.paylines.map((payline, index) => [payline.key, index]))

// One winning line, as the server sends it.
function won(grid, [key, symbol, count, effect = null, text = null]) {
  const line = PAYLINE_INDEX[key]
  const cells = SLOTS.paylines[line].rows.slice(0, count).map((row, reel) => [reel, row])
  const jackpot = count === SLOTS.reels && SYMBOL_BY_KEY[symbol].jackpot
  return {
    line,
    symbol,
    count,
    multiplier: jackpot ? SLOTS.jackpotMultiplier : SYMBOL_BY_KEY[symbol].pays[count - 3],
    cells,
    effect,
    text,
    gauntlets: cells.filter(([reel, row]) => grid[reel][row] === GAUNTLET),
  }
}

// The whole spin, on the screen's current bet.
function resultFor(preview, bet) {
  const lines = preview.lines.map((line) => won(preview.grid, line))
  // In hundredths, as the engine adds them, so the cents come out exact.
  const multiple = lines.reduce((sum, line) => sum + Math.round(line.multiplier * 100), 0) / 100
  return {
    spinId: `preview-${preview.key}-${Date.now()}`,
    grid: preview.grid,
    lines,
    bet,
    win: Math.round(multiple * bet * 100) / 100,
    bigWin: multiple >= SLOTS.bigWinMultiple,
    jackpot: preview.key === 'jackpot',
  }
}

export default function EffectsPreview({ bet, disabled, onPlay }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-2 z-20 flex flex-col items-start gap-1.5">
      {open && (
        <div role="group" aria-label="Effects preview" className="grid w-44 grid-cols-2 gap-1 rounded-xl border border-white/15 bg-black/55 p-1.5 backdrop-blur-sm">
          {PREVIEWS.map((preview) => (
            <button
              key={preview.key}
              type="button"
              disabled={disabled}
              onClick={() => onPlay(resultFor(preview, Math.max(bet, SLOTS.minBet)))}
              className={`rounded-lg bg-white/10 px-1.5 py-1.5 text-[0.7rem] leading-tight font-bold text-white/85 active:bg-white/25 disabled:opacity-40 ${preview.key === 'everything' || preview.key === 'jackpot' ? 'col-span-2' : ''}`}
            >
              {preview.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Hide the effects preview' : 'Show the effects preview'}
        onClick={() => setOpen(!open)}
        className="rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[0.65rem] font-bold tracking-widest text-white/70"
      >
        {open ? 'FX ×' : 'FX'}
      </button>
    </div>
  )
}
