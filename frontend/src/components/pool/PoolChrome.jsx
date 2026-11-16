import '@fontsource/bebas-neue'
import { Link } from 'react-router-dom'
import { ballColor } from './draw'

export const CARD = 'rounded-2xl border border-white/10 bg-[#170b18]/70 p-5 text-center shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
export const HEADING = "text-center font-['Bebas_Neue'] text-2xl tracking-wide text-[#ff9ec7]"

// A pool ball, small, for logos and score bars.
export function BallIcon({ id, size = 22 }) {
  const stripe = id > 8
  const color = ballColor(id)
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="shrink-0 drop-shadow">
      <defs>
        <clipPath id={`ball-${id}`}>
          <circle cx="12" cy="12" r="11" />
        </clipPath>
        <radialGradient id={`ball-shade-${id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#ball-${id})`}>
        <rect width="24" height="24" fill={stripe ? '#f6f1e4' : color} />
        {stripe && <rect y="6.5" width="24" height="11" fill={color} />}
        {id > 0 && <circle cx="12" cy="12" r="5.4" fill="#fbf8f0" />}
        {id > 0 && (
          <text x="12" y="12.6" textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="700" fill="#111" fontFamily="system-ui, sans-serif">
            {id}
          </text>
        )}
        <rect width="24" height="24" fill={`url(#ball-shade-${id})`} />
      </g>
    </svg>
  )
}

export function PoolLogo({ size = 26 }) {
  return (
    <span className="flex items-center -space-x-1" aria-hidden="true">
      {[11, 8, 2].map((id) => (
        <BallIcon key={id} id={id} size={size} />
      ))}
    </span>
  )
}

export function PoolTitle() {
  return (
    <>
      8 Ball <span className="bg-gradient-to-r from-[#ff4d8d] to-[#a35bff] bg-clip-text text-transparent">Pool</span>
    </>
  )
}

// Behind every 8 Ball Pool page: the club's dark ink with a red glow
// rising from one corner and a purple one from the other, slowly
// breathing (index.css .pool-glow). Fixed to the window, like the other
// games' backgrounds.
function PoolBackdrop() {
  return <div aria-hidden="true" className="pool-glow pointer-events-none fixed inset-0 -z-10 max-lg:-bottom-[10%]" />
}

// Every 8 Ball Pool page: the backdrop, a way back, then the logo, title
// and a line under it, with anything else for the header (`aside`).
export default function PoolPage({ back = { to: '/games', label: 'Games' }, subtitle, aside, wide = false, children }) {
  return (
    <>
      <PoolBackdrop />
      <div className={`mx-auto flex w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'} animate-page-in flex-col gap-6 px-3 py-8 motion-reduce:animate-none sm:px-4 sm:py-12`}>
        <Link to={back.to} className="self-start text-sm text-white/60 hover:text-white">
          ← {back.label}
        </Link>
        <header className="-mt-2 flex flex-col items-center gap-2 text-center">
          <PoolLogo />
          <h1 className="font-['Bebas_Neue'] text-5xl leading-none tracking-wide text-white">
            <PoolTitle />
          </h1>
          {subtitle && <p className="max-w-xl text-white/60">{subtitle}</p>}
          {aside}
        </header>
        {children}
      </div>
    </>
  )
}
