import '@fontsource/cinzel'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import GameBackdrop from '../components/GameBackdrop'
import AddQuestions from '../components/quiz/AddQuestions'
import DailyQuizPlayer from '../components/quiz/DailyQuizPlayer'
import QuizLeaderboard from '../components/quiz/QuizLeaderboard'
import QuizWheel from '../components/quiz/QuizWheel'
import MemberAvatar from '../components/profile/MemberAvatar'
import CoinIcon from '../components/wallet/CoinIcon'
import useApi from '../hooks/useApi'
import { getQuizLeaderboard, getQuizState } from '../services/quiz'
import { walletChanged } from '../services/wallet'
import { getCurrentUserId } from '../utils/currentUser'
import { formatDeadline } from '../utils/farkle'
import { QUIZ } from '../../../shared/quiz/config.js'

const CARD = 'rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
const format = (points) => Number(points).toLocaleString('en-US')

// One figure in the row at the top: a label over a number.
function Stat({ label, children, note }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-ink/40 px-3 py-3 text-center">
      <span className="text-xs font-semibold tracking-widest text-white/50 uppercase">{label}</span>
      <span className="flex items-center gap-1.5 text-xl font-bold tabular-nums text-white">{children}</span>
      {note && <span className="text-xs text-white/50">{note}</span>}
    </div>
  )
}

// /daily-quiz: the Daily Quiz. Five film questions a day (a new quiz at
// 12:00), the same for everyone, once each; then the score, this week's
// Quiz Leaderboard and the Quiz Wheel (everyone's chance in Monday's draw).
// Moderators and admins also write questions here. The home page's slide
// plays the quiz too.
export default function DailyQuiz() {
  const [params] = useSearchParams()
  const [reloads, setReloads] = useState(0)
  const state = useApi(() => getQuizState(), [reloads], { keepPrevious: true })
  const quiz = state.data
  const played = Boolean(quiz?.played)
  const board = useApi(() => getQuizLeaderboard(), [reloads, played], { enabled: played, keepPrevious: true })
  const me = getCurrentUserId()

  const finished = () => {
    setReloads((count) => count + 1)
    walletChanged()
  }

  return (
    <>
      <GameBackdrop to="#24225C" />
      <div className="mx-auto flex w-full max-w-4xl animate-page-in flex-col gap-6 px-4 py-8 motion-reduce:animate-none sm:py-12">
        <Link to="/" className="self-start text-sm text-white/60 hover:text-white">
          ← Home
        </Link>
        <header className="-mt-2 flex flex-col items-center gap-2 text-center">
          <h1 className="font-['Cinzel'] text-4xl text-white">
            Daily <span className="text-brand-gold">Quiz</span>
          </h1>
          <p className="max-w-xl text-white/60">
            {QUIZ.questions} film questions a day, the same for everyone, with a new quiz at 12:00. Every quiz point is a ticket in Monday&apos;s draw.
          </p>
        </header>

        {state.error && !quiz && <p className={`${CARD} text-center text-white/70`}>The quiz won&apos;t load. Try refreshing the page.</p>}

        {quiz && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="This week's prize" note={`Drawn ${formatDeadline(quiz.week.drawAt)}`}>
                <CoinIcon kind="ppp" size={18} /> {format(quiz.week.prize)}
              </Stat>
              <Stat label="Your points" note="A ticket each">
                {format(quiz.week.myPoints)}
              </Stat>
              <Stat label="Streak" note={`All ${quiz.week.streakDays}: +${format(quiz.week.streakBonus)} P-PP`}>
                {quiz.week.daysPlayed} / {quiz.week.streakDays}
              </Stat>
              <Stat label="Playing this week" note={`${format(quiz.week.totalPoints)} tickets in all`}>
                {format(quiz.week.players)}
              </Stat>
            </div>

            <section className={`${CARD} flex min-h-56 flex-col items-center justify-center gap-4`} aria-label="Today's quiz">
              {quiz.total === 0 ? (
                <p className="text-center text-white/70">There&apos;s no quiz today: the club hasn&apos;t logged enough films yet.</p>
              ) : played ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm font-semibold tracking-widest text-white/60 uppercase">Today&apos;s quiz</p>
                  <p className="text-3xl font-bold text-white">
                    You got <span className="text-brand-gold">{quiz.attempt.correct}</span> of {quiz.total} right
                  </p>
                  <p className="text-white/70">
                    +{quiz.attempt.points} quiz point{quiz.attempt.points === 1 ? '' : 's'}. The next quiz comes {formatDeadline(quiz.nextQuizAt)}.
                  </p>
                </div>
              ) : (
                <DailyQuizPlayer state={quiz} onFinished={finished} />
              )}
            </section>

            {played ? (
              <section className="flex flex-col gap-5 rounded-2xl border-2 border-white bg-brand-gold p-5 text-ink shadow-xl shadow-black/40 sm:p-6" aria-labelledby="quiz-leaderboard">
                <h2 id="quiz-leaderboard" className="text-center font-['Cinzel'] text-xl text-plum">
                  Quiz Leaderboard
                </h2>
                {board.data && (
                  <div className="grid items-start gap-6 md:grid-cols-[1fr_1.4fr]">
                    <QuizWheel entries={board.data.entries} myId={me} />
                    <QuizLeaderboard entries={board.data.entries} />
                  </div>
                )}
                <p className="text-center text-sm text-ink/75">
                  Points go back to 0 after each Monday&apos;s draw. Everyone who plays all {quiz.week.streakDays} quizzes of a week also gets{' '}
                  {format(quiz.week.streakBonus)} P-PP at the draw.
                </p>
              </section>
            ) : (
              quiz.total > 0 && <p className="text-center text-sm text-white/50">Play today&apos;s quiz to see the Quiz Leaderboard and the Quiz Wheel.</p>
            )}

            {quiz.lastDraw && (
              <section className={`${CARD} flex flex-col items-center gap-3 text-center`} aria-label="Last draw">
                <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">Last week&apos;s winner</p>
                <Link to={`/users/${quiz.lastDraw.winner._id}`} className="flex items-center gap-3 hover:text-brand-gold">
                  <MemberAvatar user={quiz.lastDraw.winner} />
                  <span className="text-lg font-semibold text-white">{quiz.lastDraw.winner.username}</span>
                </Link>
                <p className="flex items-center gap-1.5 font-bold text-brand-gold">
                  <CoinIcon kind="ppp" size={16} /> {format(quiz.lastDraw.prize)} P-PP
                </p>
              </section>
            )}

            {quiz.canManage && <AddQuestions startOpen={params.get('add') === '1'} />}
          </>
        )}
      </div>
    </>
  )
}
