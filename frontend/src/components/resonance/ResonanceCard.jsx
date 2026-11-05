import { Link } from 'react-router-dom'

import MemberAvatar from '../profile/MemberAvatar'
import ResonanceIcon, { ResonanceMark } from './ResonanceIcon'
import CardShine from '../CardShine'
import { bannerLayerStyle } from '../../utils/bannerStyle'
import { RELATIONS, TIER_COLOURS } from '../../utils/resonance'
import { resonanceTier } from '../../../../shared/resonance.js'

// One of the two factors the card shows, as a bar.
function FactorBar({ label, value }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-14 shrink-0 text-white/70">{label}</span>
      <span
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10"
      >
        <span className="block h-full rounded-full bg-brand-gold" style={{ width: `${value}%` }} />
      </span>
      <span className="w-10 shrink-0 text-right font-semibold tabular-nums">{value}%</span>
    </div>
  )
}

// Another member's Resonance with the logged-in one, like a review card:
// their picture, big, beside their name, the Movies and Genre factors and
// the films both rated highest, then their banner with the score on it.
// The other factors are never shown. Anywhere on it goes to their profile,
// except the shared films, which go to each film's page, and the score,
// which goes to every film the two of them have rated, side by side
// (pages/ResonanceCompare.jsx). On a phone the picture sits above the
// rest. A Soul Resonance glows blue, with a light running round it.
// `match` is one of the server's (backend/utils/resonanceStore.js
// matchView).
//
// Links can't go inside a link, so the card isn't one: its name is the link
// to the profile, stretched over the whole card (the name's ::after, z-1),
// and the other links and the Resonance icon (for its bubble) sit above it
// (z-2).
function ResonanceCard({ match, className = '' }) {
  const { user, percent, movies, genre, sharedFilms, relation } = match
  const tier = resonanceTier(percent)

  return (
    <div className={`relative ${className}`}>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-plum/40 text-left text-white shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:gap-6">
          {relation && (
            <span className="absolute top-3 right-3 rounded-full border border-white/15 bg-ink/60 px-2.5 py-0.5 text-[0.7rem] font-medium text-white/80">
              {RELATIONS[relation]}
            </span>
          )}

          {/* A Soul Resonance's picture gets the card's glass rim too. */}
          <div className="relative flex shrink-0 rounded-full">
            <MemberAvatar user={user} size="xl" />
            {tier.key === 'soul' && <CardShine tone="soul" shape="circle" />}
          </div>

          <div className="w-full min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1.5 text-xl font-semibold sm:pr-24">
              <Link
                to={`/users/${user._id}`}
                className="flex min-w-0 transition-colors after:absolute after:inset-0 after:z-1 after:rounded-2xl hover:text-brand-gold focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand-gold"
              >
                <span className="truncate">{user.username}</span>
              </Link>
              <ResonanceIcon userId={user._id} className="relative z-2" />
            </p>

            <div className="mt-3 space-y-2">
              <FactorBar label="Movies" value={movies} />
              <FactorBar label="Genre" value={genre} />
            </div>

            <p className="mt-4 text-xs font-semibold tracking-widest text-white/50 uppercase">Shared movies:</p>
            {sharedFilms.length > 0 ? (
              <ol className="mt-1.5 space-y-0.5 text-sm text-white/85">
                {sharedFilms.map((film, index) => (
                  <li key={film.tmdbId} className="flex min-w-0 gap-2">
                    <span className="w-4 shrink-0 text-right text-white/40 tabular-nums">{index + 1}.</span>
                    <Link
                      to={`/films/${film.tmdbId}`}
                      className="relative z-2 truncate transition-colors hover:text-brand-gold"
                    >
                      {film.title}
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-1.5 text-sm text-white/50">None yet.</p>
            )}
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="absolute inset-0" style={bannerLayerStyle(user.reviewCardBanner)} />
          <div className="absolute inset-0 bg-linear-to-r from-ink/0 via-ink/40 to-ink/80" />

          {/* The score: to every film they've both rated. The shadow is on
              the link, not the line, as a shadow (a filter) would keep the
              link from rising above the name's. */}
          <p className={`relative flex justify-end px-5 py-3 text-2xl font-bold sm:text-3xl ${TIER_COLOURS[tier.key]}`}>
            <Link
              to={`/resonance/${user._id}`}
              title="Compare your ratings"
              className="relative z-2 flex items-center gap-2 rounded-sm drop-shadow decoration-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-gold"
            >
              {tier.label}: {tier.shown}%
              {tier.key === 'soul' && <ResonanceMark />}
            </Link>
          </p>
        </div>
      </div>

      {tier.key === 'soul' && <CardShine tone="soul" />}
    </div>
  )
}

export default ResonanceCard
