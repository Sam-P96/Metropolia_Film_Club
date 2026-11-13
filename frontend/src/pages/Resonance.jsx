import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import PillToggle from '../components/PillToggle'
import SettingRow from '../components/profile/SettingRow'
import StyledAvatar from '../components/cosmetics/StyledAvatar'
import StyledUsername from '../components/cosmetics/StyledUsername'
import { useFirstPlaceShown } from '../components/firstPlace/firstPlaceStore'
import { edgeOf } from '../components/leaderboard/edges'
import BannerStrip from '../components/profile/BannerStrip'
import ResonanceCard from '../components/resonance/ResonanceCard'
import ResonanceIcon, { ResonanceMark } from '../components/resonance/ResonanceIcon'
import useApi from '../hooks/useApi'
import usePagedList from '../hooks/usePagedList'
import { noteSoulMatches, refreshSoulResonance } from '../hooks/useSoulResonance'
import { getMyResonance, getResonanceRanking } from '../services/resonance'
import { updateMe } from '../services/users'
import { getCurrentUser } from '../utils/currentUser'
import { canSeeEveryonesResonance } from '../utils/permissions'
import { RELATIONS, RESONANCE_SETTINGS, TIER_COLOURS } from '../utils/resonance'
import { resonanceTier } from '../../../shared/resonance.js'

const SIDES = [
  { value: 'resonance', label: 'Resonance', empty: 'Nobody is in Resonance with you yet.' },
  { value: 'dissonance', label: 'Dissonance', empty: 'Nobody is in Dissonance with you.' },
]

// How long typing has to pause before the list is searched.
const SEARCH_DELAY_MS = 250

const button =
  'inline-block rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'

const primaryButton =
  'inline-block rounded-md bg-brand-red px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60'

// Where each setting is in the member's standing (GET /api/resonance/me).
const STANDING_KEYS = { resonance: 'on', resonanceIcon: 'icon' }

// A message in place of the list.
function Notice({ children }) {
  return <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">{children}</div>
}

// Everyone the logged-in member has a Resonance with and may see, styled
// like the leaderboards: Resonance (50% or more) best first, Dissonance
// (under 50%) the strongest first. Hovering over a row on a computer opens
// that member's Resonance card under it; on a phone, tapping it does. The
// Resonance and Resonance icon switches from Edit profile are here too.
// For moderators and admins, the icon in the heading opens /SECRETresonance.
function Resonance() {
  const { data: standing, loading, error, reload, setData } = useApi(getMyResonance, [])
  const [saveError, setSaveError] = useState(null)
  const [currentUser] = useState(getCurrentUser)

  // A switch saves straight away. The page follows it at once, then
  // catches up with the server (whether there's anything to wait for).
  const change = async (field, value) => {
    const before = standing
    const key = STANDING_KEYS[field]
    setSaveError(null)
    setData((current) => ({
      ...current,
      [key]: value,
      ...(key === 'on' && { eligible: value && current.rated >= current.needed }),
    }))

    try {
      await updateMe({ [field]: value })
      refreshSoulResonance()
      reload()
    } catch (err) {
      setData(before)
      setSaveError(err.message)
    }
  }

  let body
  if (loading) {
    body = <p className="mt-8 text-sm text-white/40">Loading…</p>
  } else if (error || !standing) {
    body = <p className="mt-8 text-white/60">Couldn't load Resonance. Try refreshing the page.</p>
  } else if (!standing.on) {
    body = <TurnOn onTurnOn={() => change('resonance', true)} />
  } else if (!standing.eligible) {
    body = (
      <Notice>
        <p className="font-medium">Rate more movies to use this feature.</p>
        <p className="mt-1 text-sm text-white/60">
          Resonance unlocks at {standing.needed} rated films. You've rated {standing.rated} so far.
        </p>
        <Link to="/films" className={`${button} mt-4`}>
          Find films to rate
        </Link>
      </Notice>
    )
  } else {
    body = <Ranking waiting={standing.waiting} />
  }

  return (
    <section className="text-white">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <h1 className="flex items-center gap-3 text-4xl font-bold sm:text-5xl">
          <span>
            Your <span className="text-brand-gold">Resonance</span>
          </span>
          {canSeeEveryonesResonance(currentUser) ? (
            <Link
              to="/SECRETresonance"
              aria-label="Everyone's Resonance"
              className="inline-flex rounded-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-gold"
            >
              <ResonanceMark />
            </Link>
          ) : (
            <ResonanceMark />
          )}
        </h1>

        <div className="mt-4 mb-6 h-1 w-10 rounded-full bg-brand-gold" />

        <p className="max-w-2xl text-white/60">
          How alike your taste in films is to everyone else's, from the films you've both rated. Worked out
          again every night.
        </p>

        {standing && <ResonanceSettings standing={standing} onChange={change} error={saveError} />}

        {body}
      </div>
    </section>
  )
}

// The Resonance and Resonance icon switches, the same as Edit profile's.
// Each saves as soon as it's flipped.
function ResonanceSettings({ standing, onChange, error }) {
  return (
    <div className="mt-6 space-y-5 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      {Object.entries(RESONANCE_SETTINGS).map(([field, setting]) => {
        const on = standing[STANDING_KEYS[field]]

        return (
          <SettingRow
            key={field}
            label={setting.label}
            description={on ? setting.on : setting.off}
            on={on}
            onChange={(value) => onChange(field, value)}
          />
        )
      })}

      {error && <p className="text-sm text-brand-red">{error}</p>}
    </div>
  )
}

// Resonance is off: the question, and one button to turn it back on.
function TurnOn({ onTurnOn }) {
  return (
    <Notice>
      <p className="font-medium">Turn on Resonance?</p>
      <button type="button" onClick={onTurnOn} className={`${primaryButton} mt-4`}>
        Turn on
      </button>
    </Notice>
  )
}

function Ranking({ waiting }) {
  const [side, setSide] = useState('resonance')
  // What's typed, and what's searched for once typing pauses.
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const list = usePagedList((offset) => getResonanceRanking(side, offset, search), [side, search], 'matches')
  const current = SIDES.find((option) => option.value === side)
  const matches = list.data?.matches ?? []

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [query])

  // Fresher than the Soul map, if they've just been worked out.
  useEffect(() => {
    noteSoulMatches(list.data?.matches)
  }, [list.data])

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <PillToggle options={SIDES} value={side} onChange={setSide} label="Show" />

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search names..."
          aria-label="Search names"
          className="w-full max-w-xs rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10 sm:w-64"
        />
      </div>

      {list.loading ? (
        <p className="mt-8 text-sm text-white/40">Loading…</p>
      ) : list.error ? (
        <p className="mt-8 text-white/60">Couldn't load the list. Try refreshing the page.</p>
      ) : matches.length === 0 ? (
        <p className="mt-8 text-white/60">
          {search
            ? `Nobody called “${search}” in ${current.label}.`
            : waiting
              ? "You've just unlocked Resonance. It's worked out every night at 04:00, so check back tomorrow."
              : current.empty}
        </p>
      ) : (
        <ol className="mt-8 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          {matches.map((match, index) => (
            <Row key={match.user._id} match={match} rank={match.rank} edge={edgeOf(index, matches.length)} />
          ))}
        </ol>
      )}

      {list.data?.hasMore && (
        <button
          type="button"
          onClick={list.loadMore}
          disabled={list.loadingMore}
          className={`${button} mt-5 disabled:cursor-wait disabled:opacity-60`}
        >
          {list.loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}

      {list.moreError && <p className="mt-3 text-sm text-brand-red">{list.moreError}</p>}
    </>
  )
}

// The corners of the list's end rows: the list doesn't hide its overflow,
// so the particles of the cosmetics in its top and bottom rows aren't cut.
const EDGE_ROW = { first: 'rounded-t-xl', last: 'rounded-b-xl', only: 'rounded-xl' }
const EDGE_BANNER = { first: 'rounded-tl-xl', last: 'rounded-bl-xl', only: 'rounded-l-xl' }

// One member: rank, avatar, name and banner, the score on the right, and
// their card underneath while it's open. A mouse opens it by hovering and
// closes it by leaving; a tap (or Enter) opens and closes it. Their name
// and picture wear their Black Market cosmetics; the card doesn't. Long
// names show in full and wrap.
function Row({ match, rank, edge }) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const pointer = useRef(null)
  const tier = resonanceTier(match.percent)
  const { user } = match
  const cosmetics = user.cosmetics
  // The First Place effect, in place of their name style, if they hold a title.
  const firstPlace = useFirstPlaceShown(user._id)
  const styledName = Boolean(cosmetics?.name) || firstPlace

  return (
    <li
      onPointerEnter={(event) => event.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onPointerDown={(event) => {
          pointer.current = event.pointerType
        }}
        onClick={() => {
          // A mouse has already opened it by hovering.
          if (pointer.current === 'mouse') setOpen(true)
          else setOpen(!open)
          pointer.current = null
        }}
        className={`group relative isolate flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-gold ${open ? 'bg-white/5' : ''} ${EDGE_ROW[edge] && !open ? EDGE_ROW[edge] : edge === 'first' || edge === 'only' ? 'rounded-t-xl' : ''} ${styledName || cosmetics?.border ? 'z-10' : ''}`}
      >
        <BannerStrip banner={user.reviewCardBanner} className={EDGE_BANNER[edge] ?? ''} />

        <span className={`w-6 shrink-0 text-right text-lg font-bold tabular-nums ${rank <= 3 ? 'text-brand-gold' : 'text-white/40'}`}>
          {rank}
        </span>

        <StyledAvatar borderId={cosmetics?.border} user={user} />

        <div className="min-w-0 flex-1">
          <p className={`flex min-w-0 items-center gap-1.5 font-medium transition-colors group-hover:text-brand-gold ${styledName ? '' : 'drop-shadow'}`}>
            <span className="min-w-0 [overflow-wrap:anywhere]">
              <StyledUsername name={user.username} styleId={cosmetics?.name} userId={user._id} />
            </span>
            <ResonanceIcon userId={user._id} />
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            <span className="truncate">
              {match.sharedCount} shared {match.sharedCount === 1 ? 'film' : 'films'}
            </span>
            {match.relation && (
              <span className="shrink-0 rounded-full border border-white/15 bg-ink/60 px-2 py-px text-[0.65rem] font-medium text-white/80">
                {RELATIONS[match.relation]}
              </span>
            )}
          </p>
        </div>

        <p className={`shrink-0 text-right text-sm font-semibold tabular-nums ${TIER_COLOURS[tier.key]}`}>
          <span className="hidden sm:inline">{tier.label}: </span>
          {tier.shown}%
        </p>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="card"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pt-1 pb-4 sm:px-5">
              <ResonanceCard match={match} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export default Resonance
