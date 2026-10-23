import UpcomingEvents from '../components/events/UpcomingEvents'
import NextEvent from '../components/events/NextEvent'
import PlanToWatchLeaderboard from '../components/films/PlanToWatchLeaderboard'
import MovieWheel from '../components/wheel/MovieWheel'

function ClubEvents() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-5 pt-14 pb-2 sm:px-8 sm:pt-20">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Club <span className="text-brand-gold">Events</span>
        </h1>
        <p className="mt-3 max-w-xl text-white/60">
          What's coming up, what we're watching next, and what the club is
          itching to see.
        </p>
      </div>

      <UpcomingEvents />

      <NextEvent showMoreLink={false} />

      <PlanToWatchLeaderboard />

      <UpcomingEvents screenings />

      <section className="text-white">
        <MovieWheel
          title="The Wheel"
          description="Can't agree on anything? Add the films you'd like to watch, then spin. Wherever it lands is what we watch."
        />
      </section>
    </>
  )
}

export default ClubEvents