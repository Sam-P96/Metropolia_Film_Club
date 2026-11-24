import { Link } from 'react-router-dom'
import PetSprite from './PetSprite'
import { timeAgo } from '../../utils/timeAgo'

const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110'
const CARD = 'relative overflow-hidden rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'

// A Catflix No Chill notification (backend/utils/catflix/gifts.js): a
// friend's cat that loves you stole some of its owner's PP for you
// (catflixGift: `actors[0]` is the owner, the PP came to you as P-PP), or
// your cat did that for a friend (catflixStolen: `actors[0]` is the friend
// who got your PP). The cat itself plays its happy animation.
// `item.catflix`: { pet, petName, skinId }.
export default function CatflixNotice({ item }) {
  const other = item.actors[0]
  const { pet, petName, skinId } = item.catflix
  const amount = (item.amount ?? 0).toLocaleString('en-US')
  const gift = item.type === 'catflixGift'
  const name = (
    <Link to={`/users/${other._id}`} className="font-semibold text-white hover:text-brand-gold">
      {other.username}
    </Link>
  )

  return (
    <article className={`${CARD} ${gift ? 'shadow-[0_0_26px_rgba(255,191,71,0.30)]' : ''}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-['Bebas_Neue'] text-xl tracking-[0.15em] text-brand-gold">
          {gift ? 'Catflix No Chill: a gift from a cat' : 'Catflix No Chill: your cat’s a thief'}
        </h2>
        <span className="text-xs text-white/45">{timeAgo(item.at)}</span>
      </div>
      <div className="flex items-center gap-4">
        {skinId && <PetSprite skinId={skinId} state="love" size={88} label={`${petName}, happy`} className="shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">
            {gift ? (
              <>
                {petName}, {name}’s cat, loves you so much it stole {amount} PP from {name} and gave it to you.
              </>
            ) : (
              <>
                Your cat {petName} loves {name} so much it took {amount} of your PP and gave it to them.
              </>
            )}
          </p>
          <p className={`font-['Bebas_Neue'] text-4xl leading-none tracking-wide ${gift ? 'text-[#9be564]' : 'text-[#ffb36b]'}`}>
            {gift ? `+${amount} P-PP` : `−${amount} PP`}
          </p>
          <Link to={gift && pet ? `/games/catflix#visit=${pet}` : '/games/catflix#pet'} className={`${BUTTON} mt-4`}>
            {gift ? `Visit ${petName}` : 'Visit your pet'}
          </Link>
        </div>
      </div>
    </article>
  )
}
