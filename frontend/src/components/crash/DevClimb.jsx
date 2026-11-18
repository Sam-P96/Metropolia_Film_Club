import { useEffect, useRef, useState } from 'react'
import BetControls from './BetControls'
import CashOutButton from './CashOutButton'
import CrashStage from './CrashStage'
import GameScreen from './GameScreen'
import { GOLD_BUTTON } from '../steal/style'
import { getCurrentUser } from '../../utils/currentUser'
import { CRASH_RULES, formatMultiplier } from '../../../../shared/crash/rules.js'

// Developer tool, only in the Vite dev server (pages/Crash.jsx shows its
// button behind import.meta.env.DEV): a pretend round of Box Office Crash
// on the real game screen (GameScreen.jsx, the same as a room), with its
// scene, sound, chart and your picture riding the line. It keeps climbing
// to the 25x cap unless you crash it, to see every tier without playing
// real rounds. Cash out (or Space) like the real thing, to see it pay. It
// all happens in this browser: nothing goes to the server, so no bets,
// plays or points.
//
// The Dev menu in the header: hold it where it is, crash it, how fast it
// climbs, and jumps straight to 2x, 5x, 10x or 20x.

const TICK_MS = 100
const CAP = 25
// Seconds from 1x to the 25x cap, at each speed.
const SPEEDS = [
  { key: 'slow', label: 'Slow', seconds: 60 },
  { key: 'normal', label: 'Normal', seconds: 25 },
  { key: 'fast', label: 'Fast', seconds: 10 },
]
// Straight to these, to look at each tier (effects.js): stars from 2x, the
// black hole from 5x, galaxies from 10x, and the black hole pulling them
// in from about 17x (starting at 18x, halfway at 20x, gone by 22x).
const JUMPS = [2, 5, 10, 18, 20, 22]

const DEV = 'min-h-9 cursor-pointer rounded-lg border px-2.5 text-sm font-semibold transition disabled:cursor-default disabled:opacity-40'
const SKY = `${DEV} border-sky-400/50 bg-sky-950/60 text-sky-100 hover:border-sky-300 hover:text-white`
const PICKED = `${DEV} border-sky-300 bg-sky-500/30 text-white`

// What CrashStage reads (the same shape as hooks/useCrash.js keeps).
const blankLive = (roundId = null) => ({ roundId, path: [], lastTickAt: 0, status: null, endedBy: null, config: { tickMs: TICK_MS }, cashouts: new Map(), crashedAt: 0 })

// A new pretend round, at 0.99x, getting ready (like a real one's
// countdown), or straight from `from` if given.
function newClimb(from) {
  const state = { ...blankLive(`dev-${Date.now()}`), path: [0.99], status: from ? 'playing' : 'starting', lastTickAt: performance.now() }
  if (from) state.path.push(from)
  return state
}

// The next point on the line, at `m` (0 is a crash).
function addPoint(state, m) {
  state.path.push(m)
  state.lastTickAt = performance.now()
}

// The pretend round over: at the cap, or crashed.
function finish(state, endedBy) {
  state.status = 'over'
  state.endedBy = endedBy
  if (endedBy === 'crash') state.crashedAt = performance.now()
}

// A pretend cash-out at the line's tip, as the server would pay it.
function cashOutAt(state, userId) {
  const multiplier = state.path[state.path.length - 1]
  state.cashouts.set(userId, { multiplier, tick: state.path.length - 1, auto: false })
  return multiplier
}

// The Dev menu, opening under the header.
function DevMenu({ playing, held, onHold, onCrash, speed, onSpeed, onJump }) {
  return (
    <details className="relative shrink-0">
      <summary className="cursor-pointer list-none rounded-full border border-sky-400/50 bg-sky-950/60 px-2.5 py-0.5 text-xs font-semibold text-sky-100 hover:border-sky-300 sm:text-sm">
        Dev ▾
      </summary>
      <div className="absolute top-full right-0 z-20 mt-2 flex w-64 flex-col gap-3 rounded-xl border border-sky-400/30 bg-[#04140F]/90 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <p className="text-xs text-sky-200/80">A pretend round: nothing real is played.</p>
        <div className="flex gap-2">
          <button type="button" onClick={onHold} disabled={!playing} aria-pressed={held} className={`${held ? PICKED : SKY} flex-1`}>
            {held ? 'Resume' : 'Hold'}
          </button>
          <button type="button" onClick={onCrash} disabled={!playing} className={`${DEV} flex-1 border-red-400/50 bg-red-950/60 text-red-100 hover:border-red-300`}>
            Crash it
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-full text-xs text-white/55">Speed</span>
          {SPEEDS.map((entry) => (
            <button key={entry.key} type="button" onClick={() => onSpeed(entry.key)} aria-pressed={speed === entry.key} className={speed === entry.key ? PICKED : SKY}>
              {entry.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-full text-xs text-white/55">Jump to</span>
          {JUMPS.map((m) => (
            <button key={m} type="button" onClick={() => onJump(m)} className={SKY}>
              {m}x
            </button>
          ))}
        </div>
      </div>
    </details>
  )
}

export default function DevClimb({ onClose, value, onValue, maxBet = 10 }) {
  const live = useRef(blankLive())
  const displayRef = useRef({ m: 1 })
  const login = getCurrentUser()
  const myId = String(login?._id ?? 'me')
  // What the screen needs: 'idle', 'starting', 'playing' or 'over', how
  // it ended, where you cashed out (or null), and the round's id.
  const [run, setRun] = useState({ status: 'idle', endedBy: null, cashedAt: null, id: null })
  const [speed, setSpeed] = useState('normal')
  const [held, setHeld] = useState(false)
  const speedRef = useRef(speed)
  const heldRef = useRef(held)
  useEffect(() => {
    speedRef.current = speed
    heldRef.current = held
  })

  // Getting ready, then off, like a real round's countdown.
  useEffect(() => {
    if (run.status !== 'starting') return
    const timer = setTimeout(() => {
      live.current.status = 'playing'
      live.current.lastTickAt = performance.now()
      setRun((current) => ({ ...current, status: 'playing' }))
    }, CRASH_RULES.countdownMs)
    return () => clearTimeout(timer)
  }, [run.status, run.id])

  // Each tick: the multiplier times e^(step), where the step averages what
  // it takes to reach 25x in the speed's seconds, with a wobble either way.
  useEffect(() => {
    if (run.status !== 'playing') return
    const timer = setInterval(() => {
      const state = live.current
      if (heldRef.current || state.status !== 'playing') return
      const { seconds } = SPEEDS.find((entry) => entry.key === speedRef.current)
      const per = Math.log(CAP / 0.99) / ((seconds * 1000) / TICK_MS)
      const last = state.path[state.path.length - 1]
      const next = Math.min(CAP, last * Math.exp(per + (Math.random() - 0.5) * per * 5))
      addPoint(state, Math.round(next * 100) / 100)
      if (next >= CAP) {
        // At the cap, anyone still riding is cashed out at 25x, as for real.
        const cashedAt = state.cashouts.has(myId) ? null : cashOutAt(state, myId)
        finish(state, 'cap')
        setRun((current) => ({ ...current, status: 'over', endedBy: 'cap', cashedAt: current.cashedAt ?? cashedAt }))
      }
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [run.status, run.id, myId])

  const start = (from) => {
    live.current = newClimb(from)
    setHeld(false)
    setRun({ status: live.current.status, endedBy: null, cashedAt: null, id: live.current.roundId })
  }

  // Straight to `m`: from where it is, or a new climb from there.
  const jump = (m) => {
    if (live.current.status !== 'playing') return start(m)
    addPoint(live.current, m)
  }

  const crash = () => {
    addPoint(live.current, 0)
    finish(live.current, 'crash')
    setRun((current) => ({ ...current, status: 'over', endedBy: 'crash' }))
  }

  const cashOut = () => {
    if (live.current.status !== 'playing' || live.current.cashouts.has(myId)) return
    const multiplier = cashOutAt(live.current, myId)
    setRun((current) => ({ ...current, cashedAt: multiplier }))
  }
  const cashOutRef = useRef(cashOut)
  useEffect(() => {
    cashOutRef.current = cashOut
  })
  // Space cashes out, as in the real game, unless you're typing.
  const riding = run.status === 'playing' && run.cashedAt === null
  useEffect(() => {
    if (!riding) return
    const onKey = (event) => {
      if (event.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)) return
      event.preventDefault()
      cashOutRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [riding])

  const bet = value.bet
  const payout = run.cashedAt === null ? 0 : Math.floor(bet * run.cashedAt + 1e-9)
  // You, riding the line, as a player in a real round.
  const round = {
    players: run.status === 'idle' ? [] : [{ userId: myId, user: { _id: myId, username: login?.username ?? 'You' }, cashedAt: run.cashedAt, cashedTick: null, payout }],
    endedBy: run.endedBy,
  }

  let panel
  if (run.status === 'starting') {
    panel = <p className="py-4 text-center font-['Bebas_Neue'] text-3xl tracking-wide text-white">Bets are in. Get ready…</p>
  } else if (riding) {
    panel = <CashOutButton bet={bet} displayRef={displayRef} onCashOut={cashOut} busy={false} />
  } else if (run.status === 'playing') {
    panel = (
      <p className="py-3 text-center text-white">
        You cashed out at <strong className="text-[#B8FFE0]">{formatMultiplier(run.cashedAt)}</strong>: <strong className="text-[#FFD76A]">{payout}</strong> back.
        Watching the rest…
      </p>
    )
  } else {
    panel = (
      <>
        {run.status === 'over' && (
          <p className="text-center text-white/85">
            {run.endedBy === 'crash' ? 'It crashed.' : 'It hit the 25x cap.'}{' '}
            {run.cashedAt === null ? (
              <>You lost {bet}.</>
            ) : (
              <>
                You cashed out at <strong className="text-[#B8FFE0]">{formatMultiplier(run.cashedAt)}</strong>: <strong className="text-[#FFD76A]">{payout}</strong> back.
              </>
            )}{' '}
            <span className="text-white/50">(Pretend.)</span>
          </p>
        )}
        <BetControls value={value} maxBet={maxBet} onChange={onValue} />
        <button type="button" onClick={() => start()} className={`${GOLD_BUTTON} min-h-12 text-lg`}>
          {run.status === 'idle' ? 'Ready: start' : 'Play again'}
        </button>
      </>
    )
  }

  return (
    <GameScreen
      back={
        <button type="button" onClick={onClose} className="cursor-pointer px-1 text-sm text-white/65 hover:text-white">
          ← Lobby
        </button>
      }
      status={<span className="font-semibold text-sky-300">Dev: pretend round</span>}
      extras={
        <DevMenu
          playing={run.status === 'playing'}
          held={held}
          onHold={() => setHeld(!held)}
          onCrash={crash}
          speed={speed}
          onSpeed={setSpeed}
          onJump={jump}
        />
      }
      stage={<CrashStage round={round} live={live} myId={myId} displayRef={displayRef} idle="Ready when you are" />}
    >
      {panel}
    </GameScreen>
  )
}
