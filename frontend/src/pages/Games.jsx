import '@fontsource/cinzel'
import { Link } from 'react-router-dom'
import Die from '../components/farkle/Die'

const CARD = 'group flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-plum/40 p-6 shadow-xl shadow-black/40 backdrop-blur-md transition-colors hover:border-brand-gold/60'

// Every game on the site, as a card each, behind "Games" in the nav. For
// now that's Farkle. Anyone can look; playing needs a login, since games
// are played for points.
export default function Games() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold text-white">Games</h1>
      <p className="mt-2 max-w-2xl text-white/60">
        Play for PP and P-PP. Points can't be bought or cashed out: they're only for fun on the site, like badges and trophies.
      </p>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <Link to="/games/farkle" className={CARD}>
            <div className="flex gap-2" aria-hidden="true">
              {[1, 5, 5, 1].map((face, i) => (
                <Die key={i} value={face} size="small" />
              ))}
            </div>
            <h2 className="font-['Cinzel'] text-2xl text-white">
              Kino <span className="text-brand-gold">Farkle</span>
            </h2>
            <p className="text-white/70">
              The push-your-luck dice game. Play The Projectionist any time, or challenge another member and take turns by
              notification.
            </p>
            <span className="mt-auto font-semibold text-brand-gold transition-colors group-hover:text-white">Play Farkle →</span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
