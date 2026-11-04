import '@fontsource/bebas-neue'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'

import GameBackdrop from '../components/GameBackdrop'
import HowToPlay from '../components/slots/HowToPlay'
import SlotScreen from '../components/slots/SlotScreen'
import SymbolArt from '../components/slots/SymbolArt'
import GameTitle from '../components/slots/GameTitle'
import { KASINO_FADE } from '../components/slots/backdrop'
import { SLOTS } from '../../../shared/slots/config.js'

const EASE = [0.22, 1, 0.36, 1]
// The best three symbols, for the title.
const SHOWCASE = SLOTS.symbols.slice(-3).reverse().map((symbol) => symbol.key)

const BUTTON = 'flex min-h-13 flex-1 cursor-pointer items-center justify-center rounded-xl px-6 text-lg font-bold transition hover:brightness-110'

// Kino Kasino, the slot machine: first an intro (what it is, Play, How to
// play), then the machine itself, which fills the screen under the nav.
// Play fades the intro out and slides the machine in; with reduced motion
// they fade. The page fades in from the club's purple to jade green.
export default function SlotMachine() {
  const [playing, setPlaying] = useState(false)
  const [rules, setRules] = useState(false)

  return (
    <MotionConfig reducedMotion="user">
      <GameBackdrop to={KASINO_FADE} />
      <AnimatePresence mode="wait">
        {playing ? (
          <SlotScreen key="machine" />
        ) : (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:py-12"
          >
            <header>
              <Link to="/games" className="text-sm text-white/60 hover:text-white">
                ← Games
              </Link>
              <div className="mt-4 flex items-center gap-3" aria-hidden="true">
                {SHOWCASE.map((key) => (
                  <span key={key} className="grid size-16 place-items-center rounded-xl bg-dice-ivory shadow-lg shadow-black/40">
                    <SymbolArt symbolKey={key} size={48} />
                  </span>
                ))}
              </div>
              <h1 className="mt-4 font-['Bebas_Neue'] text-6xl leading-none tracking-wide text-white">
                <GameTitle />
              </h1>
              <p className="mt-2 max-w-xl text-white/70">
                Five reels, {SLOTS.paylines.length} lines, seven symbols from the films. Put some points in the machine, pull the lever, and line up
                three or more from the left. The Infinity Gauntlet links Maps and Rings, and five Kino Kaveri logos on a line is the jackpot.
              </p>
            </header>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setPlaying(true)} className={`${BUTTON} bg-brand-gold text-ink shadow-[0_0_24px_rgba(250,188,63,0.3)]`}>
                Play
              </button>
              <button
                type="button"
                onClick={() => setRules(!rules)}
                aria-expanded={rules}
                className={`${BUTTON} border border-white/20 bg-white/5 text-white`}
              >
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
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
