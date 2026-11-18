import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import BuddyPicker from '../components/forrest/BuddyPicker'
import ForrestPage, { CARD, HEADING, LEAF } from '../components/forrest/ForrestChrome'
import ForrestStage from '../components/forrest/ForrestStage'
import { liveRun } from '../components/forrest/liveRun'
import MemberAvatar from '../components/profile/MemberAvatar'
import { cashOutForrestRun, devResetForrestDay, discardForrestRun, finishForrestRun, getForrest, setForrestBuddies, startForrestRun } from '../services/forrest'
import { FORREST, SETS, TIERS, TIER_COLORS } from '../../../shared/forrest/rules.js'

const OVERLAY = 'absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-[#08140a]/88 p-4 text-center backdrop-blur-[2px] sm:p-5'
const ENTRY = 'flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition disabled:cursor-not-allowed disabled:opacity-35'
const PRIMARY = 'min-h-11 flex-1 cursor-pointer rounded-xl bg-[#ffd166] px-4 font-bold text-[#1b1b1b] transition hover:brightness-110 disabled:opacity-50'
const SECONDARY = 'min-h-11 flex-1 cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 font-semibold text-white transition hover:bg-white/15 disabled:opacity-50'
const fruit = SETS[0].fruit

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
      {message && <p className="text-sm font-semibold text-[#ffd166]">{message}</p>}
      <div className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-left text-[12.5px] leading-relaxed text-[#d6efd0]">
        <p>
          👆 <b>Tap, click or Space:</b> the buddy on the branch drops onto the seesaw and launches the other up to the far tree.
        </p>
        <p>
          🤸 <b>Tap again mid-air</b> for a flipping double jump. You still land in the same spot.
        </p>
        <p>🍎 Time your jumps so the arcs pass through fruit. The higher it floats, the more it&apos;s worth.</p>
        <p>
          ✴️ Shurikens fly straight across and hit anyone. <b>One hit ends the run</b>, unless you&apos;re holding a 💖: now and then a glowing heart flies
          by instead (hold up to 3). Watch for the red <b>!</b>.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        {fruit.map((emoji, i) => (
          <span key={emoji} style={{ color: TIER_COLORS[i] }}>
            {emoji} ×{TIERS[i].m}
          </span>
        ))}
      </div>
      <div className="grid w-full grid-cols-3 gap-2">
        {FORREST.entries.map((cost) => (
          <button
            key={cost}
            type="button"
            disabled={busy || locked || status.points < cost}
            onClick={() => onStart(cost)}
            className={`${ENTRY} border-white/10 bg-[#1f3a24] text-white hover:border-[#9be564]/60`}
          >
            <b className="text-base">{cost} PP</b>
            <small className="text-[11px] text-white/60">
              {fruit[0]} = {cost / 10} score
            </small>
          </button>
        ))}
        <button type="button" disabled={busy || !locked} onClick={() => onStart(0)} className={`${ENTRY} border-[#9be564]/30 bg-[#1d4a42] text-white hover:border-[#9be564]/70`}>
          <b className="text-base">Free</b>
          <small className="text-[11px] text-white/60">{locked ? `${fruit[0]} = ${FORREST.freeMult} score` : 'after 3 cash-outs'}</small>
        </button>
      </div>
      <p className="text-xs text-white/60">{note}</p>
    </div>
  )
}

// After a run: the server's score, what it's worth, and cash out or throw
// away (free play: again, or the menu). A new best, if it was one.
function Result({ result, status, busy, onCashOut, onDiscard, onAgain, onMenu }) {
  const { run, best } = result
  const net = run.payout - run.cost
  return (
    <div className={OVERLAY}>
      <h2 className="font-['Bebas_Neue'] text-3xl tracking-wide text-white">{run.free ? 'Free play over' : 'Game over'}</h2>
      <p className="text-5xl font-extrabold text-[#ffd166] tabular-nums">{run.score}</p>
      <p className="text-sm text-[#d6efd0]/80">
        {run.fruit} fruit × {run.mult}
        {run.free ? '' : ` (${run.cost} PP game)`} · level {run.level}
      </p>
      {best?.site && (
        <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-xl border border-[#ffd166]/60 bg-[#ffd166]/10 px-3 py-2 font-semibold text-[#ffd166]">
          🏆 A new site record: {run.fruit} fruit! Everyone&apos;s been told.
        </motion.p>
      )}
      {best && !best.site && best.personal && (
        <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-xl border border-[#9be564]/60 bg-[#9be564]/10 px-3 py-2 font-semibold text-[#b8e986]">
          🌟 A new personal best (up from {best.previous})! Everyone&apos;s been told.
        </motion.p>
      )}
      {run.free ? (
        <>
          <p className="text-sm text-white/60">Free play can&apos;t be cashed out.</p>
          <div className="flex w-full gap-2">
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
          <p className="text-white">
            Worth <b>{run.payout} PP</b>{' '}
            <span className="text-xs text-white/55">
              ({FORREST.scorePerPoint} score = 1 PP)
            </span>
            <br />
            <span style={{ color: net >= 0 ? LEAF : '#ef476f' }}>
              {net >= 0 ? '+' : '−'}
              {Math.abs(net)} PP vs. your entry
            </span>
          </p>
          <div className="flex w-full gap-2">
            <button type="button" className={PRIMARY} disabled={busy || status.cashOutsLeft <= 0} onClick={onCashOut}>
              Cash out +{run.payout} PP
            </button>
            <button type="button" className={SECONDARY} disabled={busy} onClick={onDiscard}>
              Throw away
            </button>
          </div>
          <p className="text-xs text-white/55">
            Cash-outs left today: {status.cashOutsLeft}/{FORREST.cashOutsPerDay}. Throwing a run away keeps your cash-out for a better one. Everyone hears
            what you cash out.
          </p>
        </>
      )}
    </div>
  )
}

function Leaderboard({ entries }) {
  return (
    <section aria-labelledby="forrest-best" className={`${CARD} flex flex-col gap-3`}>
      <h2 id="forrest-best" className={HEADING}>
        Best runs
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-white/60">Nobody&apos;s bounced yet. The first run sets the record.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li key={entry.user._id} className="flex items-center gap-3">
              <span className={`w-5 text-right font-bold tabular-nums ${index === 0 ? 'text-brand-gold' : 'text-white/50'}`}>{index + 1}</span>
              <MemberAvatar user={entry.user} size="sm" />
              <span className="min-w-0 flex-1 truncate text-white">{entry.user.username}</span>
              <span className="font-semibold text-[#b8e986] tabular-nums">{entry.fruit} fruit</span>
              <span className="w-12 text-right text-xs text-white/50">Lv {entry.level}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-white/50">Best runs count fruit before the entry&apos;s multiplier, so every entry counts the same.</p>
    </section>
  )
}

// Developer tool: only in the Vite dev server (and the server only answers
// on your own computer: backend/middleware/devTools.js).
function DevReset({ onDone }) {
  const [said, setSaid] = useState('')
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() =>
          devResetForrestDay()
            .then(({ status }) => {
              onDone(status)
              setSaid("Today's cash-outs are back.")
            })
            .catch((error) => setSaid(error.message))
        }
        className="rounded-lg border border-sky-400/50 bg-sky-950/40 px-3 py-1.5 text-sm font-semibold text-sky-200 hover:border-sky-300 hover:text-white"
      >
        Dev: reset today&apos;s cash-outs
      </button>
      {said && <span className="text-xs text-sky-200">{said}</span>}
    </div>
  )
}

// Forrest Bounce (Games → Forrest Bounce): pick an entry, bounce for fruit
// until a shuriken gets you, then cash the score out (three a day) or
// throw it away. The server plays every run again from its taps and pays
// from that (backend/utils/forrest.js).
export default function ForrestBounce() {
  const [status, setStatus] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState('menu')
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const live = useRef(null)

  useEffect(() => {
    getForrest()
      .then(({ status: loaded }) => {
        setStatus(loaded)
        // A scored run still waiting (they refreshed before deciding).
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

  const changeBuddies = (buddies) => {
    setStatus((now) => ({ ...now, buddies }))
    setForrestBuddies(buddies)
      .then(({ status: next }) => setStatus(next))
      .catch((error) => setMessage(error.message))
  }

  if (loadError) {
    return (
      <ForrestPage>
        <p className={`${CARD} text-center text-white/80`}>{loadError}</p>
      </ForrestPage>
    )
  }

  return (
    <ForrestPage
      subtitle="Bounce two buddies between the trees on a seesaw, through the fruit and past the shurikens. Cash out the best runs."
      aside={
        status && (
          <div className="flex flex-wrap justify-center gap-2 text-sm font-semibold text-white/85 tabular-nums">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
              💰 {status.pp} PP · {status.ppp} P-PP
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
              💸 {status.cashOutsLeft}/{FORREST.cashOutsPerDay} cash-outs
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">🏅 Best {status.best} fruit</span>
          </div>
        )
      }
    >
      <ForrestStage live={live} buddies={status?.buddies ?? ['🐸', '🐰']} playing={view === 'playing'} onTap={tap} onOver={onOver}>
        {!status && <div className={OVERLAY}>Loading…</div>}
        {status && view === 'menu' && <Menu status={status} message={message} busy={busy} onStart={start} />}
        {view === 'sending' && (
          <div className={`${OVERLAY} bg-[#08140a]/55`}>
            <p className="font-semibold text-[#d6efd0]">Counting your fruit…</p>
          </div>
        )}
        {status && view === 'result' && result && (
          <Result result={result} status={status} busy={busy} onCashOut={cashOut} onDiscard={discard} onAgain={() => start(0)} onMenu={() => toMenu()} />
        )}
      </ForrestStage>
      {view === 'result' && message && (
        <p role="alert" className="text-center text-sm text-red-300">
          {message}
        </p>
      )}
      <p className="-mt-3 text-center text-xs text-white/50">Tap · click · Space = jump. Leaving mid-run loses the entry.</p>

      {status && <BuddyPicker buddies={status.buddies} choices={status.choices} onChange={changeBuddies} disabled={view === 'playing'} />}
      {status && <Leaderboard entries={status.leaderboard} />}
      {import.meta.env.DEV && <DevReset onDone={setStatus} />}
    </ForrestPage>
  )
}
