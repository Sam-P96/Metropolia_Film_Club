import '@fontsource/bebas-neue'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import GameBackdrop from '../components/GameBackdrop'
import HowToPlay from '../components/poker/HowToPlay'
import PokerLogo from '../components/poker/PokerLogo'
import { GOLD, POKER_FADE, QUIET } from '../components/poker/style'
import useApi from '../hooks/useApi'
import { getPokerTable } from '../services/poker'
import { POKER } from '../../../shared/poker/config.js'

const EASE = [0.22, 1, 0.36, 1]

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

// Who's at the table right now, in a line.
function tableLine(table) {
  if (!table) return null
  if (!table.members) return 'The table is empty. Sit down and three bots join you.'
  const parts = [plural(table.members, 'member'), table.bots ? plural(table.bots, 'bot') : null].filter(Boolean)
  return `${parts.join(' and ')} at the table${table.queue ? `, ${table.queue} waiting` : ''}.`
}

// Kino Poker's intro, like the other games: what it is, Play, and How to
// play. Play goes to the table (games/poker/table).
export default function Poker() {
  const navigate = useNavigate()
  const [rules, setRules] = useState(false)
  const table = useApi(getPokerTable, [])
  const line = tableLine(table.data)

  return (
    <MotionConfig reducedMotion="user">
      <GameBackdrop to={POKER_FADE} />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:py-12"
      >
        <div>
          <Link to="/games" className="text-sm text-white/60 hover:text-white">
            ← Games
          </Link>
          <div className="mt-4">
            <PokerLogo size="lg" />
          </div>
          <h1 className="mt-4 font-['Bebas_Neue'] text-6xl leading-none tracking-wide text-white">
            Kino <span className="text-brand-gold">Poker</span>
          </h1>
          <p className="mt-1 font-['Bebas_Neue'] text-2xl tracking-wide text-white/60">{POKER.variant}</p>
          <p className="mt-2 max-w-xl text-white/70">
            Pull up a chair at the club&apos;s card table. Five cards each, one draw, and no limit. Play the regulars, King Loan Shark, Kaveri and
            Bret Maverick, or take the seats from them with friends.
          </p>
          <AnimatePresence>
            {line && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-brand-gold">
                {line}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => navigate('/games/poker/table')} className={`${GOLD} min-h-13 flex-1 text-lg`}>
            Play
          </button>
          <button type="button" onClick={() => setRules(!rules)} aria-expanded={rules} className={`${QUIET} min-h-13 flex-1 text-lg`}>
            How to play
          </button>
        </div>

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
      </motion.div>
    </MotionConfig>
  )
}
