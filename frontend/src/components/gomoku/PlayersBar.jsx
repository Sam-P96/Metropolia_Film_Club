import MemberAvatar from '../profile/MemberAvatar'
import { PieceSwatch } from './Piece'

// The two players over the board, you first: picture, name, and their
// piece as it shows on this screen. Whoever's turn it is is lit up, and
// the winner gets a crown. `players`: [{ name, user, piece: { id, invert },
// first }], `current` and `winner` as indexes into it (null for none).
export default function PlayersBar({ players, current, winner, over }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {players.map((player, i) => {
        const turn = !over && current === i
        const won = over && winner === i
        return (
          <div
            key={i}
            className={`flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
              won ? 'border-brand-gold bg-brand-gold/15' : turn ? 'border-brand-gold/70 bg-white/10' : 'border-white/10 bg-ink/40'
            }`}
            aria-current={turn ? 'true' : undefined}
          >
            {player.user ? <MemberAvatar user={player.user} size="sm" /> : null}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">
                {won && <span aria-label="Winner">👑 </span>}
                {player.name}
              </p>
              <p className="text-xs text-white/50">{turn ? 'To move' : player.first ? 'Moved first' : 'Moved second'}</p>
            </div>
            <PieceSwatch id={player.piece.id} invert={player.piece.invert} size={34} label={`${player.name}'s piece`} />
          </div>
        )
      })}
    </div>
  )
}
