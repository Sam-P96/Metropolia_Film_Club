import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import MemberAvatar from '../profile/MemberAvatar'
import CoinIcon from '../wallet/CoinIcon'
import { CrashLogo } from './CrashChrome'
import { timeAgo } from '../../utils/timeAgo'
import { formatMultiplier } from '../../../../shared/crash/rules.js'

const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110'
const GLOW_SMALL = '0 0 14px 1px rgba(31,209,139,0.45)'
const GLOW_BIG = '0 0 30px 4px rgba(31,209,139,0.75)'

// A Box Office Crash notification (backend/utils/notify.js noteCrashResults):
//   crashBigWin  someone cashed out at 10x or more: sent to every member,
//                glowing like the other big wins
//   crashResult  someone you follow won or lost a round
// `item.crash`: { multiplier (null: it crashed on them), bet, net, endedBy }.
export default function CrashNotice({ item }) {
  const reduce = useReducedMotion()
  const player = item.actors[0]
  const { multiplier, bet, net } = item.crash
  const big = item.type === 'crashBigWin'
  const name = (
    <Link to={`/users/${player._id}`} className="font-semibold text-white hover:text-brand-gold">
      {player.username}
    </Link>
  )

  let text
  if (multiplier === null && 0 - net < bet) text = <>{name} rode it too long: the round crashed, and they lost {0 - net} (a full room protected the other {bet + net}).</>
  else if (multiplier === null) text = <>{name} rode it too long: the round crashed, and they lost {bet}.</>
  else if (net > 0) text = <>{name} cashed out at {formatMultiplier(multiplier)} and won {net}.</>
  else if (net < 0) text = <>{name} cashed out at {formatMultiplier(multiplier)} and lost {0 - net}.</>
  else text = <>{name} cashed out at {formatMultiplier(multiplier)} and broke even.</>

  const body = (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CrashLogo size={22} />
        <h2 className={`font-['Bebas_Neue'] text-xl tracking-[0.2em] ${big ? 'text-[#1FD18B]' : 'text-brand-gold'}`}>{big ? 'Box Office Crash: big win' : 'Box Office Crash'}</h2>
        <span className="text-xs text-white/40">{timeAgo(item.at)}</span>
      </div>
      <div className="flex items-start gap-4">
        <Link to={`/users/${player._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
          <MemberAvatar user={player} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          {big ? (
            <>
              <p className="text-lg text-white/90">
                {name} cashed out at {formatMultiplier(multiplier)} on Box Office Crash!
              </p>
              <p className="mt-1 flex items-center gap-2 font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-[#1FD18B] drop-shadow-[0_0_10px_rgba(31,209,139,0.5)]">
                <CoinIcon kind="ppp" size={26} /> +{net}
              </p>
              <p className="mt-1 text-sm text-white/55">
                A bet of {bet} came back as {item.amount}.
              </p>
            </>
          ) : (
            <p className="text-lg text-white/90">{text}</p>
          )}
          <Link to="/games/crash" className={`${BUTTON} mt-4`}>
            Play Box Office Crash
          </Link>
        </div>
      </div>
    </>
  )

  if (!big) return <article className="rounded-2xl border border-white/10 bg-[#04140F]/90 p-5 shadow-xl shadow-black/30 backdrop-blur-md sm:p-6">{body}</article>
  return (
    <motion.article
      initial={{ boxShadow: GLOW_SMALL }}
      animate={reduce ? { boxShadow: GLOW_BIG } : { boxShadow: [GLOW_SMALL, GLOW_BIG, GLOW_SMALL] }}
      transition={reduce ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      className="rounded-2xl border-2 border-[#1FD18B] bg-black/75 p-5 backdrop-blur-xl sm:p-6"
    >
      {body}
    </motion.article>
  )
}
