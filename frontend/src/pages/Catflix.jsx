import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useGameFrame from '../hooks/useGameFrame'
import { walletChanged } from '../services/wallet'

// The game's own page, as the server hands it out: Pet Forge's page
// (backend/public/pet-forge/), which plays the real game when it's opened
// at this address (forge.js "Catflix No Chill").
const GAME = '/api/catflix/app/'

// /games/catflix: Catflix No Chill, the pet game. It opens in Explore (the
// Room Room, on the School), or wherever the link says: #pet (your pet's
// room), #race (Nekomusume: Kitty Race), #run (Ruin Run), #shop,
// or #visit=<a pet's id> ("Visit Pet" on a profile: a Play Date in that
// pet's room, or your own pet's room if it's yours). The game is a page of its own, shown here
// in a frame filling the screen under the nav bar, so its pixel-art look and
// the site's never mix. When it spends PP, it says so, and the wallet in the
// nav bar catches up.
export default function Catflix() {
  const frame = useGameFrame()
  const { hash } = useLocation()
  const tab = ['#room', '#pet', '#race', '#run', '#shop'].includes(hash) || /^#visit=[0-9a-f]{24}$/.test(hash) ? hash : '#room'

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin === window.location.origin && event.data?.catflix === 'wallet') walletChanged()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div className="fixed inset-x-0 z-40 flex flex-col bg-[#14121c]" style={{ top: frame.top, height: frame.height }}>
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-1.5 text-sm">
        <Link to="/games" className="text-white/65 hover:text-white">
          ← Games
        </Link>
        <span className="min-w-0 flex-1 truncate text-center font-semibold text-white/80">Catflix No Chill</span>
      </header>
      <iframe key={tab} src={GAME + tab} title="Catflix No Chill" className="min-h-0 w-full flex-1 border-0" />
    </div>
  )
}
