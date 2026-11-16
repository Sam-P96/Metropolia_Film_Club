import MemberAvatar from '../profile/MemberAvatar'
import { BallIcon } from './PoolChrome'

const SOLID_IDS = [1, 2, 3, 4, 5, 6, 7]
const STRIPE_IDS = [9, 10, 11, 12, 13, 14, 15]

// The two players over the table: each one's picture and name, their group
// (solids or stripes, once the table's decided) with the balls they still
// have to pocket, and whose shot it is. `players`: [{ name, user, seat }],
// in the order to show them; `game`: { balls, solids, current, status,
// winner }.
export default function ScoreBar({ players, game }) {
  const onTable = new Set(game.balls.filter((ball) => ball.on).map((ball) => ball.id))

  return (
    <div className="grid grid-cols-2 gap-3">
      {players.map((player) => {
        const seat = player.seat
        const group = game.solids === 0 || game.solids === 1 ? (game.solids === seat ? SOLID_IDS : STRIPE_IDS) : null
        const left = group ? group.filter((id) => onTable.has(id)) : []
        const turn = game.status === 'active' && game.current === seat
        const won = game.status === 'over' && game.winner === seat

        return (
          <div
            key={seat}
            className={`flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border bg-[#140a14]/80 px-3 py-3 text-center shadow-xl shadow-black/30 transition-colors ${
              won ? 'border-brand-gold' : turn ? 'border-[#ff4d8d]/80 shadow-[0_0_24px_rgba(255,77,141,0.25)]' : 'border-white/10'
            }`}
            aria-current={turn ? 'true' : undefined}
          >
            <div className="flex items-center gap-2">
              {player.user && <MemberAvatar user={player.user} size="sm" />}
              <p className="min-w-0 truncate font-semibold text-white">
                {won && <span aria-label="Winner">👑 </span>}
                {player.name}
              </p>
            </div>
            <div className="flex min-h-6 flex-wrap items-center justify-center gap-0.5" aria-label={group ? `${left.length} left to pocket` : 'Table still open'}>
              {group ? (
                left.length ? (
                  left.map((id) => <BallIcon key={id} id={id} size={18} />)
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-white/80">
                    On the <BallIcon id={8} size={18} />
                  </span>
                )
              ) : (
                <span className="text-xs text-white/50">Open table</span>
              )}
            </div>
            <p className={`text-xs ${turn ? 'font-semibold text-[#ff9ec7]' : 'text-white/50'}`}>
              {won ? 'Winner' : turn ? 'To shoot' : group ? (group === SOLID_IDS ? 'Solids' : 'Stripes') : ' '}
            </p>
          </div>
        )
      })}
    </div>
  )
}
