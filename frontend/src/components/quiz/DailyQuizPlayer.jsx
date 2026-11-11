import { useEffect, useRef, useState } from 'react'
import { answerQuiz, startQuiz } from '../../services/quiz'
import { QUIZ } from '../../../../shared/quiz/config.js'

const GOLD = 'cursor-pointer rounded-xl bg-brand-gold px-6 py-3 text-center text-lg font-bold text-ink shadow-[0_0_24px_rgba(250,188,63,0.3)] transition hover:brightness-110 disabled:cursor-default disabled:opacity-50'

// Playing the Daily Quiz: Play, 3 seconds to get ready, then the questions
// one at a time, each with its own clock, and the score. The server asks
// the questions, keeps the clock and checks the answers (backend/utils/
// quiz.js); this only shows them. It doesn't say whether each answer was
// right: today's quiz is the same for everyone.
//   state             the quiz's state (services/quiz.js getQuizState)
//   onFinished(view)  the score came back: { result: { correct, total, points } }
//   onPlayingChange   whether it's counting down or asking (the home page's
//                     slides stay put meanwhile)
//   compact           smaller, for the home page's slide
export default function DailyQuizPlayer({ state, onFinished, onPlayingChange, compact = false }) {
  const [phase, setPhase] = useState('idle')
  const [count, setCount] = useState(QUIZ.countdownSeconds)
  const [view, setView] = useState(null)
  const [left, setLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState(null)
  const [error, setError] = useState('')
  const deadline = useRef(0)
  const sent = useRef(false)

  const playing = phase === 'countdown' || phase === 'question'
  useEffect(() => {
    onPlayingChange?.(playing)
  }, [playing, onPlayingChange])

  // The server's answer: the next question (its clock starting now), or the score.
  const show = (next) => {
    setView(next)
    setPicked(null)
    sent.current = false
    if (next.done) {
      setPhase('done')
      onFinished?.(next)
      return
    }
    deadline.current = Date.now() + next.secondsLeft * 1000
    setLeft(next.secondsLeft)
    setPhase('question')
  }

  const fail = (failure) => {
    if (failure.data?.state) show(failure.data.state)
    else {
      setError(failure.message)
      setPhase('idle')
    }
  }

  // 3, 2, 1, then the first question.
  useEffect(() => {
    if (phase !== 'countdown') return
    const timer = setTimeout(() => {
      if (count > 1) setCount(count - 1)
      else startQuiz().then(show, fail)
    }, 1000)
    return () => clearTimeout(timer)
  })

  const submit = (choice) => {
    if (sent.current || !view || view.done) return
    sent.current = true
    setBusy(true)
    setPicked(choice)
    answerQuiz(view.index, choice)
      .then(show, fail)
      .finally(() => setBusy(false))
  }

  // The clock: counts down, and when it runs out, the question goes unanswered.
  useEffect(() => {
    if (phase !== 'question') return
    const tick = setInterval(() => {
      const remaining = Math.max(0, (deadline.current - Date.now()) / 1000)
      setLeft(remaining)
      if (remaining <= 0) submit(null)
    }, 200)
    return () => clearInterval(tick)
  })

  const play = () => {
    setError('')
    setCount(QUIZ.countdownSeconds)
    setPhase('countdown')
  }

  const carrying = state?.attempt?.status === 'playing'
  const size = compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'

  if (phase === 'countdown') {
    return (
      <div className="flex flex-col items-center gap-2 text-center" aria-live="assertive">
        <p className="text-sm font-semibold tracking-widest text-white/60 uppercase">Get ready</p>
        <p key={count} className="animate-page-in font-['Cinzel'] text-7xl text-brand-gold motion-reduce:animate-none">
          {count}
        </p>
      </div>
    )
  }

  if (phase === 'question' && view) {
    const share = Math.max(0, Math.min(1, left / QUIZ.timerSeconds))
    return (
      <div className="flex w-full max-w-2xl flex-col items-center gap-4 text-center">
        <p className="text-sm font-semibold tracking-widest text-white/60 uppercase">
          Question {view.index + 1} of {view.total}
        </p>
        <h3 className={`${size} leading-tight font-bold text-white`}>{view.question.prompt}</h3>
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Time left" aria-valuemin={0} aria-valuemax={QUIZ.timerSeconds} aria-valuenow={Math.ceil(left)}>
          <div className={`h-full rounded-full transition-[width] duration-200 ease-linear ${share < 0.25 ? 'bg-brand-red' : 'bg-brand-gold'}`} style={{ width: `${share * 100}%` }} />
        </div>
        <p className="-mt-2 text-sm tabular-nums text-white/60">{Math.ceil(left)} s</p>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          {view.question.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => submit(option.id)}
              disabled={busy}
              className={`min-h-14 cursor-pointer rounded-xl border px-4 py-3 text-center text-lg font-semibold transition-colors disabled:cursor-default ${
                picked === option.id ? 'border-brand-gold bg-brand-gold text-ink' : 'border-white/20 bg-ink/60 text-white hover:border-brand-gold/60 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'done' && view?.result) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-semibold tracking-widest text-white/60 uppercase">Today&apos;s quiz</p>
        <p className={`${size} font-bold text-white`}>
          You got <span className="text-brand-gold">{view.result.correct}</span> of {view.result.total} right
        </p>
        <p className="text-white/70">
          +{view.result.points} quiz point{view.result.points === 1 ? '' : 's'} this week. A new quiz comes at 12:00.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <button type="button" onClick={play} className={GOLD}>
        {carrying ? 'Carry on with the Daily Quiz' : 'Play Daily Quiz'}
      </button>
      <p className="max-w-md text-sm text-white/60">
        {state?.total ?? QUIZ.questions} film questions, {QUIZ.timerSeconds} seconds each, once a day. You get {QUIZ.countdownSeconds} seconds to get
        ready.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
