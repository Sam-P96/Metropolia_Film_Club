import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import BuddyPicker from '../components/forrest/BuddyPicker'
import ForrestPage, { CARD } from '../components/forrest/ForrestChrome'
import HowToDialog from '../components/forrest/HowToDialog'
import Leaderboard from '../components/forrest/Leaderboard'
import { devResetForrestDay, getForrest, setForrestBuddies } from '../services/forrest'
import { FORREST } from '../../../shared/forrest/rules.js'

const PLAY = "inline-flex min-h-14 flex-1 items-center justify-center rounded-2xl bg-brand-gold px-6 font-['Bebas_Neue'] text-3xl tracking-wide text-ink shadow-[0_0_30px_rgba(250,188,63,0.35)] transition hover:brightness-110"
const HOW = "inline-flex min-h-14 flex-1 cursor-pointer items-center justify-center rounded-2xl border-2 border-[#6b8f3a] bg-[#1f3a24] px-6 font-['Bebas_Neue'] text-3xl tracking-wide text-[#d6efd0] transition hover:border-[#9be564] hover:text-white"
const PILL = 'rounded-full border border-white/15 bg-white/5 px-3 py-1'

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

// Forrest Bounce's start page (Games → Forrest Bounce): Play (the game,
// pages/ForrestPlay.jsx, on a screen of its own), How to Play, the two
// buddies you bounce, and the site's best runs.
export default function ForrestBounce() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [howTo, setHowTo] = useState(false)

  useEffect(() => {
    getForrest()
      .then(({ status: loaded }) => setStatus(loaded))
      .catch((problem) => setError(problem.message))
  }, [])

  const changeBuddies = (buddies) => {
    setStatus((now) => ({ ...now, buddies }))
    setForrestBuddies(buddies)
      .then(({ status: next }) => setStatus(next))
      .catch((problem) => setError(problem.message))
  }

  return (
    <ForrestPage
      subtitle="Bounce two buddies between the trees on a seesaw, through the fruit and past the shurikens. Cash out the best runs."
      aside={
        status && (
          <div className="flex flex-wrap justify-center gap-2 text-sm font-semibold text-white/85 tabular-nums">
            <span className={PILL}>
              💰 {status.pp} PP · {status.ppp} P-PP
            </span>
            <span className={PILL}>
              💸 {status.cashOutsLeft}/{FORREST.cashOutsPerDay} cash-outs
            </span>
            <span className={PILL}>🏅 Best {status.best} fruit</span>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to="/games/forrest-bounce/play" className={PLAY}>
          Play
        </Link>
        <button type="button" onClick={() => setHowTo(true)} className={HOW}>
          How to Play
        </button>
      </div>
      {status?.waiting && (
        <p className={`${CARD} text-center text-[#d6efd0]`}>
          You&apos;ve a run of {status.waiting.score} waiting:{' '}
          <Link to="/games/forrest-bounce/play" className="font-semibold text-brand-gold underline underline-offset-4">
            cash it out or throw it away
          </Link>
          .
        </p>
      )}
      {error && (
        <p role="alert" className="text-center text-sm text-red-300">
          {error}
        </p>
      )}

      {status && <BuddyPicker buddies={status.buddies} choices={status.choices} onChange={changeBuddies} />}
      {status && <Leaderboard entries={status.leaderboard} />}
      {import.meta.env.DEV && <DevReset onDone={setStatus} />}

      <AnimatePresence>{howTo && <HowToDialog onClose={() => setHowTo(false)} />}</AnimatePresence>
    </ForrestPage>
  )
}
