import { Link } from 'react-router-dom'
import useGameFrame from '../hooks/useGameFrame'
import { getCurrentUser } from '../utils/currentUser'
import { hasAtLeast } from '../utils/permissions'

// The page itself, as the server hands it out (backend/public/pet-forge/,
// made from the prototype in shared/prototype/Pet _Forge.html).
const FORGE = '/api/pet-forge/app/'

// /admin/pet-forge: Pet Forge, the admin panel's tool for making Catflix No
// Chill's pets. Upload a base form's animations, recolour them, and register
// named forms with a rarity: those are saved on the server
// (backend/routes/petForgeRouter.js). Its other tabs (Room, Race, Run, Pet,
// Shop, Profile) are a sandbox for trying it all out, kept in this browser
// only, so nothing done there touches the real site.
//
// It's a page of its own, shown here in a frame filling the screen under the
// nav bar (it scrolls inside), so its styles and the site's never mix. Admins
// only: the server checks everything it saves, too.
export default function PetForge() {
  const frame = useGameFrame()

  if (!hasAtLeast(getCurrentUser(), 'admin')) {
    return <section className="mx-auto w-full max-w-3xl px-4 py-12 text-center text-white/70">This page is for admins only.</section>
  }

  return (
    <div className="fixed inset-x-0 z-40 flex flex-col bg-[#14121c]" style={{ top: frame.top, height: frame.height }}>
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-1.5 text-sm">
        <Link to="/admin" className="text-white/65 hover:text-white">
          ← Admin panel
        </Link>
        <span className="min-w-0 flex-1 truncate text-center text-white/55">Pet Forge: forms are saved for real; everything else here is a sandbox</span>
        <a href={FORGE} target="_blank" rel="noreferrer" className="shrink-0 text-white/65 hover:text-white">
          Open in its own tab ↗
        </a>
      </header>
      <iframe src={FORGE} title="Pet Forge" className="min-h-0 w-full flex-1 border-0" />
    </div>
  )
}
