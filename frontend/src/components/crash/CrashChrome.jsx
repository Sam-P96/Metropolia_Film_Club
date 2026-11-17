import '@fontsource/bebas-neue'
import { Link } from 'react-router-dom'
import GameBackdrop from '../GameBackdrop'

// Crash's look: space green and the club's gold.
export const CRASH_BACKDROP = '#0B3A25'
export const CARD = 'rounded-2xl border border-white/10 bg-[#04140F]/80 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
export const HEADING = "font-['Bebas_Neue'] text-2xl tracking-wide text-[#B8FFE0]"
export const GOLD = '#FFD76A'

// A line climbing, dipping and climbing again, with a spark at its tip.
export function CrashLogo({ size = 30 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="shrink-0 drop-shadow-[0_0_6px_rgba(31,209,139,0.6)]">
      <path d="M3 25 L9 19 L13 22 L20 12 L23 15 L28 6" fill="none" stroke="#1FD18B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 28 H29" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M28 2.5 Q28 6 31.5 6 Q28 6 28 9.5 Q28 6 24.5 6 Q28 6 28 2.5Z" fill="#FFD76A" />
    </svg>
  )
}

export function CrashTitle() {
  return <span className="text-brand-gold">Crash</span>
}

// The lobby's page: the backdrop, a way back, the logo and title, and a
// line under it.
export default function CrashPage({ subtitle, aside, children }) {
  return (
    <>
      <GameBackdrop to={CRASH_BACKDROP} />
      <div className="mx-auto flex w-full max-w-3xl animate-page-in flex-col gap-6 px-4 py-8 motion-reduce:animate-none sm:py-12">
        <Link to="/games" className="self-start text-sm text-white/60 hover:text-white">
          ← Games
        </Link>
        <header className="-mt-2 flex flex-col items-center gap-2 text-center">
          <CrashLogo size={40} />
          <h1 className="font-['Bebas_Neue'] text-5xl leading-none tracking-wide text-white">
            <CrashTitle />
          </h1>
          {subtitle && <p className="max-w-xl text-white/65">{subtitle}</p>}
          {aside}
        </header>
        {children}
      </div>
    </>
  )
}
