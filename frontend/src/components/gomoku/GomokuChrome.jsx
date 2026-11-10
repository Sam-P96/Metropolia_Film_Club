import '@fontsource/cinzel'
import { Link } from 'react-router-dom'
import GameBackdrop from '../GameBackdrop'
import { PieceSwatch } from './Piece'
import './gomoku.css'

// Infinite Gomoku's colour: the club's purple running into deep teal.
export const GOMOKU_BACKDROP = '#0E4D64'

export const CARD = 'rounded-2xl border border-white/10 bg-plum/40 p-5 text-center shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
export const HEADING = "text-center font-['Cinzel'] text-xl text-brand-gold"

// Five Infinity Stones in a row: five in a row wins.
const LOGO = ['piece.gem.soul', 'piece.gem.time', 'piece.gem.space', 'piece.gem.reality', 'piece.gem.power']

export function GomokuLogo({ size = 26, className = '' }) {
  return (
    <span className={`flex items-center gap-0.5 ${className}`} aria-hidden="true">
      {LOGO.map((id) => (
        <PieceSwatch key={id} id={id} size={size} />
      ))}
    </span>
  )
}

export function GomokuTitle() {
  return (
    <>
      Infinite <span className="text-brand-gold">Gomoku</span>
    </>
  )
}

// Every Infinite Gomoku page: the backdrop (outside the part that slides
// in, so it stays put), a way back, then the logo, title and a line under
// it, centred, with anything else for the header (`aside`) under those.
export default function GomokuPage({ back = { to: '/games', label: 'Games' }, subtitle, aside, wide = false, children }) {
  return (
    <>
      <GameBackdrop to={GOMOKU_BACKDROP} />
      <div className={`mx-auto flex w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'} animate-page-in flex-col gap-6 px-4 py-8 motion-reduce:animate-none sm:py-12`}>
        <Link to={back.to} className="self-start text-sm text-white/60 hover:text-white">
          ← {back.label}
        </Link>
        <header className="-mt-2 flex flex-col items-center gap-2 text-center">
          <GomokuLogo />
          <h1 className="font-['Cinzel'] text-4xl text-white">
            <GomokuTitle />
          </h1>
          {subtitle && <p className="max-w-xl text-white/60">{subtitle}</p>}
          {aside}
        </header>
        {children}
      </div>
    </>
  )
}
