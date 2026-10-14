import { Link } from 'react-router-dom'

import MostWantedList from './MostWantedList'
import GifBackground from '../GifBackground'
import artLoveGif from '../../assets/purple_sparkle_1.gif'
import { getMostWanted } from '../../services/films'
import useApi from '../../hooks/useApi'

const TOP_N = 4

function PlanToWatchLeaderboard() {
  const { data, loading, error } = useApi(() => getMostWanted(TOP_N), [])

  const films = data?.films ?? []
  const total = data?.total ?? 0

  return (
    <section className="relative overflow-hidden border-b border-white/10 text-white">

      
      
      <GifBackground src={artLoveGif} />
      {/* <div className="pointer-events-none absolute inset-0 bg-black/30" /> */}
      <div className="relative mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">

        <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
          Plan to watch list leaderboard
        </h2>

        <div className="mt-4 mb-3 h-1 w-10 rounded-full bg-brand-gold" />

        <p className="mb-8 text-sm text-white/50">
          What the club most wants to see. Good candidates for the wheel.
        </p>

        {films.length === 0 ? (
          <p className="text-white/50">
            {loading
              ? 'Loading…'
              : error
                ? "Couldn't load the leaderboard. Try refreshing the page."
                : 'Nobody has planned anything yet. Add something to your list.'}
          </p>
        ) : (
          <>
            <MostWantedList films={films} />

            <Link
              to="/club_events/plan_to_watch"
              className="mt-6 inline-block font-medium text-brand-gold transition-colors hover:text-white"
            >
              Show all ({total}) →
            </Link>
          </>
        )}
      </div>
    </section>
  )
}

export default PlanToWatchLeaderboard
