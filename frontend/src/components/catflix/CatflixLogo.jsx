import PetSprite from './PetSprite'
import useApi from '../../hooks/useApi'
import { getCatflixForms } from '../../services/catflix'

// The game's logo: the first registered form made in Pet Forge (the oldest),
// or null before there are any.
function firstForm(forms) {
  const made = (form) => new Date(form.createdAt ?? 0).getTime() || 0
  const list = Object.entries(forms?.registeredForms ?? {}).filter(([, form]) => forms.baseForms?.[form.baseFormId])
  list.sort(([idA, a], [idB, b]) => made(a) - made(b) || idA.localeCompare(idB))
  return list[0]?.[0] ?? null
}

// Catflix No Chill's picture on its Games page cards: your own pet, alive.
// Before your egg hatches (or logged out), the game's logo: the first
// registered form's idle animation. An X marks the spot only while Pet Forge
// has no forms at all. `pet`: undefined while it loads (an empty space the
// same size, so the card doesn't jump), null for no pet, or { name, skinId }.
export default function CatflixLogo({ pet }) {
  const forms = useApi(() => getCatflixForms(), [])
  if (pet === undefined || (!pet && forms.loading)) return <span className="block size-14" aria-hidden="true" />
  if (pet) return <PetSprite skinId={pet.skinId} size={56} label={`Your pet, ${pet.name}`} className="self-start" />
  const logo = firstForm(forms.data)
  if (logo) return <PetSprite skinId={logo} size={56} label="Catflix No Chill" className="self-start" />
  return (
    <span className="flex items-center gap-3 self-start">
      <span aria-hidden="true" className="grid size-14 place-items-center rounded-lg border border-dashed border-white/25 text-3xl leading-none text-white/45">
        ✕
      </span>
      <span className="text-sm text-white/50">placeholder logo</span>
    </span>
  )
}
