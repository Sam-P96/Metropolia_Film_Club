import '@fontsource/bebas-neue'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import GameBackdrop from '../components/GameBackdrop'
import { backdropImage } from '../utils/gameBackdrop'
import MemberAvatar from '../components/profile/MemberAvatar'
import StealPage from '../components/steal/StealPage'
import LoanSharkMessage from '../components/steal/KingLoanShark'
import useStealSocket from '../hooks/useStealSocket'
import { answerQuestion, getAttack } from '../services/steal'
import { STEAL } from '../../../shared/steal/config.js'
import { GLASS, GOLD_BUTTON, HOVER_EASE, QUIET_BUTTON, SCROLL, STEAL_FADE, formatPp } from '../components/steal/style'

const GRACE_MS = STEAL.quiz.graceMs

// The server's clock, as near as we can tell: every answer it sends says
// what time it is there, and timers count to the server's deadlines.
function useServerClock() {
  const offset = useRef(0)
  const sync = useCallback((serverNow) => {
    if (serverNow) offset.current = new Date(serverNow).getTime() - Date.now()
  }, [])
  const now = useCallback(() => Date.now() + offset.current, [])
  return useMemo(() => ({ sync, now }), [sync, now])
}

// Ticks every 100 ms while `on`, for the timers.
function useTicker(on) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!on) return
    const timer = setInterval(() => setTick((tick) => tick + 1), 100)
    return () => clearInterval(timer)
  }, [on])
}

// Where the quiz screen goes: everything you can see of the window under
// the nav bar (spec §15: it never scrolls, on a phone too). The nav bar
// stays on top, as it is, and the page behind it can't scroll.
//
// On a phone, the keyboard covers the bottom of the window without making
// the window any smaller, so it's measured from the visual viewport (the
// part actually on screen): with the keyboard up, the quiz fits in the
// space above it, and what's being typed stays in sight. `keyboard` says
// it's up, for a tighter layout.
const KEYBOARD_PX = 120

function measureFrame(nav) {
  const viewport = window.visualViewport
  const navBottom = nav ? nav.getBoundingClientRect().bottom : 64
  const visibleTop = viewport?.offsetTop ?? 0
  const visibleBottom = visibleTop + (viewport?.height ?? window.innerHeight)
  const top = Math.round(Math.max(navBottom, visibleTop))
  return {
    top,
    height: Math.max(0, Math.round(visibleBottom - top)),
    keyboard: Boolean(viewport) && window.innerHeight - viewport.height > KEYBOARD_PX,
  }
}

function useQuizFrame() {
  const [frame, setFrame] = useState(() => ({ top: 64, height: window.innerHeight - 64, keyboard: false }))
  useLayoutEffect(() => {
    const nav = document.querySelector('nav')
    const measure = () => {
      const next = measureFrame(nav)
      setFrame((current) => (current.top === next.top && current.height === next.height && current.keyboard === next.keyboard ? current : next))
    }
    measure()
    const observer = nav ? new ResizeObserver(measure) : null
    observer?.observe(nav)
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', measure)
    viewport?.addEventListener('scroll', measure)
    window.addEventListener('resize', measure)

    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      observer?.disconnect()
      viewport?.removeEventListener('resize', measure)
      viewport?.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      html.style.overflow = before
    }
  }, [])
  return frame
}

function Options({ question, quiz, now, onPick, disabled }) {
  let options = question.options
  // The Funhouse Mirror: a new order every few seconds, worked out by the server.
  if (question.shuffles && quiz.reshuffleSeconds) {
    const turn = Math.max(0, Math.floor((now - new Date(quiz.opensAt).getTime()) / (quiz.reshuffleSeconds * 1000)))
    const order = question.shuffles[Math.min(turn, question.shuffles.length - 1)]
    options = order.map((id) => question.options.find((option) => option.id === id)).filter(Boolean)
  }
  return (
    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
      {options.map((option) => (
        <motion.button
          layout
          key={option.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(option.id)}
          // The lift through motion rather than CSS: these move with the
          // Funhouse Mirror's reshuffles, and motion owns their transform.
          whileHover={disabled ? undefined : { y: -2 }}
          whileTap={disabled ? undefined : { scale: 0.98, transition: { duration: 0.15 } }}
          transition={{ duration: 0.4, ease: HOVER_EASE, layout: { duration: 0.3, ease: HOVER_EASE } }}
          className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-base font-semibold text-white transition-[background-color,border-color,box-shadow] duration-400 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:border-brand-gold/70 hover:bg-white/10 hover:shadow-lg hover:shadow-black/30 disabled:opacity-60"
        >
          {option.avatarUrl !== undefined && <MemberAvatar user={{ username: option.label, avatarUrl: option.avatarUrl }} size="sm" />}
          <span className="min-w-0 flex-1 wrap-break-word">{option.label}</span>
        </motion.button>
      ))}
    </div>
  )
}

// A typed answer (a number or a name). The box is always in sight while
// typing: whenever the keyboard opens or the screen changes size, it's
// scrolled back into view. Its text is 18px, so phones don't zoom in on
// it, and it's read-only rather than disabled while an answer is sent, so
// the keyboard doesn't drop away and jump the screen.
function TypedAnswer({ question, onSubmit, disabled, frameHeight }) {
  const [value, setValue] = useState('')
  const input = useRef(null)
  useEffect(() => input.current?.focus({ preventScroll: true }), [])

  const showInput = useCallback(() => {
    if (document.activeElement === input.current) input.current.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [])
  // The keyboard opening, closing or changing size changes the frame.
  useEffect(() => {
    const timer = setTimeout(showInput, 50)
    return () => clearTimeout(timer)
  }, [frameHeight, showInput])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (value.trim() && !disabled) onSubmit(value.trim())
      }}
      className="flex gap-2"
    >
      <input
        ref={input}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setTimeout(showInput, 300)}
        inputMode={question.input === 'number' ? 'decimal' : 'text'}
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Your answer"
        placeholder={question.input === 'number' ? 'A number' : 'Type your answer'}
        readOnly={disabled}
        className="min-w-0 flex-1 scroll-my-3 rounded-xl border border-white/20 bg-ink/70 px-4 py-3 text-lg text-white placeholder:text-white/30 focus-visible:outline-2 focus-visible:outline-brand-gold"
      />
      <button type="submit" disabled={disabled || !value.trim()} className={GOLD_BUTTON}>
        Answer
      </button>
    </form>
  )
}

// The attacker's quiz: a countdown, then the question with its timer, one
// at a time. Nothing here decides anything; the server checks each answer.
function Quiz({ view, clock, onView }) {
  const quiz = view.quiz
  const [feedback, setFeedback] = useState(null)
  const [sending, setSending] = useState(false)
  const asked = useRef(null)
  useTicker(true)
  const now = clock.now()
  const opensAt = new Date(quiz.opensAt).getTime()
  const closesAt = new Date(quiz.closesAt).getTime()
  const open = now >= opensAt
  const frame = useQuizFrame()

  // Fetch the question when it opens, and again once its time has run out
  // (the server counts it as wrong), but only once each.
  useEffect(() => {
    const key = `${quiz.index}:${quiz.opensAt}:${open ? 'open' : 'wait'}:${now > closesAt + GRACE_MS}`
    const due = (open && !quiz.question) || now > closesAt + GRACE_MS
    if (!due || asked.current === key) return
    asked.current = key
    getAttack(view._id).then(onView, () => {})
  })

  const send = async (answer) => {
    setSending(true)
    try {
      const result = await answerQuestion(view._id, quiz.index, answer)
      const next = result.attack.quiz
      // Shown during the countdown that follows this answer, and no other.
      setFeedback({ right: result.right, retry: result.retry, key: next ? `${next.index}:${next.opensAt}` : null })
      onView(result.attack)
    } catch (failure) {
      if (failure.data?.code) getAttack(view._id).then(onView, () => {})
    } finally {
      setSending(false)
    }
  }

  const secondsLeft = Math.max(0, Math.ceil((closesAt - now) / 1000))
  const share = Math.max(0, Math.min(1, (closesAt - now) / (quiz.seconds * 1000)))
  const countdown = Math.max(0, Math.ceil((opensAt - now) / 1000))
  const question = open ? quiz.question : null
  const mine = feedback?.key === `${quiz.index}:${quiz.opensAt}` ? feedback : null
  const last = mine ?? (quiz.last ? { right: quiz.last.correct, timedOut: quiz.last.timedOut } : null)

  // Its own background, the page's gradient, so the footer and anything
  // else under it never shows through. The questions sit in the middle of
  // the space; if a long one doesn't fit, only that area scrolls, and with
  // the keyboard up everything moves to the top, just under the timer.
  return (
    <div
      className="fixed inset-x-0 z-50 flex flex-col overflow-hidden bg-ink"
      style={{ top: frame.top, height: frame.height, backgroundImage: backdropImage(STEAL_FADE), backgroundAttachment: 'fixed' }}
    >
      <div className={`mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col px-4 ${frame.keyboard ? 'gap-2 py-2' : 'gap-3 py-3 sm:py-6'}`}>
        <div className="flex shrink-0 items-center gap-3">
          {view.victim && <MemberAvatar user={view.victim} size="sm" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">Stealing from {view.victim?.username}</p>
            <p className="text-xs text-white/50">
              Question {Math.min(quiz.index + 1, view.questionCount)} of {view.questionCount} · {quiz.correct} right
              {quiz.retrying ? ' · DeLorean retry' : ''}
            </p>
          </div>
          <p className="text-right text-xs text-white/50">
            {view.percent}% · {formatPp(view.attempted)}
          </p>
        </div>

        {view.defenderItems && !frame.keyboard && (
          <p className="shrink-0 truncate rounded-lg bg-black/40 px-3 py-1.5 text-xs text-white/70">
            Marauder&apos;s Map: {view.defenderItems.length ? view.defenderItems.map((item) => item.name).join(', ') : 'nothing equipped'}
          </p>
        )}

        <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain ${SCROLL}`}>
          <AnimatePresence mode="wait">
            {!question ? (
              <motion.div key={`wait-${quiz.index}-${quiz.opensAt}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="my-auto py-2 text-center">
                {last && (
                  <p className={`mb-4 text-2xl font-bold ${last.right ? 'text-emerald-400' : 'text-brand-red'}`}>
                    {last.right ? 'Right!' : last.timedOut ? 'Out of time' : 'Wrong'}
                    {mine?.retry || quiz.retrying ? ' · the DeLorean gives you another go' : ''}
                  </p>
                )}
                <p className="text-sm tracking-widest text-white/50 uppercase">{quiz.index === 0 && !last ? 'Get ready' : 'Next question in'}</p>
                <p className="font-['Bebas_Neue'] text-9xl leading-none text-brand-gold tabular-nums">{countdown || '…'}</p>
              </motion.div>
            ) : (
              <motion.div
                key={`q-${quiz.index}-${quiz.opensAt}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={`flex flex-col py-1 ${frame.keyboard ? 'mb-auto gap-2' : 'my-auto gap-4'}`}
              >
                <div className="flex items-center gap-3">
                  <p
                    className={`font-['Bebas_Neue'] leading-none tabular-nums ${frame.keyboard ? 'text-4xl' : 'text-6xl'} ${secondsLeft <= 3 ? 'text-brand-red' : 'text-white'}`}
                    aria-live="off"
                  >
                    {secondsLeft}
                  </p>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                    <div className={`h-full rounded-full ${secondsLeft <= 3 ? 'bg-brand-red' : 'bg-brand-gold'}`} style={{ width: `${share * 100}%` }} />
                  </div>
                </div>
                <h1
                  className={`font-bold leading-snug ${frame.keyboard ? 'text-lg' : 'text-xl sm:text-2xl'} ${question.foggy ? 'italic text-white/70' : 'text-white'}`}
                >
                  {question.prompt}
                </h1>
                {question.hint && <p className={`text-sm text-white/50 ${frame.keyboard ? '' : '-mt-2'}`}>{question.hint}</p>}
                {question.input === 'choice' ? (
                  <Options question={question} quiz={quiz} now={now} onPick={send} disabled={sending} />
                ) : (
                  <TypedAnswer key={`${quiz.index}-${quiz.opensAt}`} question={question} onSubmit={send} disabled={sending} frameHeight={frame.height} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

const HEADLINES = {
  success: 'Success!',
  fail: 'Caught!',
  fizzle: 'It fizzled',
  neuralyzed: 'Neuralyzed',
}

// A player's picture on the result screen, opening their profile.
function ProfileAvatar({ user }) {
  return (
    <Link
      to={`/users/${user._id}`}
      aria-label={`${user.username}'s profile`}
      className="rounded-full transition-[scale,filter] duration-400 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:scale-105 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
    >
      <MemberAvatar user={user} size="md" />
    </Link>
  )
}

// A player's name, opening their profile; or who they were, if they've left.
function ProfileName({ user }) {
  if (!user) return 'someone who left'
  return (
    <Link to={`/users/${user._id}`} className="font-semibold text-white/80 hover:text-brand-gold">
      {user.username}
    </Link>
  )
}

// What happened, with the amounts and every durability change (spec §15).
// The two players' pictures and names open their profiles; King Loan
// Shark's picture doesn't go anywhere.
function Result({ view }) {
  const { amounts, rates, durability } = view.result
  const attacker = view.role === 'attacker'
  const crit = view.crit && view.outcome === 'success'
  const lines = []
  if (view.outcome === 'success') {
    if (attacker) {
      lines.push(['You stole', amounts.attackerGot])
      if (amounts.critBonus) lines.push(['…of which the Critical Hit', amounts.critBonus])
      if (amounts.rogueBonus) lines.push(['…of which the Rogue bonus', amounts.rogueBonus])
    } else {
      lines.push(['You lost', amounts.victimLost])
      if (amounts.wilson) lines.push(['Wilson got you back', amounts.wilson])
    }
    if (!attacker && amounts.victimLost === 0) lines.push(['The Reality Stone kept it all', 0])
  } else if (view.outcome === 'fail') {
    if (attacker) {
      lines.push(['Your fine', amounts.fine])
      if (amounts.revenge) lines.push(['The Revenge Dagger took', amounts.revenge])
      lines.push(['You paid', amounts.paid])
      if (amounts.debt) lines.push(['Left owing (your balance is negative)', amounts.debt])
    } else {
      lines.push(['Their fine paid you', amounts.defenderGot])
    }
  }

  return (
    <StealPage back={{ to: '/games/steal-and-defend/play', label: 'Steal and Defend' }} wide={false}>
      <motion.section
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${GLASS} p-6 text-center ${crit ? 'border-2 border-brand-gold shadow-[0_0_40px_rgba(250,188,63,0.45)]' : ''}`}
      >
        <div className="flex items-center justify-center gap-3">
          {view.attacker && <ProfileAvatar user={view.attacker} />}
          <span className="font-['Bebas_Neue'] text-2xl text-brand-gold">VS</span>
          {view.victim && <ProfileAvatar user={view.victim} />}
        </div>
        <p className="mt-3 text-sm text-white/60">
          <ProfileName user={view.attacker} /> → <ProfileName user={view.victim} /> · {view.percent}% · {formatPp(view.attempted)}
          {view.stone ? ` · ${view.stone === 'power' ? 'Power' : 'Soul'} Stone` : ''}
        </p>
        <h1 className={`mt-2 font-['Bebas_Neue'] text-6xl leading-none tracking-wide ${crit ? 'text-brand-gold' : view.outcome === 'success' ? 'text-emerald-400' : 'text-brand-red'}`}>
          {crit ? 'Critical Hit!' : HEADLINES[view.outcome]}
        </h1>
        {crit && <LoanSharkMessage size="lg" className="mx-auto mt-4 max-w-md" />}
        {view.outcome === 'fizzle' && <p className="mt-2 text-sm text-white/60">The Invisibility Cloak hid them before it began. No fine.</p>}
        {view.outcome === 'neuralyzed' && <p className="mt-2 text-sm text-white/60">It worked, then everyone forgot. Nothing stolen, no fine.</p>}
        {rates && (
          <p className="mt-3 text-sm text-white/70">
            {view.result.correct} right · attack {rates.attack}% − defense {rates.defense}% = {rates.success}% chance
          </p>
        )}
        {lines.length > 0 && (
          <dl className="mx-auto mt-4 grid max-w-sm grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-left text-sm">
            {lines.map(([label, amount]) => (
              <div key={label} className="contents">
                <dt className="text-white/60">{label}</dt>
                <dd className="text-right font-bold text-white tabular-nums">{formatPp(amount)}</dd>
              </div>
            ))}
          </dl>
        )}
        {view.result.takenBack && <p className="mt-3 text-xs text-white/50">Taken back when the thief turned PvP off.</p>}
      </motion.section>

      {durability.length > 0 && (
        <section className={`${GLASS} p-5`}>
          <h2 className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">Durability</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {durability.map((change, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-white/80">
                  {change.name}{' '}
                  <span className="text-xs text-white/40">
                    ({String(change.owner) === String(view.attacker?._id) ? view.attacker?.username : view.victim?.username})
                  </span>
                </span>
                <span className={change.destroyed ? 'font-bold text-brand-red' : 'text-white/60'}>
                  {change.before} → {change.after}
                  {change.destroyed ? ' · broken' : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.review && view.review.length > 0 && (
        <section className={`${GLASS} p-5`}>
          <h2 className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">The questions</h2>
          <ol className="mt-2 flex flex-col gap-3 text-sm">
            {view.review.map((row, i) => (
              <li key={i} className="border-t border-white/10 pt-2 first:border-0 first:pt-0">
                <p className="text-white">
                  <span className={row.correct ? 'text-emerald-400' : 'text-brand-red'}>{row.correct ? '✓' : '✗'}</span> {row.prompt}
                  {row.foggy && <span className="ml-1 text-xs text-white/40">(hidden by the Mind Stone)</span>}
                </p>
                <p className="text-xs text-white/50">
                  You said: {row.answers.length ? row.answers.map((answer) => (answer.timedOut ? 'nothing in time' : answer.input)).join(', then ') : '—'} · Right
                  answer: {row.rightAnswer}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex gap-2">
        <Link to="/games/steal-and-defend/play" className={GOLD_BUTTON}>
          Back to the hub
        </Link>
        <Link to="/games/steal-and-defend/shop" className={QUIET_BUTTON}>
          Shop
        </Link>
      </div>
    </StealPage>
  )
}

// The defender's view while it's being played: who, how far along, and a
// reminder that their items can still be swapped.
function UnderAttack({ view }) {
  return (
    <StealPage back={{ to: '/games/steal-and-defend/play', label: 'Steal and Defend' }} wide={false}>
      <section className={`${GLASS} border-2 border-brand-red p-6`}>
        <div className="flex items-center gap-3">
          {view.attacker && <MemberAvatar user={view.attacker} size="lg" />}
          <div>
            <p className="text-lg font-bold text-white">{view.attacker?.username} is attacking you</p>
            <p className="text-sm text-white/60">
              For {view.percent}% of your net worth ({formatPp(view.attempted)}). {view.answered} of {view.questionCount} questions done.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/70">Your defense items are read the moment they finish. You can still swap them.</p>
        <Link to="/games/steal-and-defend/play" className={`${GOLD_BUTTON} mt-4`}>
          Swap items
        </Link>
      </section>
    </StealPage>
  )
}

// One attack: the quiz while it's being played (for the attacker), the
// defender's view of it, then the result for both.
export default function StealAttack() {
  const { attackId } = useParams()
  const clock = useServerClock()
  const [view, setView] = useState(null)
  const [error, setError] = useState(null)

  const onView = useCallback(
    (next) => {
      clock.sync(next.serverNow)
      setView(next)
    },
    [clock]
  )

  const load = useCallback(() => getAttack(attackId).then(onView, setError), [attackId, onView])
  useEffect(() => {
    load()
  }, [load])

  // The defender, and anyone waiting on the result, checks every few seconds.
  const waiting = view && view.status === 'playing' && (view.role !== 'attacker' || !view.quiz)
  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(load, 3000)
    return () => clearInterval(timer)
  }, [waiting, load])
  useStealSocket((event) => {
    if (event.attackId === attackId) load()
  }, Boolean(view && view.status === 'playing'))

  if (error) {
    return (
      <StealPage back={{ to: '/games/steal-and-defend/play', label: 'Steal and Defend' }} wide={false}>
        <p className={`${GLASS} p-6 text-white/70`}>{error.status === 404 ? "That attack doesn't exist." : "Couldn't load the attack. Try refreshing."}</p>
      </StealPage>
    )
  }
  if (!view) {
    return (
      <StealPage back={{ to: '/games/steal-and-defend/play', label: 'Steal and Defend' }} wide={false}>
        <p className={`${GLASS} p-6 text-white/70`}>Loading…</p>
      </StealPage>
    )
  }
  if (view.status === 'done') return <Result view={view} />
  if (view.role === 'attacker' && view.quiz) {
    return (
      <MotionConfig reducedMotion="user">
        <GameBackdrop to={STEAL_FADE} />
        <Quiz view={view} clock={clock} onView={onView} />
      </MotionConfig>
    )
  }
  if (view.role === 'attacker') {
    return (
      <StealPage back={{ to: '/games/steal-and-defend/play', label: 'Steal and Defend' }} wide={false}>
        <p className={`${GLASS} p-6 text-white/70`}>Working out the result…</p>
      </StealPage>
    )
  }
  return <UnderAttack view={view} />
}
