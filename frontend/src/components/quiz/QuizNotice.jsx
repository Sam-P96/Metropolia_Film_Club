import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import MemberAvatar from '../profile/MemberAvatar'
import CoinIcon from '../wallet/CoinIcon'
import { timeAgo } from '../../utils/timeAgo'
import { getCurrentUserId } from '../../utils/currentUser'

const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110'
const GLOW_SMALL = '0 0 14px 1px rgba(250,188,63,0.45)'
const GLOW_BIG = '0 0 30px 4px rgba(250,188,63,0.75)'
const format = (points) => Number(points ?? 0).toLocaleString('en-US')

// The Daily Quiz's notifications (backend/utils/notify.js):
//   quizWinner  who won Monday's draw, and how much: to every member, on
//               black glass in a glowing gold border, like a jackpot
//   quizStreak  you played all 7 of last week's quizzes: the bonus
export default function QuizNotice({ item }) {
  const reduce = useReducedMotion()

  if (item.type === 'quizStreak') {
    return (
      <article className="rounded-2xl border border-brand-gold/50 bg-plum/90 p-5 shadow-xl shadow-black/30 backdrop-blur-md sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">Daily Quiz streak</h2>
          <span className="text-xs text-white/40">{timeAgo(item.at)}</span>
        </div>
        <p className="text-lg text-white/90">You played all 7 of last week&apos;s Daily Quizzes!</p>
        <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-brand-gold">
          <CoinIcon kind="ppp" size={20} /> +{format(item.amount)} P-PP
        </p>
        <Link to="/daily-quiz" className={`${BUTTON} mt-4`}>
          This week&apos;s quiz
        </Link>
      </article>
    )
  }

  const winner = item.actors[0]
  const you = winner._id === getCurrentUserId()
  return (
    <motion.article
      initial={{ boxShadow: GLOW_SMALL }}
      animate={reduce ? { boxShadow: GLOW_BIG } : { boxShadow: [GLOW_SMALL, GLOW_BIG, GLOW_SMALL] }}
      transition={reduce ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      className="rounded-2xl border-2 border-brand-gold bg-black/75 p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-['Cinzel'] text-lg tracking-wide text-brand-gold">Daily Quiz draw</h2>
        <span className="text-xs text-white/40">{timeAgo(item.at)}</span>
      </div>
      <div className="flex items-start gap-4">
        <Link to={`/users/${winner._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
          <MemberAvatar user={winner} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">
            {you ? (
              'You won the weekly Daily Quiz draw!'
            ) : (
              <>
                <Link to={`/users/${winner._id}`} className="font-semibold text-white hover:text-brand-gold">
                  {winner.username}
                </Link>{' '}
                won the weekly Daily Quiz draw!
              </>
            )}
          </p>
          <p className="mt-1 flex items-center gap-2 font-['Cinzel'] text-4xl leading-none text-brand-gold drop-shadow-[0_0_10px_rgba(250,188,63,0.5)]">
            <CoinIcon kind="ppp" size={28} />+{format(item.amount)} P-PP
          </p>
          <Link to="/daily-quiz" className={`${BUTTON} mt-4`}>
            Play the Daily Quiz
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
