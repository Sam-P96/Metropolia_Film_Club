import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import AnimatedNumber from '../AnimatedNumber'
import AddCreditsSheet from './AddCreditsSheet'
import CashOutSheet from './CashOutSheet'
import HoldButton from './HoldButton'
import JackpotCelebration from './JackpotCelebration'
import Lever from './Lever'
import Reels from './Reels'
import Sheet from './Sheet'
import { CompactPaytable } from './Paytable'
import { HAPTIC, SOUNDS, haptic, isMuted, setMuted, wakeAudio } from './feedback'
import { formatPoints } from './format'
import { SCREEN_BACKGROUND } from './backdrop'
import useSlotMachine from '../../hooks/useSlotMachine'
import useWallet from '../../hooks/useWallet'
import { ApiError } from '../../services/api'
import { SLOTS } from '../../../../shared/slots/config.js'

// The frame's padding, the window's padding and the gaps between reels,
// around the cells: what's left over is shared by the 5 x 3 cells.
const FRAME_WIDTH = 24 + 8 + 4 * (SLOTS.reels - 1)
const FRAME_HEIGHT = 24 + 8
const LARGEST_CELL = 104
// The gap between the reels, the status line and the controls (gap-3), and
// room kept free under the controls so they sit up from the bottom edge.
const GAP = 12
const ROOM_BELOW = 0.06

// If the lever's flick never reaches the top stop, the reels set off anyway
// after this long.
const LEVER_TOP_FALLBACK_MS = 700

// Where the nav ends: the top of the page's <main>, which comes straight
// after it. The nav itself is left alone.
function navBottom() {
  const main = document.querySelector('main')
  return main ? main.getBoundingClientRect().top + window.scrollY : 0
}

// The bet to show and spin with: what they picked, kept to what the machine
// holds. Whole PP from the minimum, or everything in the machine when it's
// less than the minimum (or they went all in with MAX).
function betFor(picked, balance) {
  if (balance <= 0) return Math.max(SLOTS.minBet, Math.floor(picked))
  if (picked === balance) return picked
  if (balance < SLOTS.minBet) return balance
  return Math.min(Math.max(SLOTS.minBet, Math.floor(picked)), Math.floor(balance))
}

function MuteIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      {muted ? (
        <path d="m16 9 6 6M22 9l-6 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  )
}

// − and +, drawn rather than typed: the characters sit low in the font.
function StepIcon({ up }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
      {up && <path d="M12 5v14" />}
    </svg>
  )
}

const ICON_BUTTON = 'grid size-11 cursor-pointer place-items-center rounded-xl text-white/85 transition-colors hover:bg-white/10 active:bg-(--slot-panel-hi)'
const ROUND = 'grid size-[50px] cursor-pointer place-items-center rounded-full border-[1.5px] border-(--slot-gold) bg-(--slot-panel) text-white transition active:scale-95 active:bg-(--slot-panel-hi) disabled:cursor-default disabled:opacity-40 disabled:active:scale-100'

// The machine, filling the screen under the nav without ever scrolling:
// mute and the paytable, the reels, the status line, the credits with Add
// credits and Cash out, the bet, and the lever. The page doesn't scroll
// while it's open. Every spin happens on the server: the reels land on
// what it sends back.
export default function SlotScreen() {
  const reduce = useReducedMotion()
  const game = useSlotMachine()
  const wallet = useWallet()
  const reels = useRef(null)
  const lever = useRef(null)
  const group = useRef(null)
  const statusLine = useRef(null)
  const controls = useRef(null)
  const bank = useRef(null)
  const leverAtTop = useRef(null)
  const toastTimer = useRef(null)
  const spinningNow = useRef(false)
  const allInNext = useRef(false)

  const [top, setTop] = useState(navBottom)
  const [cell, setCell] = useState(56)
  const [spinning, setSpinning] = useState(false)
  const [status, setStatus] = useState(null)
  // While a spin runs: the balance after the bet, and the win readout at 0.
  const [during, setDuring] = useState(null)
  const [picked, setPicked] = useState(SLOTS.minBet)
  const [sheet, setSheet] = useState(null)
  const [muted, setMutedState] = useState(isMuted)
  const [jackpot, setJackpot] = useState(null)
  const [toast, setToast] = useState(null)

  const machine = game.machine
  const balance = machine?.balance ?? 0
  const bet = betFor(picked, balance)
  const allIn = balance > 0 && bet === balance
  const shownBalance = during?.balance ?? balance
  const shownWin = during ? 0 : (machine?.lastWin ?? 0)
  const line = status ?? (!machine ? { text: 'Loading…' } : balance > 0 ? { text: 'Pull the lever' } : { text: 'Add credits to play' })

  // No scrolling while the machine's open: the page stays put under it,
  // and phones don't bounce.
  useEffect(() => {
    const styles = [document.documentElement.style, document.body.style]
    const before = styles.map(({ overflow, overscrollBehavior }) => ({ overflow, overscrollBehavior }))
    window.scrollTo(0, 0)
    for (const style of styles) Object.assign(style, { overflow: 'hidden', overscrollBehavior: 'none' })
    return () => styles.forEach((style, i) => Object.assign(style, before[i]))
  }, [])

  // Under the nav, however tall it is now; and the biggest cells that fit,
  // across and down, once the status line, the controls and the room kept
  // under them have theirs.
  useEffect(() => {
    const fit = () => {
      setTop(navBottom())
      const box = group.current
      if (!box || !statusLine.current || !controls.current) return
      const below = statusLine.current.offsetHeight + controls.current.offsetHeight + 2 * GAP + box.clientHeight * ROOM_BELOW
      const size = Math.floor(Math.min((box.clientWidth - FRAME_WIDTH) / SLOTS.reels, (box.clientHeight - below - FRAME_HEIGHT) / SLOTS.rows))
      setCell(Math.max(28, Math.min(LARGEST_CELL, size)))
    }
    const observer = new ResizeObserver(fit)
    observer.observe(group.current)
    window.addEventListener('resize', fit)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
      clearTimeout(toastTimer.current)
    }
  }, [])

  const say = (text, kind = '') => setStatus({ text, kind })

  const nudgeBank = () => {
    const el = bank.current
    if (!el) return
    el.classList.remove('is-nudged')
    void el.offsetWidth
    el.classList.add('is-nudged')
  }

  const showToast = (text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  const startSpin = async () => {
    if (spinningNow.current || !machine) return
    const amount = allInNext.current ? balance : bet
    allInNext.current = false

    if (balance <= 0) {
      say('Add credits first', 'alert')
      nudgeBank()
      return
    }
    if (amount > balance) {
      say('Lower your bet', 'alert')
      nudgeBank()
      return
    }

    spinningNow.current = true
    setSpinning(true)
    reels.current.clear()
    setDuring({ balance: Math.round((balance - amount) * 100) / 100 })
    say('Rolling…')

    // The spin goes to the server as the lever's let go. The reels set off
    // the moment the knob first hits the top stop on its way back, while it
    // bounces, and land once the answer's back.
    const request = game.play(amount)
    request.catch(() => {}) // handled below, once the reels are going
    await new Promise((resolve) => {
      leverAtTop.current = resolve
      setTimeout(resolve, LEVER_TOP_FALLBACK_MS)
    })
    leverAtTop.current = null
    reels.current.start()
    const ticking = setInterval(SOUNDS.tick, 70)

    let result
    try {
      result = await request
    } catch (err) {
      await reels.current.stop()
      clearInterval(ticking)
      setDuring(null)
      spinningNow.current = false
      setSpinning(false)
      say(err instanceof ApiError ? err.message : "Couldn't reach the machine. Try again.", 'alert')
      game.reload()
      return
    }
    await reels.current.land(result.grid)
    clearInterval(ticking)

    game.setBalance(result.balance, result.win)
    setDuring(null)

    if (result.win > 0) {
      reels.current.highlight(result.lines.flatMap((won) => won.cells))
      const win = formatPoints(result.win)
      if (result.jackpot) {
        say(`Jackpot! +${win}`, 'win')
        SOUNDS.jackpot()
        haptic(HAPTIC.bigWin)
        setJackpot(result.win)
      } else if (result.bigWin) {
        say(`Big win! +${win}`, 'win')
        SOUNDS.win()
        haptic(HAPTIC.bigWin)
      } else {
        say(`Win +${win}`, 'win')
        SOUNDS.win()
        haptic(HAPTIC.win)
      }
    } else {
      say(result.balance > 0 ? 'No win. Pull again' : 'Out of credits', result.balance > 0 ? '' : 'alert')
    }

    spinningNow.current = false
    setSpinning(false)
  }

  // − and +: whole PP, from the minimum up to what the machine holds.
  const stepBet = (up) => {
    SOUNDS.step(up)
    setPicked((current) => {
      const now = betFor(current, balance)
      const next = up ? Math.floor(now) + 1 : Math.ceil(now) - 1
      return Math.min(Math.max(SLOTS.minBet, Math.floor(balance)), Math.max(SLOTS.minBet, next))
    })
  }

  // MAX: everything in the machine, cents and all, and pull.
  const maxBet = () => {
    if (spinningNow.current) return
    if (balance <= 0) {
      say('Add credits first', 'alert')
      nudgeBank()
      return
    }
    setPicked(balance)
    allInNext.current = true
    lever.current.autoPull()
  }

  const addCredits = async (amount) => {
    await game.add(amount)
    SOUNDS.credits()
    showToast(`Added ${amount} credits`)
    setStatus(null)
  }

  const cashOut = async () => {
    const { paid, machine: after } = await game.cashOut()
    showToast(`Cashed out ${[paid.pp && `${paid.pp} PP`, paid.ppp && `${paid.ppp} P-PP`].filter(Boolean).join(' and ')}`)
    reels.current?.clear()
    setStatus(after.balance > 0 ? { text: 'Some credits stayed in the machine' } : null)
  }

  const statusColour = line.kind === 'alert' ? 'text-(--slot-alert)' : line.kind === 'win' ? 'text-(--slot-win) drop-shadow-[0_0_8px_rgba(250,188,63,0.6)]' : 'text-(--slot-gold)'

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 28 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="slots fixed inset-x-0 bottom-0 z-50 touch-none overflow-hidden text-white select-none"
        style={{ top, backgroundImage: SCREEN_BACKGROUND }}
        onPointerDown={(e) => {
          wakeAudio()
          if (e.target.closest('button')) haptic(HAPTIC.press)
        }}
      >
        <div className="mx-auto flex h-full w-full max-w-[30rem] flex-col px-[max(1rem,env(safe-area-inset-left))] pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Top row: mute, and the simplified paytable. */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={ICON_BUTTON}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
              aria-pressed={muted}
              onClick={() => {
                setMuted(!muted)
                setMutedState(!muted)
              }}
            >
              <MuteIcon muted={muted} />
            </button>
            <button type="button" className={ICON_BUTTON} aria-label="Paytable" onClick={() => setSheet('paytable')}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 9h18M9 9v11M15 9v11" />
              </svg>
            </button>
            <h1 className="ml-auto font-['Bebas_Neue'] text-xl tracking-widest text-white/60">{SLOTS.name}</h1>
          </div>

          {/* The reels, status line and controls together, centred in what's
              left (a little higher than the middle, with room kept below),
              the reels as big as fit. */}
          <div ref={group} className="flex min-h-0 flex-1 flex-col justify-center gap-3">
            <div className="flex justify-center">
              <Reels ref={reels} cell={cell} spinning={spinning} reduce={reduce} />
            </div>

            <p ref={statusLine} role="status" className={`min-h-[1.4em] text-center font-['Bebas_Neue'] text-xl tracking-[0.14em] uppercase ${statusColour}`}>
              {line.text}
            </p>

            <section ref={controls} className="grid grid-cols-[minmax(0,1fr)_70px] gap-3.5" aria-label="Controls">
              <div className="flex min-w-0 flex-col justify-center gap-3">
                {/* A real border, not an inset shadow: a pressed button's background
                    would paint over a shadow and wipe out the outline. */}
                <div ref={bank} className="slot-bank overflow-hidden rounded-2xl border-[1.5px] border-(--slot-gold-dim) bg-(--slot-panel)">
                  <div className="flex items-end justify-between gap-3 px-3.5 pt-2.5 pb-2">
                    <div>
                      <p className="text-[0.68rem] font-bold tracking-[0.12em] text-(--slot-muted) uppercase">Credits</p>
                      <p className="mt-1 font-['Bebas_Neue'] text-lg tracking-wide text-(--slot-muted)">
                        Win <b className="font-normal text-(--slot-win)"><AnimatedNumber value={shownWin} fractionDigits={2} /></b>
                      </p>
                    </div>
                    <p className="font-['Bebas_Neue'] text-[2.6rem] leading-none tracking-wide text-white" aria-label={`${formatPoints(shownBalance)} PP in the machine`}>
                      <AnimatedNumber value={shownBalance} fractionDigits={2} />
                      <span className="ml-1 text-lg text-(--slot-muted)">PP</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 border-t border-(--slot-gold-dim)">
                    <button
                      type="button"
                      disabled={spinning || !machine}
                      onClick={() => setSheet('credits')}
                      className="cursor-pointer px-1.5 py-2.5 text-sm font-semibold transition-colors active:bg-white/10 disabled:cursor-default disabled:opacity-40"
                    >
                      + Add credits
                    </button>
                    <button
                      type="button"
                      disabled={spinning || !machine}
                      onClick={() => {
                        if (balance <= 0) {
                          say('Nothing to cash out', 'alert')
                          nudgeBank()
                          return
                        }
                        setSheet('cashout')
                      }}
                      className="cursor-pointer border-l border-(--slot-gold-dim) px-1.5 py-2.5 text-sm font-semibold transition-colors active:bg-white/10 disabled:cursor-default disabled:opacity-40"
                    >
                      Cash out
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[50px_minmax(0,1fr)_50px_minmax(0,1.1fr)] items-center gap-2">
                  <HoldButton label="Lower bet" disabled={spinning || balance <= 0 || bet <= SLOTS.minBet} onStep={() => stepBet(false)} className={ROUND}>
                    <StepIcon />
                  </HoldButton>
                  <div className="text-center">
                    <span className="block text-[0.68rem] font-bold tracking-[0.12em] text-(--slot-muted) uppercase">{allIn ? 'All in' : 'Bet'}</span>
                    <span className="block font-['Bebas_Neue'] text-2xl leading-tight tracking-wide tabular-nums">{formatPoints(bet)}</span>
                  </div>
                  <HoldButton
                    label="Raise bet"
                    disabled={spinning || balance < SLOTS.minBet || bet >= Math.floor(balance)}
                    onStep={() => stepBet(true)}
                    className={ROUND}
                  >
                    <StepIcon up />
                  </HoldButton>
                  <button
                    type="button"
                    onClick={maxBet}
                    disabled={spinning || !machine}
                    className="h-[50px] cursor-pointer rounded-xl bg-(--slot-gold) font-['Bebas_Neue'] text-2xl tracking-[0.08em] text-ink shadow-[0_4px_0_var(--slot-gold-dim)] transition active:translate-y-[3px] active:shadow-[0_1px_0_var(--slot-gold-dim)] disabled:cursor-default disabled:opacity-40"
                  >
                    Max
                  </button>
                </div>
              </div>

              <Lever
                ref={lever}
                locked={spinning || !machine}
                onPull={startSpin}
                onTop={() => leverAtTop.current?.()}
                onShortPull={() => say('Pull it all the way down')}
              />
            </section>

            {game.error && !machine && <p className="text-center text-sm text-(--slot-alert)">{game.error}</p>}
            {/* The room kept under the controls. */}
            <div aria-hidden="true" className="shrink-0" style={{ flexBasis: `${ROOM_BELOW * 100}%` }} />
          </div>
        </div>

        <AnimatePresence>
          {sheet === 'credits' && <AddCreditsSheet key="credits" wallet={wallet} onAdd={addCredits} onClose={() => setSheet(null)} />}
          {sheet === 'cashout' && <CashOutSheet key="cashout" onConfirm={cashOut} onClose={() => setSheet(null)} />}
          {sheet === 'paytable' && (
            <Sheet key="paytable" title="Paytable" placement="center" onClose={() => setSheet(null)}>
              <CompactPaytable />
            </Sheet>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.p
              key={toast}
              role="status"
              initial={{ opacity: 0, y: -16, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -16, x: '-50%' }}
              transition={{ duration: 0.2 }}
              // Up top, clear of the sheets that slide up from the bottom.
              className="absolute top-14 left-1/2 z-40 max-w-[calc(100%-2rem)] rounded-full bg-white px-4 py-2.5 text-center text-sm font-bold text-ink shadow-lg shadow-black/40"
            >
              {toast}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Outside the machine, so it covers the nav too. */}
      <AnimatePresence>{jackpot !== null && <JackpotCelebration key="jackpot" amount={jackpot} onClose={() => setJackpot(null)} />}</AnimatePresence>
    </>
  )
}
