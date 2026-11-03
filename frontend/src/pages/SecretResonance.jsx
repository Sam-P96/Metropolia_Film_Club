import { useState } from 'react'
import { Link } from 'react-router-dom'

import PillToggle from '../components/PillToggle'
import MemberAvatar from '../components/profile/MemberAvatar'
import usePagedList from '../hooks/usePagedList'
import { getEveryonesResonance } from '../services/resonance'
import { TIER_COLOURS } from '../utils/resonance'
import { resonanceTier } from '../../../shared/resonance.js'

// Resonance counts rated films (a rating, with or without a written review).
const MINIMUMS = [
  { value: '20', label: '20 ratings' },
  { value: 'any', label: 'Any ratings' },
]

// All five factors, which members never see.
const FACTORS = [
  ['movies', 'Movies'],
  ['genre', 'Genre'],
  ['genreOverlap', 'Genre overlap'],
  ['decades', 'Decades'],
  ['ageRatings', 'Age ratings'],
]

// One side of a pair: picture, name, and what's worth knowing about them
// here (how many films they've rated, privacy, Resonance off).
function Person({ user, info }) {
  const notes = [
    info && `${info.rated} rated`,
    info?.privacy === 'private' && 'Private',
    info?.privacy === 'friends' && 'Friends only',
    info && !info.resonance && 'Resonance off',
  ].filter(Boolean)

  return (
    <Link to={`/users/${user._id}`} className="group flex min-w-0 items-center gap-2">
      <MemberAvatar user={user} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium transition-colors group-hover:text-brand-gold">
          {user.username}
        </span>
        <span className="block truncate text-[0.7rem] text-white/45">{notes.join(' · ')}</span>
      </span>
    </Link>
  )
}

// Not linked from anywhere: only at /SECRETresonance, and only for admins
// (the server checks). Every pair of members, worked out now with the
// current weights rather than last night's, whatever their settings and
// privacy, with all five factors. "20 ratings" is the members Resonance is
// worked out for; "Any ratings" is everyone who has rated a film. Pick a
// member to see only theirs.
function SecretResonance() {
  const [min, setMin] = useState('20')
  const [member, setMember] = useState('')
  const list = usePagedList((offset) => getEveryonesResonance({ min, member, offset }), [min, member], 'pairs')

  const members = list.data?.members ?? []
  const byId = Object.fromEntries(members.map((entry) => [entry._id, entry]))
  const pairs = list.data?.pairs ?? []

  return (
    <section className="text-white">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <h1 className="text-4xl font-bold sm:text-5xl">
          Everyone's <span className="text-brand-gold">Resonance</span>
        </h1>

        <div className="mt-4 mb-6 h-1 w-10 rounded-full bg-brand-gold" />

        <p className="max-w-2xl text-white/60">
          Every pair of members, worked out now with the current weights, whatever their settings and privacy.
          Admins only.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <PillToggle
            options={MINIMUMS}
            value={min}
            onChange={(value) => {
              setMin(value)
              setMember('')
            }}
            label="Members with"
          />

          <select
            value={member}
            onChange={(event) => setMember(event.target.value)}
            disabled={!list.data}
            aria-label="Whose pairs"
            className="rounded-md border border-white/15 bg-ink/60 px-3 py-1.5 text-sm text-white outline-none focus:border-brand-gold/60 disabled:opacity-60"
          >
            <option value="">Everyone</option>
            {members.length === 0 && member && <option value={member}>Loading…</option>}
            {members.map((entry) => (
              <option key={entry._id} value={entry._id}>
                {entry.username} ({entry.rated})
              </option>
            ))}
          </select>

          {list.data && (
            <p className="text-sm text-white/50">
              {list.data.total} {list.data.total === 1 ? 'pair' : 'pairs'} · {members.length}{' '}
              {members.length === 1 ? 'member' : 'members'}
            </p>
          )}
        </div>

        {list.loading ? (
          <p className="mt-8 text-sm text-white/40">Working it out…</p>
        ) : list.error ? (
          <p className="mt-8 text-white/60">
            {list.error.status === 403 ? 'This page is for admins.' : "Couldn't load it. Try refreshing the page."}
          </p>
        ) : pairs.length === 0 ? (
          <p className="mt-8 text-white/60">No pairs yet: it needs two members who have rated films.</p>
        ) : (
          <ol className="mt-6 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {pairs.map((pair, index) => {
              const tier = resonanceTier(pair.percent)

              return (
                <li key={`${pair.a._id}-${pair.b._id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                  <span className="w-7 shrink-0 text-right text-sm font-bold text-white/40 tabular-nums">{index + 1}</span>
                  <Person user={pair.a} info={byId[pair.a._id]} />
                  <span aria-label="and" className="text-white/30">
                    ↔
                  </span>
                  <Person user={pair.b} info={byId[pair.b._id]} />

                  <p className={`ml-auto shrink-0 text-sm font-semibold tabular-nums ${TIER_COLOURS[tier.key]}`}>
                    {tier.label}: {tier.shown}%
                  </p>

                  <p className="w-full text-xs text-white/50 tabular-nums sm:pl-11">
                    {FACTORS.map(([key, label]) => `${label} ${pair.factors[key]}%`).join(' · ')} · {pair.sharedCount}{' '}
                    shared
                  </p>
                </li>
              )
            })}
          </ol>
        )}

        {list.data?.hasMore && (
          <button
            type="button"
            onClick={list.loadMore}
            disabled={list.loadingMore}
            className="mt-5 rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
          >
            {list.loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}

        {list.moreError && <p className="mt-3 text-sm text-brand-red">{list.moreError}</p>}
      </div>
    </section>
  )
}

export default SecretResonance
