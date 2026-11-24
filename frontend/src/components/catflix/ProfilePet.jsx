import { Link } from 'react-router-dom'
import PetSprite from './PetSprite'
import useApi from '../../hooks/useApi'
import { getCatflixPets } from '../../services/catflix'
import { getCurrentUser } from '../../utils/currentUser'

// A member's Catflix No Chill pet on their profile, above Stats, with a
// "Visit Pet" button into its room: a Play Date with it, or (on your own
// profile) your pet's own room. Pets are for members, so logged-out
// visitors don't see one. Nothing at all for a member without a pet,
// except on your own profile, where it points you at your free egg.
export default function ProfilePet({ userId, isOwner }) {
  const loggedIn = Boolean(getCurrentUser())
  const result = useApi(() => getCatflixPets([userId]), [userId], { enabled: loggedIn })
  if (!loggedIn || result.loading || result.error) return null
  const pet = result.data?.pets?.[userId]

  if (!pet) {
    if (!isOwner) return null
    return (
      <div className="mt-14">
        <h2 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">Pet</h2>
        <p className="text-white/60">
          No pet yet.{' '}
          <Link to="/games/catflix#pet" className="font-semibold text-brand-gold hover:text-white">
            Hatch your free egg in Catflix No Chill →
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mt-14">
      <h2 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">Pet</h2>
      <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-plum/40 p-4 shadow-xl shadow-black/40 backdrop-blur-md sm:p-5">
        <PetSprite skinId={pet.skinId} size={88} label={pet.name} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold text-white">{pet.name}</p>
          <p className="mt-0.5 text-sm text-white/50">A magical egg cat in Catflix No Chill</p>
          <Link
            to={`/games/catflix#visit=${pet._id}`}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand-gold px-5 font-bold text-ink transition hover:brightness-110"
          >
            Visit Pet
          </Link>
        </div>
      </div>
    </div>
  )
}
