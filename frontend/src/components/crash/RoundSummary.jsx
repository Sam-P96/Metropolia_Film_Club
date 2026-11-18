import MemberAvatar from '../profile/MemberAvatar'
import { formatMultiplier } from '../../../../shared/crash/rules.js'

const ENDINGS = { crash: 'Crashed', cap: 'Hit the 25x cap', time: '60 seconds: time' }

// Chips shown before the rest are a "+N" (a room holds up to 30).
const SHOWN = 6

// After a round: everyone's picture, where they cashed out (or that they
// crashed) and what they won or lost, the best cash-out in gold. In a big
// round, the best few and you, then "+N".
// `summary`: the room's `last` (backend/games/crash/rooms.js).
export default function RoundSummary({ summary, myId }) {
  const ranked = [...summary.players].sort((a, b) => b.net - a.net)
  const shown = ranked.slice(0, SHOWN)
  const mine = ranked.find((player) => player.userId === myId)
  if (mine && !shown.includes(mine)) shown[SHOWN - 1] = mine
  const more = summary.players.length - shown.length
  return (
    <div className="flex flex-col gap-1.5" aria-label="The last round">
      <p className="text-center text-xs font-semibold tracking-widest text-white/55 uppercase">
        Last round: {ENDINGS[summary.endedBy] ?? 'Over'}
        {summary.endedBy === 'crash' ? '' : ` at ${formatMultiplier(summary.multiplier)}`}
        {summary.protected && <span className="text-[#FFD76A]"> · protected: half of every loss back</span>}
        {summary.kind === 'allIn' && <span className="text-[#FFD76A]"> · all in</span>}
      </p>
      <ul className="flex flex-wrap justify-center gap-2">
        {shown.map((player) => {
          const best = summary.best === player.userId
          const won = player.net > 0
          return (
            <li
              key={player.userId}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${
                best ? 'border-[#FFD76A] bg-[#FFD76A]/15 shadow-[0_0_18px_rgba(255,215,106,0.3)]' : 'border-white/10 bg-white/5'
              }`}
            >
              <span className={player.cashedAt === null ? 'grayscale' : ''}>
                <MemberAvatar user={player.user} size="sm" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="max-w-24 truncate text-xs text-white/70">{player.userId === myId ? 'You' : player.user?.username}</span>
                <span className="text-sm font-bold tabular-nums">
                  <span className={best ? 'text-[#FFD76A]' : player.cashedAt === null ? 'text-[#FF8A8A]' : 'text-white'}>
                    {player.cashedAt === null ? 'Crashed' : formatMultiplier(player.cashedAt)}
                  </span>{' '}
                  <span className={won ? 'text-[#1FD18B]' : player.net < 0 ? 'text-[#FF8A8A]' : 'text-white/60'}>
                    {won ? `+${player.net}` : player.net}
                  </span>
                </span>
              </span>
            </li>
          )
        })}
        {more > 0 && <li className="self-center text-sm font-semibold text-white/60">+{more} more</li>}
      </ul>
    </div>
  )
}
