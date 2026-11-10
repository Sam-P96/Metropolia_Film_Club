import BannerStrip from '../profile/BannerStrip'
import MemberAvatar from '../profile/MemberAvatar'
import { PieceSwatch } from './Piece'

// The two players over the board, you first, like Kino Farkle's
// scoreboard: each member's review card banner behind their card, their
// picture, name, and their piece as it shows on this screen. Whoever's
// turn it is is lit up, and the winner gets a crown. `players`: [{ name,
// user, piece: { id, invert }, first }] (`user` has the banner and
// picture; Play Local has none), `current` and `winner` as indexes into it
// (null for none).
export default function PlayersBar({ players, current, winner, over }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {players.map((player, i) => {
        const turn = !over && current === i
        const won = over && winner === i
        const banner = player.user?.reviewCardBanner
        return (
          <div
            key={i}
            className={`relative isolate flex min-w-0 flex-col items-center gap-1.5 overflow-hidden rounded-2xl border bg-ink/40 px-3 py-3 text-center shadow-xl shadow-black/30 transition-colors ${
              won ? 'border-brand-gold' : turn ? 'border-brand-gold/70' : 'border-white/10'
            }`}
            aria-current={turn ? 'true' : undefined}
          >
            {banner && (
              <>
                <BannerStrip banner={banner} />
                {/* A little darker, so the name reads on any banner. */}
                <div className="pointer-events-none absolute inset-0 -z-10 bg-ink/40" />
              </>
            )}
            <div className="flex items-center justify-center gap-2">
              {player.user && <MemberAvatar user={player.user} size="sm" />}
              <PieceSwatch id={player.piece.id} invert={player.piece.invert} size={34} label={`${player.name}'s piece`} />
            </div>
            <p className="w-full truncate text-center font-semibold text-white drop-shadow">
              {won && <span aria-label="Winner">👑 </span>}
              {player.name}
            </p>
            <p className={`text-center text-xs drop-shadow ${turn ? 'font-semibold text-brand-gold' : 'text-white/60'}`}>
              {won ? 'Winner' : turn ? 'To move' : player.first ? 'Moved first' : 'Moved second'}
            </p>
          </div>
        )
      })}
    </div>
  )
}
