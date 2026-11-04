import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import useStealSocket from '../../hooks/useStealSocket'
import { getCurrentUser } from '../../utils/currentUser'
import { ShieldArt } from './StealLogo'
import { LIFT } from './style'

// "You're being attacked!", on whatever page they're on, the moment an
// attack on them starts, so there's time to swap items (spec §13). Only
// for members with PVP on. Sits in the bottom corner, never over the nav bar.
export default function StealAlert() {
  const location = useLocation()
  const [alert, setAlert] = useState(null)
  // PVP is in the stored login, kept in step by Edit profile.
  const on = Boolean(getCurrentUser()?.pvp)

  useStealSocket((event) => {
    if (event.kind === 'attacked') setAlert(event)
    if (event.kind === 'resolved') setAlert((current) => (current?.attackId === event.attackId ? null : current))
  }, on)

  // Already on the game's pages: they show it themselves.
  const onGame = location.pathname.startsWith('/games/steal-and-defend')

  return (
    <AnimatePresence>
      {alert && !onGame && (
        <motion.div
          key={alert.attackId}
          role="alert"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed right-4 bottom-4 z-90 flex max-w-sm items-start gap-3 rounded-2xl border-2 border-brand-red bg-ink/90 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          <ShieldArt size={32} />
          <div className="flex-1">
            <p className="font-bold text-white">Someone is attacking you!</p>
            <p className="mt-0.5 text-sm text-white/70">You can still swap your items until they finish the quiz.</p>
            <div className="mt-3 flex gap-2">
              <Link
                to="/games/steal-and-defend/play"
                onClick={() => setAlert(null)}
                className={`rounded-lg bg-brand-gold px-3 py-1.5 text-sm font-bold text-ink ${LIFT} hover:brightness-110`}
              >
                Defend
              </Link>
              <button type="button" onClick={() => setAlert(null)} className="rounded-lg px-3 py-1.5 text-sm text-white/60 hover:text-white">
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
