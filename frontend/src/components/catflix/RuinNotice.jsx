import { Link } from 'react-router-dom'
import MemberAvatar from '../profile/MemberAvatar'
import { timeAgo } from '../../utils/timeAgo'

const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ffb35c] px-4 font-bold text-[#2a1700] transition hover:brightness-110'
// Old stone: a sandstone frame round the game's dusky plum, with faint brick courses.
const STONE =
  'relative overflow-hidden rounded-2xl border-2 border-[#a8936c] bg-[linear-gradient(160deg,#2a1622_0%,#1d1219_50%,#3a2a1c_100%)] p-5 shadow-xl shadow-black/40 sm:p-6 before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(0deg,rgba(168,147,108,0.08)_0px,rgba(168,147,108,0.08)_2px,transparent_2px,transparent_22px)] before:content-[""]'

const metres = (n) => `${(n ?? 0).toLocaleString('en-US')} m`
const pp = (n) => (n ?? 0).toLocaleString('en-US')

// A Ruin Run notification (Catflix No Chill; backend/utils/notify.js), like
// Forrest Bounce's:
//   ruinCashOut  someone you follow cashed a run out: what they won or lost
//   ruinBigWin   someone cashed out 5 times their bet or more (to everyone,
//                glowing)
//   ruinBest     someone beat their own best speed (to everyone)
//   ruinRecord   someone beat the site's best speed (to everyone)
// `item.ruin`: { bet, speed, metres, net, previous }.
export default function RuinNotice({ item }) {
  const player = item.actors[0]
  const { bet, speed, net, previous } = item.ruin
  const name = (
    <Link to={`/users/${player._id}`} className="font-semibold text-white hover:text-[#ffcf3f]">
      {player.username}
    </Link>
  )
  const record = item.type === 'ruinRecord'
  const cashOut = item.type === 'ruinCashOut' || item.type === 'ruinBigWin'
  const glowing = record || item.type === 'ruinBigWin'

  let heading
  let line
  let big = null
  if (cashOut) {
    heading = item.type === 'ruinBigWin' ? 'Ruin Run: big win' : 'Ruin Run: cashed out'
    const how = net > 0 ? `and won ${pp(net)} PP` : net < 0 ? `and lost ${pp(0 - net)} PP` : 'and broke even'
    line = (
      <>
        {name} cashed out a {pp(bet)} PP run at {speed}% {how}.
      </>
    )
    big = (
      <p className={`font-['Bebas_Neue'] text-4xl leading-none tracking-wide ${net >= 0 ? 'text-[#9be564]' : 'text-[#ffb36b]'}`}>
        {net > 0 ? `+${pp(net)}` : net < 0 ? `−${pp(0 - net)}` : '±0'}
      </p>
    )
  } else if (record) {
    heading = 'Ruin Run: new site record'
    line = (
      <>
        {name} set the Ruin Run record: {speed}% speed{previous > 0 ? `, beating their old best of ${previous}%` : ''}!
      </>
    )
  } else {
    heading = 'Ruin Run: new personal best'
    line = (
      <>
        {name} beat their best: {speed}% speed, up from {previous}%.
      </>
    )
  }

  return (
    <article className={`${STONE} ${glowing ? 'shadow-[0_0_28px_rgba(255,179,92,0.45)]' : ''}`}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-2 -right-1 rotate-12 text-4xl opacity-60">
        🛕
      </span>
      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className={`font-['Bebas_Neue'] text-xl tracking-[0.15em] ${glowing ? 'text-brand-gold' : 'text-[#ffcf3f]'}`}>{heading}</h2>
          <span className="text-xs text-[#d9c3a0]/60">{timeAgo(item.at)}</span>
        </div>
        <div className="flex items-start gap-4">
          <Link to={`/users/${player._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
            <MemberAvatar user={player} size="lg" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-lg text-[#f4e9d8]">{line}</p>
            {big}
            <p className="mt-1 text-sm text-[#d9c3a0]/75">
              {speed}% speed · {metres(item.ruin.metres)}
              {cashOut && ` · ${pp(item.amount)} PP back`}
            </p>
            <Link to="/games/catflix#run" className={`${BUTTON} mt-4`}>
              Play Ruin Run
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
