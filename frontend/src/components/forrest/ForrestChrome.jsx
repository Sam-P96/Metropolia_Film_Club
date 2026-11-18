import '@fontsource/bebas-neue'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import GameBackdrop from '../GameBackdrop'

// Forrest Bounce's look: rainforest greens and bark browns.
export const FORREST_BACKDROP = '#0F4A28'
export const CARD = 'rounded-2xl border border-[#6b8f3a]/35 bg-[#0c1a0e]/80 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
export const HEADING = "font-['Bebas_Neue'] text-2xl tracking-wide text-[#b8e986]"
export const LEAF = '#9be564'

// A green glow over the page behind the game, like light through a
// rainforest canopy: two soft pools of green that breathe slowly.
function RainforestGlow() {
  const reduce = useReducedMotion()
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 75% 50% at 50% 16%, rgba(76,190,96,0.42), transparent 70%), radial-gradient(ellipse 65% 55% at 10% 85%, rgba(20,150,72,0.5), transparent 70%), radial-gradient(ellipse 60% 50% at 92% 65%, rgba(110,200,80,0.34), transparent 70%)',
      }}
      initial={{ opacity: 0 }}
      animate={reduce ? { opacity: 0.85 } : { opacity: [0.6, 1, 0.6] }}
      transition={reduce ? { duration: 1.2 } : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

// The logo: a buddy mid-bounce over a seesaw, a leaf behind.
export function ForrestLogo({ size = 40 }) {
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size * 1.6, height: size }} aria-hidden="true">
      <span className="absolute -top-1 left-0 rotate-[-20deg] opacity-80" style={{ fontSize: size * 0.6 }}>
        🌿
      </span>
      <span className="absolute top-0 left-1/2 -translate-x-1/2" style={{ fontSize: size * 0.62 }}>
        🐸
      </span>
      <span className="absolute bottom-[8%] left-[10%] h-[10%] w-[80%] rotate-[-8deg] rounded-full bg-[#b8742f] shadow-[0_0_10px_rgba(155,229,100,0.5)]" />
      <span className="absolute bottom-0 left-1/2 h-[18%] w-[16%] -translate-x-1/2 bg-[#4b506b] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
    </span>
  )
}

// "Forrest Bounce", "Bounce" in the club's gold.
export function ForrestTitle() {
  return (
    <>
      Forrest <span className="text-brand-gold">Bounce</span>
    </>
  )
}

export default function ForrestPage({ subtitle, aside, children }) {
  return (
    <>
      <GameBackdrop to={FORREST_BACKDROP} />
      <RainforestGlow />
      <div className="mx-auto flex w-full max-w-3xl animate-page-in flex-col gap-6 px-4 py-8 motion-reduce:animate-none sm:py-12">
        <Link to="/games" className="self-start text-sm text-white/60 hover:text-white">
          ← Games
        </Link>
        <header className="-mt-2 flex flex-col items-center gap-2 text-center">
          <ForrestLogo size={52} />
          <h1 className="font-['Bebas_Neue'] text-5xl leading-none tracking-wide text-white drop-shadow-[0_0_18px_rgba(155,229,100,0.35)]">
            <ForrestTitle />
          </h1>
          {subtitle && <p className="max-w-xl text-white/70">{subtitle}</p>}
          {aside}
        </header>
        {children}
      </div>
    </>
  )
}
