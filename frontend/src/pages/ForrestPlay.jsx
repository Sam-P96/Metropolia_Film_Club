import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { FORREST_BACKDROP, LEAF, RainforestGlow } from '../components/forrest/ForrestChrome'
import ForrestStage from '../components/forrest/ForrestStage'
import * as forrestSound from '../components/forrest/feedback'
import { FruitLegend, HowToText } from '../components/forrest/HowTo'
import { liveRun } from '../components/forrest/liveRun'
import { FrameBackdrop } from '../components/GameBackdrop'
import SoundToggle from '../components/SoundToggle'
import useGameFrame from '../hooks/useGameFrame'
import { cashOutForrestRun, discardForrestRun, finishForrestRun, getForrest, startForrestRun } from '../services/forrest'
import { FORREST, SETS } from '../../../shared/forrest/rules.js'

// Everything over the stage is sized in cqw (1% of the stage's width), so
// the menu and the result fit it at any size without scrolling.
const OVERLAY = 'absolute inset-0 flex flex-col items-center justify-center gap-[2.6cqw] overflow-hidden bg-[#08140a]/88 p-[4cqw] text-center backdrop-blur-[2px]'
const ENTRY = 'flex cursor-pointer flex-col items-center gap-[0.4cqw] rounded-[2.8cqw] border px-[1.5cqw] py-[2.4cqw] transition disabled:cursor-not-allowed disabled:opacity-35'
const PRIMARY = 'min-h-[10cqw] flex-1 cursor-pointer rounded-[2.8cqw] bg-[#ffd166] px-[3cqw] text-[3.7cqw] font-bold text-[#1b1b1b] transition hover:brightness-110 disabled:opacity-50'
const SECONDARY = 'min-h-[10cqw] flex-1 cursor-pointer rounded-[2.8cqw] border border-white/15 bg-white/10 px-[3cqw] text-[3.7cqw] font-semibold text-white transition hover:bg-white/15 disabled:opacity-50'
const PILL = 'rounded-full border border-white/15 bg-white/5 px-3 py-1'
const FRUIT = SETS[0].fruit
// The stage's shape, and the widest it gets.
const RATIO = 640 / 400
const MAX_WIDTH = 520

// The menu over the stage: how to play, the fruit, the entries and free play.
function Menu({ status, message, busy, onStart }) {
  const locked = status.cashOutsLeft <= 0
  const note = locked
    ? `All ${FORREST.cashOutsPerDay} cash-outs used today: free play until 12:00.`
    : status.points < FORREST.entries[0]
      ? `You need at least ${FORREST.entries[0]} PP to play.`
      : `Cash-outs left today: ${status.cashOutsLeft}/${FORREST.cashOutsPerDay} · ${FORREST.scorePerPoint} score = 1 PP`
  return (
    <div className={OVERLAY}>
      {message && <p className="text-[3.2cqw] font-semibold text-[#ffd166]">{message}</p>}
      <HowToText className="w-full rounded-[2.8cqw] bg-white/5 px-[3cqw] py-[2.4cqw] text-[2.95cqw] leading-[1.45]" />
      <FruitLegend className="gap-[3cqw] text-[3.3cqw]" />
      <div className="grid w-full grid-cols-3 gap-[2cqw]">
        {FORREST.entries.map((cost) => (
          <button
            key={cost}
            type="button"
            disabled={busy || locked || status.points < cost}
            onClick={() => onStart(cost)}
            className={`${ENTRY} border-white/10 bg-[#1f3a24] text-white hover:border-[#9be564]/60`}
          >
            <b className="text-[3.8cqw]">{cost} PP</b>
            <small className="text-[2.6cqw] text-white/60">
              {FRUIT[0]} = {cost / 10} score
            </small>
          </button>
        ))}
        <button type="button" disabled={busy || !locked} onClick={() => onStart(0)} className={`${ENTRY} border-[#9be564]/30 bg-[#1d4a42] text-white hover:border-[#9be564]/70`}>
          <b className="text-[3.8cqw]">Free</b>
          <small className="text-[2.6cqw] text-white/60">{locked ? `${FRUIT[0]} = ${FORREST.freeMult} score` : 'after 3 cash-outs'}</small>
        </button>
      </div>
      <p className="text-[2.8cqw] text-white/60">{note}</p>
    </div>
  )
}

// After a run: the server's score, what it's worth, and cash out or throw
// away (free play: again, or the menu). A new best, if it was one.
function Result({ result, status, busy, message, onCashOut, onDiscard, onAgain, onMenu }) {
  const { run, best } = result
  const net = run.payout - run.cost
  return (
    <div className={OVERLAY}>
      <h2 className="font-['Bebas_Neue'] text-[7cqw] leading-none tracking-wide text-white">{run.free ? 'Free play over' : 'Game over'}</h2>
      <p className="text-[11cqw] leading-none font-extrabold text-[#ffd166] tabular-nums">{run.score}</p>
      <p className="text-[3.2cqw] text-[#d6efd0]/80">
        {run.fruit} fruit × {run.mult}
        {run.free ? '' : ` (${run.cost} PP game)`} · level {run.level}
      </p>
      {best?.site && (
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-[2.8cqw] border border-[#ffd166]/60 bg-[#ffd166]/10 px-[3cqw] py-[2cqw] text-[3.3cqw] font-semibold text-[#ffd166]"
        >
          🏆 A new site record: {run.fruit} fruit! Everyone&apos;s been told.
        </motion.p>
      )}
      {best && !best.site && best.personal && (
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-[2.8cqw] border border-[#9be564]/60 bg-[#9be564]/10 px-[3cqw] py-[2cqw] text-[3.3cqw] font-semibold text-[#b8e986]"
        >
          🌟 A new personal best (up from {best.previous})! Everyone&apos;s been told.
        </motion.p>
      )}
      {run.free ? (
        <>
          <p className="text-[3.2cqw] text-white/60">Free play can&apos;t be cashed out.</p>
          <div className="flex w-full gap-[2cqw]">
            <button type="button" className={PRIMARY} disabled={busy} onClick={onAgain}>
              Play again
            </button>
            <button type="button" className={SECONDARY} disabled={busy} onClick={onMenu}>
              Menu
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[3.6cqw] text-white">
            Worth <b>{run.payout} PP</b> <span className="text-[2.7cqw] text-white/55">({FORREST.scorePerPoint} score = 1 PP)</span>
            <br />
            <span style={{ color: net >= 0 ? LEAF : '#ef476f' }}>
              {net >= 0 ? '+' : '−'}
              {Math.abs(net)} PP vs. your entry
            </span>
          </p>
          <div className="flex w-full gap-[2cqw]">
            <button type="button" className={PRIMARY} disabled={busy || status.cashOutsLeft <= 0} onClick={onCashOut}>
              Cash out +{run.payout} PP
            </button>
            <button type="button" className={SECONDARY} disabled={busy} onClick={onDiscard}>
              Throw away
            </button>
          </div>
          <p className="text-[2.7cqw] text-white/55">
            Cash-outs left today: {status.cashOutsLeft}/{FORREST.cashOutsPerDay}. Throwing a run away keeps your cash-out for a better one. Your followers
            hear what you cash out; {FORREST.bigWinTimes}× your entry or more, everyone does.
          </p>
        </>
      )}
      {message && (
        <p role="alert" className="text-[3cqw] text-red-300">
          {message}
        </p>
      )}
    </div>
  )
}

// The game itself (Forrest Bounce's Play, from its start page): your PP,
// cash-outs and best along the top and the game under them, filling the
// screen under the nav bar. The page can't scroll, on a computer or a
// phone (hooks/useGameFrame.js holds it still), and the game is sized to
// fit: as tall as there's room for, at most MAX_WIDTH wide. Pick an entry,
// bounce until a shuriken gets you, then cash the score out (three a day)
// or throw it away. The server plays every run again from its taps and
// pays from that (backend/utils/forrest.js).
export default function ForrestPlay() {
  const frame = useGameFrame()
  const [status, setStatus] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState('menu')
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const live = useRef(null)

  // The room under the pills, and the biggest stage that fits it.
  const areaRef = useRef(null)
  const [area, setArea] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const element = areaRef.current
    const measure = () => setArea({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const width = Math.max(0, Math.floor(Math.min(area.width, area.height / RATIO, MAX_WIDTH)))

  useEffect(() => {
    getForrest()
      .then(({ status: loaded }) => {
        setStatus(loaded)
        // A scored run still waiting (they refreshed, or came back, before deciding).
        if (loaded.waiting) {
          setResult({ run: loaded.waiting, best: null })
          setView('result')
        }
      })
      .catch((error) => setLoadError(error.message))
  }, [])

  const toMenu = (said = '') => {
    live.current = null
    setResult(null)
    setMessage(said)
    setView('menu')
  }

  const start = async (cost) => {
    setBusy(true)
    setMessage('')
    try {
      const { run, status: next } = await startForrestRun(cost)
      setStatus(next)
      live.current = liveRun(run)
      setResult(null)
      setView('playing')
      document.activeElement?.blur?.()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  // A tap: the next step of the run takes it.
  const tap = () => {
    const run = live.current
    if (run && !run.s.over) run.pending = true
  }

  // The run's over on the page: a moment to see it, then the server's score.
  const onOver = (played) => {
    setView('sending')
    setTimeout(() => {
      finishForrestRun(played.run.id, played.taps, played.s.tick)
        .then(({ run, best, status: next }) => {
          setStatus(next)
          setResult({ run, best })
          setView('result')
        })
        .catch((error) => toMenu(error.message))
    }, 800)
  }

  const act = async (work) => {
    setBusy(true)
    setMessage('')
    try {
      await work()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }
  const cashOut = () =>
    act(async () => {
      const { payout, status: next } = await cashOutForrestRun(result.run.id)
      setStatus(next)
      toMenu(next.cashOutsLeft === 0 ? `Cashed out +${payout} PP. That's today's cash-outs: free play's open.` : `Cashed out +${payout} PP.`)
    })
  const discard = () =>
    act(async () => {
      const { status: next } = await discardForrestRun(result.run.id)
      setStatus(next)
      toMenu('Run thrown away. Your cash-out is still there.')
    })

  return (
    <>
      <FrameBackdrop top={frame.top} to={FORREST_BACKDROP} className="z-39" />
      <RainforestGlow className="z-39" />
      <div
        className="fixed inset-x-0 z-40 flex touch-none flex-col items-center gap-3 overflow-hidden overscroll-none px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={{ top: frame.top, height: frame.height }}
      >
        <h1 className="sr-only">Forrest Bounce</h1>
        <div className="flex shrink-0 flex-wrap justify-center gap-2 text-sm font-semibold text-white/85 tabular-nums">
          {status ? (
            <>
              <span className={PILL}>
                💰 {status.pp} PP · {status.ppp} P-PP
              </span>
              <span className={PILL}>
                💸 {status.cashOutsLeft}/{FORREST.cashOutsPerDay} cash-outs
              </span>
              <span className={PILL}>🏅 Best {status.best} fruit</span>
            </>
          ) : (
            <span className={PILL}>{loadError || 'Loading…'}</span>
          )}
          <SoundToggle sound={forrestSound} className={`${PILL} transition-colors hover:bg-white/10`} />
        </div>
        <div ref={areaRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
          {width > 0 && (
            <ForrestStage
              live={live}
              buddies={status?.buddies ?? ['🐸', '🐰']}
              playing={view === 'playing'}
              onTap={tap}
              onOver={onOver}
              style={{ width, height: Math.floor(width * RATIO) }}
            >
              {!status && <div className={OVERLAY}>{loadError || 'Loading…'}</div>}
              {status && view === 'menu' && <Menu status={status} message={message} busy={busy} onStart={start} />}
              {view === 'sending' && (
                <div className={`${OVERLAY} bg-[#08140a]/55`}>
                  <p className="text-[3.6cqw] font-semibold text-[#d6efd0]">Counting your fruit…</p>
                </div>
              )}
              {status && view === 'result' && result && (
                <Result
                  result={result}
                  status={status}
                  busy={busy}
                  message={message}
                  onCashOut={cashOut}
                  onDiscard={discard}
                  onAgain={() => start(0)}
                  onMenu={() => toMenu()}
                />
              )}
            </ForrestStage>
          )}
        </div>
      </div>
    </>
  )
}
