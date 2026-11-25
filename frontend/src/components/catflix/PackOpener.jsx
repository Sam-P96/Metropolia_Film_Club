import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

// Opening a Catflix No Chill booster pack, the way the game's shop does it,
// in a window over the whole page: the game's own page, opened at
// #open=<kind> (backend/public/pet-forge/forge.js), goes straight into
// tearing open one of their `kind` packs. It says when it's been closed,
// and "Go to Spell Deck" takes the site to the Pet room.
export default function PackOpener({ kind, onClose }) {
  const navigate = useNavigate()

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.data?.catflix !== 'pack') return
      if (event.data.what === 'goto' && typeof event.data.to === 'string' && event.data.to.startsWith('/')) {
        onClose()
        navigate(event.data.to)
      } else if (event.data.what === 'closed') onClose()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [navigate, onClose])

  return createPortal(
    <div className="fixed inset-0 z-100 bg-[#0a0812]" role="dialog" aria-modal="true" aria-label="Open your pack">
      <iframe src={`/api/catflix/app/#open=${encodeURIComponent(kind)}`} title="Open your pack" className="h-full w-full border-0" />
    </div>,
    document.body
  )
}
