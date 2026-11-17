import '@fontsource/bebas-neue'
import { Link } from 'react-router-dom'
import GameBackdrop from '../GameBackdrop'

// Box Office Crash's look: space green and the club's gold.
export const CRASH_BACKDROP = '#0B3A25'
export const CARD = 'rounded-2xl border border-white/10 bg-[#04140F]/80 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
export const HEADING = "font-['Bebas_Neue'] text-2xl tracking-wide text-[#B8FFE0]"
export const GOLD = '#FFD76A'

// The logo: a chart line climbing, dipping and shooting up to an arrow,
// a spark at its tip, and "STONKS" stamped across it, meme-style (white
// Impact with a black outline). `size` is its height; it's wider than tall.
export function CrashLogo({ size = 30 }) {
  return (
    <svg viewBox="0 0 96 40" width={(size * 96) / 40} height={size} aria-hidden="true" className="shrink-0 drop-shadow-[0_0_6px_rgba(31,209,139,0.5)]">
      <path d="M4 36 H92" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M6 30 L20 21 L28 26 L44 15 L52 19 L80 6" fill="none" stroke="#1FD18B" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M80 6 L71 6.5 M80 6 L76.5 14" fill="none" stroke="#1FD18B" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M88 1 Q88 5 92 5 Q88 5 88 9 Q88 5 84 5 Q88 5 88 1Z" fill="#FFD76A" />
      <text
        x="47"
        y="35"
        textAnchor="middle"
        transform="rotate(-5 47 31)"
        fontFamily="Impact, 'Arial Black', 'Helvetica Neue', sans-serif"
        fontSize="15"
        fontWeight="900"
        letterSpacing="0.5"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="2.6"
        paintOrder="stroke"
      >
        STONKS
      </text>
    </svg>
  )
}

// "Box Office Crash", "Crash" in the club's gold, like Box Office Scratch.
export function CrashTitle() {
  return (
    <>
      Box Office <span className="text-brand-gold">Crash</span>
    </>
  )
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
          <CrashLogo size={56} />
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
