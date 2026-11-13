import { timeAgo } from '../../utils/timeAgo'
import { formatPoints } from '../../hooks/useDoubleOrNothing'
import { GLASS } from './glass'

const CARD = `${GLASS} p-5`
const LETTER = { win: 'W', draw: 'D', loss: 'L' }

// One game, in a sentence: "Bea went W, D, D on 320 and joined the Waiting
// List. Pot is now 640." A win's winnings are in green.
function gameLine(play) {
  const went = `went ${play.results.map((result) => LETTER[result]).join(', ')} on ${formatPoints(play.bet)}`
  const late = play.auto ? ' (out of time)' : ''
  if (play.outcome === 'win') {
    const bonus = play.bonusWon > 0 ? ` plus the ${formatPoints(play.bonusWon)} bonus pot` : ''
    return (
      <>
        {went}
        {late} and <span className="font-semibold text-emerald-300">won {formatPoints(play.payout)} P-PP{bonus}</span>. Pot is back to{' '}
        {formatPoints(play.newBet)}.
      </>
    )
  }
  const list = play.outcome === 'ban' ? 'landed on the Ban List' : 'joined the Waiting List'
  return `${went}${late} and ${list}. Pot is now ${formatPoints(play.newBet)}.`
}

// A win stands out: a green-tinted row with a green edge. The rest keep
// the same room, so the list lines up.
const rowClass = (play) =>
  `flex gap-3 rounded-xl border px-2 py-2 ${play.type === 'game' && play.outcome === 'win' ? 'border-emerald-400/50 bg-emerald-500/15' : 'border-transparent'}`

function resetLine(play) {
  if (play.lost === 0) return `Monday reset: nothing was left in the pot. This week starts at ${formatPoints(play.seed)}.`
  return `Monday reset: ${formatPoints(play.lost)} lost. ${formatPoints(play.toBonus)} to the bonus pot, ${formatPoints(play.burned)} burned.`
}

// The latest games and Monday resets, newest first, the wins in green.
export default function RecentPlays({ recent }) {
  return (
    <section className={CARD} aria-label="Recent plays">
      <h2 className="text-xs tracking-widest text-white/50 uppercase">Recent plays</h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-white/50">Nobody has played yet. The pot is waiting.</p>
      ) : (
        <ul className="-mx-2 mt-2 flex flex-col gap-1 text-sm">
          {recent.map((play) => (
            <li key={play._id} className={rowClass(play)}>
              {play.type === 'game' ? (
                play.avatarUrl ? (
                  <img src={play.avatarUrl} alt="" className="size-7 shrink-0 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-red text-xs font-bold">
                    {play.name[0]?.toUpperCase()}
                  </span>
                )
              ) : (
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs">
                  ↺
                </span>
              )}
              <p className="min-w-0 text-white/75">
                {play.type === 'game' ? (
                  <>
                    <span className="font-semibold text-white">{play.name}</span> {gameLine(play)}
                  </>
                ) : (
                  resetLine(play)
                )}
                <span className="block text-xs text-white/40">{timeAgo(play.at)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
