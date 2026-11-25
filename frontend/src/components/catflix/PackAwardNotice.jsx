import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import PackOpener from './PackOpener'
import { getCatflixMe } from '../../services/catflix'
import { timeAgo } from '../../utils/timeAgo'
import { CATFLIX } from '../../../../shared/catflix/rules.js'

const GOLD = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-50'
const QUIET = 'inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-gold/60 px-4 font-semibold text-brand-gold transition hover:bg-brand-gold/10'

// "Black & Gold Pack" -> "Black & Gold Spell Pack".
const packName = (kind) => (CATFLIX.packs[kind]?.name ?? 'Booster Pack').replace(/Pack$/, 'Spell Pack')

// The pack itself, in black and gold: foil, a gold ring, and how many cards.
function PackArt({ kind }) {
  const cards = CATFLIX.packs[kind]?.cards ?? 1
  const blackGold = kind === 'blackGold'
  return (
    <div
      aria-hidden="true"
      className={`relative flex h-28 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 shadow-[0_0_24px_rgba(250,188,63,0.45)] ${
        blackGold ? 'border-brand-gold bg-linear-to-br from-black via-[#2a2108] to-black' : 'border-brand-gold/70 bg-linear-to-br from-[#3b2a63] via-[#24124a] to-[#3b2a63]'
      }`}
    >
      <span className="flex size-9 items-center justify-center rounded-full border-2 border-brand-gold text-lg text-brand-gold">✦</span>
      <span className="font-['Bebas_Neue'] text-xs tracking-[0.2em] text-brand-gold">SPELL PACK</span>
      {cards > 1 && <span className="absolute top-1 right-1.5 font-['Bebas_Neue'] text-sm text-[#ffe9a8]">×{cards}</span>}
    </div>
  )
}

// A Catflix No Chill booster pack an admin gave them (backend/utils/catflix/
// awards.js), for attending an event (`item.eventTitle`) or from the admin
// panel: Open Now opens one right here, the game's own way (PackOpener),
// while they have any of that kind left; Go To Pet Room is the game's Pet
// room. `item.pack`: { kind, unopened }.
export default function PackAwardNotice({ item }) {
  const { kind } = item.pack
  const [unopened, setUnopened] = useState(item.pack.unopened ?? 0)
  const [opening, setOpening] = useState(false)
  const admin = item.actors[0]
  const name = packName(kind)

  // Back from the pack: how many of that kind they have now.
  const closed = useCallback(() => {
    setOpening(false)
    getCatflixMe()
      .then((me) => setUnopened(me.player?.packs?.[kind] ?? 0))
      .catch(() => {})
  }, [kind])

  return (
    <article className="relative overflow-hidden rounded-2xl border-2 border-brand-gold bg-linear-to-br from-black via-[#17130a] to-black p-5 shadow-[0_0_30px_rgba(250,188,63,0.35)] sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-['Bebas_Neue'] text-xl tracking-[0.15em] text-brand-gold">Catflix No Chill: a present</h2>
        <span className="text-xs text-white/45">{timeAgo(item.at)}</span>
      </div>
      <div className="flex items-center gap-5">
        <PackArt kind={kind} />
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">
            You have received a <strong className="text-brand-gold">{name}</strong>
            {item.eventTitle ? (
              <>
                {' '}
                for attending <strong className="text-white">{item.eventTitle}</strong>
              </>
            ) : (
              <> from {admin ? <span className="font-semibold text-white">{admin.username}</span> : 'an admin'}</>
            )}
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setOpening(true)} disabled={unopened < 1} className={GOLD} title={unopened < 1 ? 'Opened: no packs like it left' : undefined}>
              {unopened < 1 ? 'Opened' : 'Open Now'}
            </button>
            <Link to="/games/catflix#pet" className={QUIET}>
              Go To Pet Room
            </Link>
          </div>
        </div>
      </div>
      {opening && <PackOpener kind={kind} onClose={closed} />}
    </article>
  )
}
