import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import StealPage, { PvpRequired, StealTitle } from '../components/steal/StealPage'
import StealLogo from '../components/steal/StealLogo'
import HowToPlay from '../components/steal/HowToPlay'
import { GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import useApi from '../hooks/useApi'
import { getStealStatus } from '../services/steal'

const EASE = [0.22, 1, 0.36, 1]

// Steal and Defend's intro, like the other games: what it is, Play, Shop and
// How to play. Play goes to the hub, or with PvP off says how to turn it on.
// Shop goes straight to the daily shop.
export default function StealAndDefend() {
  const navigate = useNavigate()
  const [rules, setRules] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const status = useApi(getStealStatus, [])

  const play = () => {
    if (status.data && !status.data.pvp) {
      setBlocked(true)
      return
    }
    navigate('/games/steal-and-defend/play')
  }

  return (
    <StealPage wide={false}>
      <div>
        <StealLogo size="lg" />
        <h1 className="mt-4 font-['Bebas_Neue'] text-6xl leading-none tracking-wide text-white">
          <StealTitle />
        </h1>
        <p className="mt-2 max-w-xl text-white/70">
          A game of thieves and their marks. Follow someone long enough and you can try to steal a slice of their points by winning a quiz about
          them. Arm yourself, and protect your own, with items from the daily shop.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={play} disabled={status.loading} className={`${GOLD_BUTTON} min-h-13 flex-1 text-lg`}>
          Play
        </button>
        <Link to="/games/steal-and-defend/shop" className={`${QUIET_BUTTON} min-h-13 flex-1 text-lg`}>
          Shop
        </Link>
        <button type="button" onClick={() => setRules(!rules)} aria-expanded={rules} className={`${QUIET_BUTTON} min-h-13 flex-1 text-lg`}>
          How to play
        </button>
      </div>

      {blocked && <PvpRequired />}

      <AnimatePresence initial={false}>
        {rules && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, y: -16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -16, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <HowToPlay />
          </motion.div>
        )}
      </AnimatePresence>
    </StealPage>
  )
}
