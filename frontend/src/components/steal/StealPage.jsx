import '@fontsource/bebas-neue'
import { Link } from 'react-router-dom'
import { MotionConfig, motion } from 'motion/react'
import GameBackdrop from '../GameBackdrop'
import { GLASS, GOLD_BUTTON, STEAL_FADE } from './style'

const EASE = [0.22, 1, 0.36, 1]

// The frame every Steal and Defend page shares: the backdrop fading from
// the club's purple into an orange glow, a link back, the title and the page.
// (The gold scrollbars are site-wide now, in index.css.)
export default function StealPage({ back = { to: '/games', label: 'Games' }, title, subtitle, actions, wide = true, children }) {
  return (
    <MotionConfig reducedMotion="user">
      <GameBackdrop to={STEAL_FADE} />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className={`mx-auto flex w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'} flex-col gap-5 px-4 py-8 sm:py-12`}
      >
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Link to={back.to} className="text-sm text-white/60 hover:text-white">
              ← {back.label}
            </Link>
            {title && <h1 className="mt-2 font-['Bebas_Neue'] text-5xl leading-none tracking-wide text-white">{title}</h1>}
            {subtitle && <p className="mt-2 max-w-2xl text-white/70">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
        {children}
      </motion.div>
    </MotionConfig>
  )
}

// The name, with "Defend" in gold like the other games.
export function StealTitle() {
  return (
    <>
      Steal and <span className="text-brand-gold">Defend</span>
    </>
  )
}

// What the game shows anyone with PvP off (spec §1).
export function PvpRequired() {
  return (
    <section className={`${GLASS} flex flex-col items-start gap-3 p-6`}>
      <p className="text-lg font-semibold text-white">Requires you to turn on PvP from your profile page</p>
      <p className="text-sm text-white/60">It&apos;s the PVP switch in Edit profile. Everyone starts as a Warrior; you can change class here once a week.</p>
      <Link to="/account" className={GOLD_BUTTON}>
        Go to your profile
      </Link>
    </section>
  )
}
