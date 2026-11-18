import { Link } from 'react-router-dom'
import MemberAvatar from '../profile/MemberAvatar'
import { ForrestLogo } from './ForrestChrome'
import { timeAgo } from '../../utils/timeAgo'

const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#6b8f3a] bg-[#2f5a1f] px-4 font-bold text-[#eaffd6] transition hover:bg-[#3b6f27]'
// Bark and moss: a brown wood frame round a deep green, with a faint grain.
const WOOD =
  'relative overflow-hidden rounded-2xl border-2 border-[#8b5a2b] bg-[linear-gradient(160deg,#16301a_0%,#1d2a14_45%,#3a2716_100%)] p-5 shadow-xl shadow-black/40 sm:p-6 before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(100deg,rgba(139,90,43,0.10)_0px,rgba(139,90,43,0.10)_2px,transparent_2px,transparent_14px)] before:content-[""]'

// A Forrest Bounce notification (backend/utils/notify.js), sent to every
// member:
//   forrestCashOut  someone cashed a run out: what they won or lost
//   forrestBest     someone beat their own best run
//   forrestRecord   someone beat the site's best run
// `item.forrest`: { entry, score, fruit, level, net, previous }.
export default function ForrestNotice({ item }) {
  const player = item.actors[0]
  const { entry, score, fruit, level, net, previous } = item.forrest
  const name = (
    <Link to={`/users/${player._id}`} className="font-semibold text-white hover:text-[#b8e986]">
      {player.username}
    </Link>
  )
  const record = item.type === 'forrestRecord'

  let heading
  let line
  let big = null
  if (item.type === 'forrestCashOut') {
    heading = 'Forrest Bounce: cashed out'
    line =
      net > 0 ? (
        <>
          {name} cashed out a {entry} point game and won {net}.
        </>
      ) : net < 0 ? (
        <>
          {name} cashed out a {entry} point game and lost {0 - net}.
        </>
      ) : (
        <>
          {name} cashed out a {entry} point game and broke even.
        </>
      )
    big = (
      <p className={`font-['Bebas_Neue'] text-4xl leading-none tracking-wide ${net >= 0 ? 'text-[#9be564]' : 'text-[#ffb36b]'}`}>
        {net > 0 ? `+${net}` : net < 0 ? `−${0 - net}` : '±0'}
      </p>
    )
  } else if (record) {
    heading = 'Forrest Bounce: new site record'
    line = (
      <>
        {name} set the Forrest Bounce record: {fruit} fruit{previous > 0 ? `, beating their old best of ${previous}` : ''}!
      </>
    )
  } else {
    heading = 'Forrest Bounce: new personal best'
    line = (
      <>
        {name} beat their best: {fruit} fruit, up from {previous}.
      </>
    )
  }

  return (
    <article className={`${WOOD} ${record ? 'shadow-[0_0_28px_rgba(155,229,100,0.45)]' : ''}`}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-2 -right-1 rotate-12 text-4xl opacity-70">
        🌿
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-3 left-2 -rotate-12 text-3xl opacity-50">
        🍃
      </span>
      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ForrestLogo size={22} />
          <h2 className={`font-['Bebas_Neue'] text-xl tracking-[0.15em] ${record ? 'text-brand-gold' : 'text-[#b8e986]'}`}>{heading}</h2>
          <span className="text-xs text-[#d9c7a8]/60">{timeAgo(item.at)}</span>
        </div>
        <div className="flex items-start gap-4">
          <Link to={`/users/${player._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
            <MemberAvatar user={player} size="lg" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-lg text-[#f3ead8]">{line}</p>
            {big}
            <p className="mt-1 text-sm text-[#d9c7a8]/75">
              {score} points · {fruit} fruit · level {level}
              {item.type === 'forrestCashOut' && ` · ${item.amount ?? 0} back`}
            </p>
            <Link to="/games/forrest-bounce" className={`${BUTTON} mt-4`}>
              Play Forrest Bounce
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
