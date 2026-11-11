import '@fontsource/cinzel'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import PosterMarquee from './PosterMarquee'
import ResonanceCard from '../resonance/ResonanceCard'
import DailyQuizPlayer from '../quiz/DailyQuizPlayer'
import QuizLeaderboard from '../quiz/QuizLeaderboard'
import QuizWheel from '../quiz/QuizWheel'
import CoinIcon from '../wallet/CoinIcon'
import useApi from '../../hooks/useApi'
import { noteSoulMatches } from '../../hooks/useSoulResonance'
import { getTrending } from '../../services/tmdb'
import { getResonanceSuggestions } from '../../services/resonance'
import { getQuizLeaderboard, getQuizState } from '../../services/quiz'
import { getCurrentUser, getCurrentUserId } from '../../utils/currentUser'
import { hasAtLeast } from '../../utils/permissions'

// This was the placeholder file before we were able to use getTrending function
// const placeholder = Array.from({ length: 20 }, (_, i) => ({
//   id: i + 1,
//   title: `Film ${i + 1}`,
//   poster_path: null,
// }))

// How far a swipe has to go, or how fast, to change slides.
const SWIPE_PX = 60
const SWIPE_SPEED = 500

const primaryButton =
  'rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange'

const secondaryButton =
  'rounded-md border border-white/20 bg-white/5 px-6 py-3 font-medium text-white backdrop-blur-sm transition-colors hover:border-brand-gold/60 hover:bg-white/10'

// Slides come in from the side they're moving towards.
const SLIDE = {
  enter: ({ direction, reduce }) => ({ x: reduce ? 0 : `${direction * 35}%`, opacity: 0 }),
  centre: { x: 0, opacity: 1 },
  exit: ({ direction, reduce }) => ({ x: reduce ? 0 : `${direction * -35}%`, opacity: 0 }),
}

function rotate(array, by) {
  if (array.length === 0) return array
  const offset = by % array.length
  return [...array.slice(offset), ...array.slice(0, offset)]
}

// The home page's banner: trending posters scrolling behind a few slides.
// The welcome is always there. A logged-in member who can use Resonance
// and has a match at 75% or more also gets one of them, picked at random,
// on a Resonance card. A logged-in member also gets the Daily Quiz: the
// first slide until they've played today's (a new one comes at 12:00),
// the last after. It plays right here; while it does, the slides stay put.
// Once they've played, it shows their score and the Quiz Leaderboard.
// Arrows on the sides change slides on a computer; on a phone it's a
// swipe, with dots to show where you are.
function Hero({ isAuthenticated }) {
  const reduce = useReducedMotion()
  const [movies, setMovies] = useState([])

  useEffect(() => {
    getTrending()
      .then(setMovies)
      .catch((error) => console.error(error))
  }, [])

  const suggestions = useApi(getResonanceSuggestions, [isAuthenticated], { enabled: Boolean(isAuthenticated) })
  const pool = (isAuthenticated && suggestions.data?.matches) || []

  // Fresher than the Soul map, if they've just been worked out.
  useEffect(() => {
    noteSoulMatches(suggestions.data?.matches)
  }, [suggestions.data])
  const quiz = useApi(getQuizState, [isAuthenticated], { enabled: Boolean(isAuthenticated) })
  const quizState = isAuthenticated ? quiz.data : null
  // Played today, as the page opened: the quiz goes last rather than first.
  const quizFirst = Boolean(quizState && !quizState.played && quizState.total > 0)
  const [playing, setPlaying] = useState(false)
  const [score, setScore] = useState(null)
  const manager = hasAtLeast(getCurrentUser(), 'moderator')

  // Played today (before or just now): their score, and the leaderboard.
  const done = Boolean(score) || Boolean(quizState?.played)
  const result = score?.result ?? (quizState?.played ? { correct: quizState.attempt.correct, total: quizState.total } : null)
  const board = useApi(getQuizLeaderboard, [isAuthenticated, done], { enabled: Boolean(isAuthenticated) && done })

  const others = pool.length > 0 ? ['welcome', 'resonance'] : ['welcome']
  const slides = !quizState ? others : quizFirst ? ['quiz', ...others] : [...others, 'quiz']
  // Logged in: wait for the quiz, so the slides don't change under them.
  const ready = !isAuthenticated || !quiz.loading

  const [slide, setSlide] = useState(0)
  const [direction, setDirection] = useState(1)
  const index = Math.min(slide, slides.length - 1)

  const go = (step) => {
    if (playing) return
    setDirection(step)
    setSlide((index + step + slides.length) % slides.length)
  }

  // Who's on the card: random to begin with, then "Show more" picks
  // someone else from the pool.
  const [seed] = useState(() => Math.random())
  const [pickedId, setPickedId] = useState(null)
  const match = pool.find((entry) => entry.user._id === pickedId) ?? pool[Math.floor(seed * pool.length)]

  const showMore = () => {
    const others = pool.filter((entry) => entry.user._id !== match.user._id)
    if (others.length) setPickedId(others[Math.floor(Math.random() * others.length)].user._id)
  }

  // A swipe ends with the finger lifting off whatever it started on, which
  // would count as a tap on it (the card is a link). The swipe swallows it.
  const swiped = useRef(false)

  return (
    <section className="relative overflow-hidden">
      <div className="h-[630px] space-y-4 opacity-40">
        <PosterMarquee movies={rotate(movies, 0)} direction="left" speed={100} />
        <PosterMarquee movies={rotate(movies, 7)} direction="right" speed={100} />
        <PosterMarquee movies={rotate(movies, 14)} direction="left" speed={100} />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-ink/70 via-ink/50 to-ink" />

      <AnimatePresence initial={false} custom={{ direction, reduce }}>
        {ready && (
        <motion.div
          key={slides[index]}
          custom={{ direction, reduce }}
          variants={SLIDE}
          initial="enter"
          animate="centre"
          exit="exit"
          transition={{ duration: reduce ? 0.2 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          drag={slides.length > 1 && !playing ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          dragSnapToOrigin
          onDragStart={() => {
            swiped.current = true
          }}
          onDragEnd={(event, info) => {
            if (info.offset.x < -SWIPE_PX || info.velocity.x < -SWIPE_SPEED) go(1)
            else if (info.offset.x > SWIPE_PX || info.velocity.x > SWIPE_SPEED) go(-1)
            setTimeout(() => {
              swiped.current = false
            })
          }}
          onClickCapture={(event) => {
            if (!swiped.current) return
            event.preventDefault()
            event.stopPropagation()
          }}
          className="absolute inset-0 flex flex-col items-center justify-center px-5 pt-6 pb-6 text-center sm:px-8"
        >
          {slides[index] === 'quiz' ? (
            // The hero is a fixed height (630px), on a phone too. Everything
            // here fits inside it: the quiz and the leaderboard take the
            // room that's left and scroll inside themselves if they need
            // more, so long names or a long question never spill out.
            <div className={`flex max-h-full min-h-0 w-full flex-col items-center ${done ? 'max-w-3xl gap-3' : 'max-w-2xl gap-4'}`}>
              <h2 className="shrink-0 text-sm font-semibold tracking-widest text-brand-gold uppercase">Daily Quiz</h2>
              {done ? (
                <>
                  <p className="shrink-0 text-xl font-bold text-white sm:text-2xl">
                    You got <span className="text-brand-gold">{result.correct}</span> of {result.total} right today
                    <span className="block text-sm font-normal text-white/60">A new quiz comes at 12:00.</span>
                  </p>
                  {/* The Quiz Leaderboard, on translucent black glass: the
                      top 3, and you after them if you're further down. The
                      wheel beside it on a computer. */}
                  <div className="flex min-h-0 w-full flex-col rounded-2xl border border-white/15 bg-black/45 p-3 text-left text-white shadow-xl shadow-black/40 backdrop-blur-md sm:p-4">
                    <h3 className="mb-2 shrink-0 text-center font-['Cinzel'] text-lg text-brand-gold">Quiz Leaderboard</h3>
                    {board.data ? (
                      <div className="grid min-h-0 items-center gap-4 overflow-y-auto overscroll-contain md:grid-cols-[13rem_1fr]">
                        <div className="hidden md:block">
                          <QuizWheel entries={board.data.entries} myId={getCurrentUserId()} onDark />
                        </div>
                        <QuizLeaderboard entries={board.data.entries} limit={3} myId={getCurrentUserId()} />
                      </div>
                    ) : (
                      <p className="py-6 text-center text-sm text-white/60">{board.error ? "The leaderboard won't load right now." : 'Loading…'}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {!playing && !score && (
                    <p className="flex max-w-xl shrink-0 flex-wrap items-center justify-center gap-1.5 text-lg text-white/70">
                      Every point is a ticket in Monday&apos;s draw for
                      <CoinIcon kind="ppp" size={16} />
                      <span className="font-bold text-brand-gold">{quizState.week.prize.toLocaleString('en-US')} P-PP</span>
                    </p>
                  )}
                  <div className="flex min-h-0 w-full flex-col items-center overflow-y-auto overscroll-contain">
                    <DailyQuizPlayer state={quizState} compact onPlayingChange={setPlaying} onFinished={setScore} />
                  </div>
                </>
              )}
              {!playing && (
                <div className="mt-2 flex shrink-0 flex-wrap justify-center gap-3">
                  <Link to="/daily-quiz" className={done ? primaryButton : secondaryButton}>
                    {done ? 'Full Quiz Leaderboard' : 'Quiz Leaderboard'}
                  </Link>
                  {manager && (
                    <>
                      <Link to="/daily-quiz?add=1" className={secondaryButton}>
                        Add Questions
                      </Link>
                      <Link to="/daily-quiz/questions" className={secondaryButton}>
                        View All Questions
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : slides[index] === 'welcome' ? (
            <>
              <h1 className="mb-4 text-5xl font-bold text-white">
                Welcome to Kino <span className="text-brand-gold">Kaverit</span>
              </h1>
              <p className="max-w-xl text-lg text-white/70">
                Find club events and screenings near you.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/movie_reviews" className={primaryButton}>
                  Post Reviews
                </Link>
                <Link to="/games" className={secondaryButton}>
                  Play Games
                </Link>
              </div>
            </>
          ) : (
            <div className="w-full max-w-xl">
              <h2 className="mb-3 text-sm font-semibold tracking-widest text-brand-gold uppercase">
                This Person Resonates With You
              </h2>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={match.user._id}
                  initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduce ? 0 : -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <ResonanceCard match={match} />
                </motion.div>
              </AnimatePresence>

              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {pool.length > 1 && (
                  <button type="button" onClick={showMore} className={secondaryButton}>
                    Show Another
                  </button>
                )}
                <Link to="/resonance" className={primaryButton}>
                  Find more friends
                </Link>
              </div>
            </div>
          )}
        </motion.div>
        )}
      </AnimatePresence>

      {slides.length > 1 && ready && !playing && (
        <>
          <SlideArrow side="left" label="Previous slide" onClick={() => go(-1)} />
          <SlideArrow side="right" label="Next slide" onClick={() => go(1)} />

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2 md:hidden">
            {slides.map((name, dot) => (
              <button
                key={name}
                type="button"
                aria-label={`Slide ${dot + 1} of ${slides.length}`}
                aria-current={dot === index}
                onClick={() => go(dot - index)}
                className={`h-2 rounded-full transition-all ${dot === index ? 'w-5 bg-brand-gold' : 'w-2 bg-white/35'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

// The round arrow on either edge, on a computer. On a phone it's a swipe.
function SlideArrow({ side, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-ink/60 text-white shadow-lg shadow-black/40 backdrop-blur-md transition hover:border-brand-gold/60 hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold active:scale-95 md:flex ${
        side === 'left' ? 'left-4 lg:left-8' : 'right-4 lg:right-8'
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={side === 'left' ? 'rotate-180' : undefined}
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </button>
  )
}

export default Hero
