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
// The other factors are never shown. Links to their profile. On a phone
// the picture sits above the rest. A Soul Resonance glows blue, with a
// light running round it. `match` is one of the server's
// (backend/utils/resonanceStore.js matchView).
function ResonanceCard({ match, className = '' }) {
  const { user, percent, movies, genre, sharedFilms, relation } = match
  const tier = resonanceTier(percent)

  return (
    <div className={`relative ${className}`}>
      <Link
        to={`/users/${user._id}`}
        className="group block overflow-hidden rounded-2xl border border-white/10 bg-plum/40 text-left text-white shadow-xl shadow-black/40 backdrop-blur-md"
      >
        <div className="relative flex flex-col items-center gap-4 p-5 sm:flex-row sm:gap-6">
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
            <p className="flex min-w-0 items-center gap-1.5 text-xl font-semibold transition-colors group-hover:text-brand-gold sm:pr-24">
              <span className="truncate">{user.username}</span>
              <ResonanceIcon userId={user._id} />
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
                    <span className="truncate">{film.title}</span>
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

          <p className={`relative flex items-center justify-end gap-2 px-5 py-3 text-2xl font-bold drop-shadow sm:text-3xl ${TIER_COLOURS[tier.key]}`}>
            {tier.label}: {tier.shown}%
            {tier.key === 'soul' && <ResonanceMark />}
          </p>
        </div>
      </Link>

      {tier.key === 'soul' && <CardShine tone="soul" />}
    </div>
  )
}

export default ResonanceCard
