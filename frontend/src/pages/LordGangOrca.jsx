import '@fontsource/bebas-neue'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import GameBackdrop from '../components/GameBackdrop'
import FavoursPanel from '../components/orca/FavoursPanel'
import Chat from '../components/orca/Chat'
import { SPEAKERS } from '../components/orca/speakers'
import { GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import CoinIcon from '../components/wallet/CoinIcon'
import useCountdown, { formatCountdown } from '../hooks/useCountdown'
import { answerOrca, begOrca, getOrca, orcaDebug } from '../services/orca'
import { walletChanged } from '../services/wallet'
import { formatDeadline } from '../utils/farkle'

const CARD = 'rounded-2xl border border-white/10 bg-[#070d18]/80 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// What a beg paid, in coins.
function Paid({ paid }) {
  if (!paid || (paid.pp <= 0 && paid.ppp <= 0)) return null
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-white">
      You got
      {paid.pp > 0 && (
        <span className="inline-flex items-center gap-1">
          <CoinIcon kind="pp" size={16} /> {paid.pp} PP
        </span>
      )}
      {paid.ppp > 0 && (
        <span className="inline-flex items-center gap-1 text-brand-gold">
          <CoinIcon kind="ppp" size={16} /> {paid.ppp} P-PP
        </span>
      )}
    </p>
  )
}

// Admins only (the server sends `debug` only to them, and checks every
// tool): pretend it's another day and hour, skip the wait, force a
// question or favour mode, deal today's jobs again, complete one.
function DebugPanel({ debug, onChange }) {
  const [weekday, setWeekday] = useState(debug.fakeClock?.weekday ?? 1)
  const [hour, setHour] = useState(debug.fakeClock?.hour ?? 18)
  const [error, setError] = useState('')
  const run = (action, payload) =>
    orcaDebug(action, payload)
      .then((status) => {
        setError('')
        onChange(status)
      })
      .catch((problem) => setError(problem.message))
  const tool = 'rounded-lg border border-sky-400/50 bg-sky-950/40 px-3 py-1.5 text-sm font-semibold text-sky-200 hover:border-sky-300 hover:text-white cursor-pointer'

  return (
    <section aria-label="Admin testing tools" className="rounded-2xl border border-sky-400/40 bg-sky-950/30 p-4 text-sm text-sky-100">
      <h2 className="font-semibold tracking-widest text-sky-200 uppercase">Admin testing tools</h2>
      <p className="mt-1 text-xs text-sky-200/70">
        Only admins see this. Built up towards the secret threshold: {debug.built}. Clock: {debug.fakeClock ? `${WEEKDAYS[debug.fakeClock.weekday]} ${debug.fakeClock.hour}:00 (pretend)` : 'real'}.
        {debug.forceQuestion && ' The next beg is a question.'}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))} className="rounded-lg border border-sky-400/40 bg-black/40 px-2 py-1.5 text-white" aria-label="Pretend weekday">
          {WEEKDAYS.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
        <select value={hour} onChange={(event) => setHour(Number(event.target.value))} className="rounded-lg border border-sky-400/40 bg-black/40 px-2 py-1.5 text-white" aria-label="Pretend hour">
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, '0')}:00
            </option>
          ))}
        </select>
        <button type="button" className={tool} onClick={() => run('clock', { weekday, hour })}>
          Pretend
        </button>
        <button type="button" className={tool} onClick={() => run('clock', { weekday: null })}>
          Real clock
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={tool} onClick={() => run('skipCooldown')}>
          Skip cooldown
        </button>
        <button type="button" className={tool} onClick={() => run('resetBegs')}>
          Reset today&apos;s begs
        </button>
        <button type="button" className={tool} onClick={() => run('forceQuestion')}>
          Next beg: a question
        </button>
        <button type="button" className={tool} onClick={() => run('forceFavour')}>
          Start favour mode
        </button>
        <button type="button" className={tool} onClick={() => run('regenerateJobs')}>
          Deal today&apos;s jobs again
        </button>
        <button type="button" className={tool} onClick={() => run('completeJob')}>
          Complete a job
        </button>
        <button type="button" className={tool} onClick={() => run('endFavour')}>
          End favour mode
        </button>
      </div>
      {error && <p className="mt-2 text-red-300">{error}</p>}
    </section>
  )
}

// /games/lord-gang-orca: the mob boss's back room. While he's open (Monday
// to Friday, 16:00 to midnight, Helsinki), ask him for PP; closed, whoever's
// minding the place tells you why. His favours are always on show.
// Everything is decided on the server (backend/utils/orca/).
export default function LordGangOrca() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  // The conversation so far, this visit only.
  const [chat, setChat] = useState([])
  const nextId = useRef(0)
  const [paid, setPaid] = useState(null)
  const [busy, setBusy] = useState(false)
  const [talking, setTalking] = useState(true)
  const cooldown = useCountdown(status?.cooldownUntil)

  // New lines at the bottom of the conversation.
  const play = useCallback((steps) => {
    if (!steps.length) return
    setTalking(true)
    setChat((now) => [...now, ...steps.map((step) => ({ ...step, id: (nextId.current += 1) }))])
  }, [])

  const load = useCallback(
    () =>
      getOrca()
        .then((next) => {
          setStatus(next)
          return next
        })
        .catch((problem) => setError(problem.message)),
    []
  )

  // The first visit: his greeting or the closed story, then any news.
  useEffect(() => {
    load().then((first) => {
      if (!first) return
      const opening = first.question ? [{ type: 'bubble', speaker: 'orca', text: first.question.question }] : first.steps
      play([...opening, ...first.news])
    })
  }, [load, play])

  const ask = async () => {
    setBusy(true)
    setError('')
    setPaid(null)
    try {
      const said = await begOrca()
      play(said.steps)
      setPaid(said.paid ?? null)
      if (said.paid) walletChanged()
      await load()
    } catch (problem) {
      setError(problem.message)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const answer = async (option) => {
    setBusy(true)
    setError('')
    try {
      const said = await answerOrca(option)
      play([{ type: 'bubble', speaker: 'you', text: option }, ...said.steps])
      setPaid(said.paid ?? null)
      walletChanged()
      await load()
    } catch (problem) {
      setError(problem.message)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const portrait = SPEAKERS[status?.speaker ?? 'orca']
  const begsLeft = status ? status.begs.perDay - status.begs.used : null

  return (
    <>
      <GameBackdrop to="#0a2a4a" />
      <div className="mx-auto flex w-full max-w-5xl animate-page-in flex-col gap-6 px-4 py-8 motion-reduce:animate-none sm:py-12">
        <Link to="/games" className="self-start text-sm text-white/60 hover:text-white">
          ← Games
        </Link>
        <header className="-mt-2 flex flex-col items-center gap-2 text-center">
          <h1 className="font-['Bebas_Neue'] text-5xl leading-none tracking-wide text-white">
            Lord Gang <span className="text-brand-gold">Orca</span>
          </h1>
          <p className="max-w-xl text-white/65">King Loan Shark&apos;s rival. He doesn&apos;t lend. He gives. And then, one day, he asks.</p>
          {status && (
            <p
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                status.open ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-white/15 bg-white/5 text-white/70'
              }`}
            >
              {status.open ? 'Open now · until 00:00' : `Closed · opens ${formatDeadline(status.nextOpening)}`}
            </p>
          )}
        </header>

        {error && (
          <p role="alert" className="text-center text-sm text-red-300">
            {error}
          </p>
        )}

        {status && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className={`${CARD} flex flex-col items-center gap-4`}>
              <img
                src={portrait.src}
                alt={status.names[status.speaker]}
                className="aspect-square w-full max-w-72 rounded-2xl border-2 border-brand-gold/60 object-cover shadow-[0_0_40px_rgba(250,188,63,0.18)]"
                style={{ objectPosition: portrait.position }}
              />
              <p className="font-['Bebas_Neue'] text-2xl tracking-wide text-white">{status.names[status.speaker]}</p>
              <dl className="grid w-full grid-cols-2 gap-2 text-center text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                  <dt className="text-xs tracking-widest text-white/55 uppercase">Begs left</dt>
                  <dd className="text-lg font-bold text-white tabular-nums">
                    {begsLeft}/{status.begs.perDay}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                  <dt className="text-xs tracking-widest text-white/55 uppercase">Next beg</dt>
                  <dd className="text-lg font-bold text-white tabular-nums">{cooldown ? formatCountdown(cooldown) : 'Now'}</dd>
                </div>
              </dl>
              {status.reviews > 0 && (
                <p className="flex items-center gap-1 text-xs text-white/55">
                  A beg is worth <CoinIcon kind="pp" size={13} /> {status.begAmount} PP. Begs reset at 00:00.
                </p>
              )}
            </div>

            <div className={`${CARD} flex flex-col gap-4`}>
              <Chat messages={chat} names={status.names} onIdle={() => setTalking(false)} />
              {status.question && !talking && (
                <div className="flex flex-col gap-2" role="group" aria-label="Your answer">
                  {status.question.options.map((option) => (
                    <button key={option} type="button" disabled={busy} onClick={() => answer(option)} className={`${QUIET_BUTTON} min-h-11 justify-start text-left`}>
                      {option}
                    </button>
                  ))}
                </div>
              )}
              <Paid paid={paid} />
              <div className="mt-auto flex flex-col gap-2">
                <button
                  type="button"
                  onClick={ask}
                  disabled={busy || !status.open || Boolean(status.question)}
                  className={`${GOLD_BUTTON} min-h-13 text-lg`}
                  title={!status.open ? 'He only sees people Monday to Friday, 16:00 to midnight.' : undefined}
                >
                  {status.open ? 'Ask the boss' : 'He’s not in'}
                </button>
                {status.question && <p className="text-center text-xs text-white/55">Answer him first.</p>}
              </div>
            </div>
          </div>
        )}

        {status && <FavoursPanel favour={status.favour} />}
        {status?.debug && <DebugPanel debug={status.debug} onChange={setStatus} />}
      </div>
    </>
  )
}
