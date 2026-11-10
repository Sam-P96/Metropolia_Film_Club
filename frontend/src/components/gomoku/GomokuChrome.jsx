import '@fontsource/cinzel'
import { Link } from 'react-router-dom'
import GameBackdrop from '../GameBackdrop'
import { PieceSwatch } from './Piece'
import './gomoku.css'

// Infinite Gomoku's colour: the club's purple running into deep teal.
export const GOMOKU_BACKDROP = '#0E4D64'

export const CARD = 'rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
export const HEADING = "font-['Cinzel'] text-xl text-brand-gold"

// Five Infinity Stones in a row: five in a row wins.
const LOGO = ['piece.gem.soul', 'piece.gem.time', 'piece.gem.space', 'piece.gem.reality', 'piece.gem.power']

export function GomokuLogo({ size = 26 }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
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
// in, so it stays put), a way back, the title, a line under it, and
// anything for the right of the header (`aside`).
export default function GomokuPage({ back = { to: '/games', label: 'Games' }, subtitle, aside, wide = false, children }) {
  return (
    <>
      <GameBackdrop to={GOMOKU_BACKDROP} />
      <div className={`mx-auto flex w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'} animate-page-in flex-col gap-6 px-4 py-8 motion-reduce:animate-none sm:py-12`}>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Link to={back.to} className="text-sm text-white/60 hover:text-white">
              ← {back.label}
            </Link>
            <div className="mt-3">
              <GomokuLogo />
            </div>
            <h1 className="mt-2 font-['Cinzel'] text-4xl text-white">
              <GomokuTitle />
            </h1>
            {subtitle && <p className="mt-1 text-white/60">{subtitle}</p>}
          </div>
          {aside}
        </header>
        {children}
      </div>
    </>
  )
}
