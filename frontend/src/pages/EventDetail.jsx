import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  awardEveryone,
  awardMember,
  deleteEvent,
  getEvent,
  getEventAwards,
  removeSeat,
  repostEvent,
  setEventOfficial,
  setEventRsvp,
  setMySeat,
} from '../services/events'
import useApi from '../hooks/useApi'
import { getCurrentUser } from '../utils/currentUser'
import { formatEventDate, formatEventTime } from '../utils/eventDates'
import { googleCalendarUrl } from '../utils/googleCalendar'
import { canMakeEventsOfficial, canManageEvent, canRemoveSeats, hasAtLeast } from '../utils/permissions'
import ResonanceIcon from '../components/resonance/ResonanceIcon'

function EventDetail({ isAuthenticated }) {
  const { eventId } = useParams()
  const { data: event, loading, error, setData } = useApi(() => getEvent(eventId), [eventId])

  const [currentUser] = useState(getCurrentUser)

  // A broken gif link shouldn't leave an empty frame on the page.
  const [imageFailed, setImageFailed] = useState(false)

  // Reward Mode, for admins (RewardToggle): who has been awarded a pack for
  // this event ({ userId: count }), loaded when it's turned on; null while
  // it loads.
  const isAdmin = hasAtLeast(currentUser, 'admin')
  const [rewardMode, setRewardMode] = useState(false)
  const [awards, setAwards] = useState(null)
  const [awardsError, setAwardsError] = useState(null)
  useEffect(() => {
    if (!rewardMode) return
    let stale = false
    getEventAwards(eventId)
      .then((result) => !stale && setAwards(result.awards))
      .catch((err) => !stale && setAwardsError(err.message))
    return () => {
      stale = true
    }
  }, [rewardMode, eventId])
  const switchReward = (on) => {
    setAwards(null)
    setAwardsError(null)
    setRewardMode(on)
  }

  if (loading) {
    return (
      <section className="px-5 py-24 text-center text-white/50 sm:px-8">
        Loading…
      </section>
    )
  }

  if (!event) {
    const notFound = error?.status === 404

    return (
      <section className="mx-auto max-w-3xl px-5 py-24 text-white sm:px-8">
        <h1 className="text-3xl font-bold">
          {notFound ? 'Event not found' : "Couldn't load this event"}
        </h1>
        <p className="mt-3 text-white/60">
          {notFound
            ? 'There is no event with that id. It may have been cancelled.'
            : 'Something went wrong on our end. Try refreshing the page.'}
        </p>
        <Link
          to="/club_events/all"
          className="mt-6 inline-block font-medium text-brand-gold transition-colors hover:text-white"
        >
          See all events →
        </Link>
      </section>
    )
  }

  const isPast = new Date(event.startsAt) <= new Date()
  const showImage = event.gifUrl && !imageFailed

  return (
    <section className="text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/club_events"
            className="text-sm text-white/50 transition-colors hover:text-white"
          >
            ← Back to club events
          </Link>

          {(isAdmin || canManageEvent(currentUser, event)) && (
            <div className="flex flex-col items-end gap-3">
              {isAdmin && <RewardToggle on={rewardMode} onChange={switchReward} />}
              {canManageEvent(currentUser, event) && (
                <ManageEvent
                  eventId={event._id}
                  official={event.official}
                  isHost={event.createdBy === currentUser._id}
                  canRepost={!isPast}
                  canPromote={canMakeEventsOfficial(currentUser)}
                  onOfficialChange={(official) => setData((prev) => ({ ...prev, official }))}
                />
              )}
            </div>
          )}
        </div>

        <div className="mt-8 grid items-start gap-12 md:grid-cols-2">
          <div>
            <p
              className={`text-sm font-semibold tracking-widest uppercase ${
                isPast ? 'text-white/40' : 'text-brand-gold'
              }`}
            >
              {isPast ? 'Past' : 'Upcoming'} {event.official ? 'event' : 'member screening'}
            </p>

            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{event.title}</h1>

            <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

            <dl className="space-y-4">
              <div>
                <dt className="text-xs tracking-wider text-white/40 uppercase">When</dt>
                <dd className="mt-1 font-medium">
                  {formatEventDate(event.startsAt)} at {formatEventTime(event.startsAt)}
                </dd>
              </div>

              {event.location && (
                <div>
                  <dt className="text-xs tracking-wider text-white/40 uppercase">Where</dt>
                  <dd className="mt-1 font-medium">{event.location}</dd>
                </div>
              )}

              {event.film && (
                <div>
                  <dt className="text-xs tracking-wider text-white/40 uppercase">Film</dt>
                  <dd className="mt-1 font-medium">
                    {event.film.tmdbId ? (
                      <Link
                        to={`/films/${event.film.tmdbId}`}
                        className="text-brand-gold transition-colors hover:text-white"
                      >
                        {event.film.title} →
                      </Link>
                    ) : (
                      event.film.title
                    )}
                  </dd>
                </div>
              )}

              {/* A member screening is someone's own; say whose. */}
              {!event.official && event.host && (
                <div>
                  <dt className="text-xs tracking-wider text-white/40 uppercase">Hosted by</dt>
                  <dd className="mt-1 font-medium">
                    <Link
                      to={`/users/${event.host._id}`}
                      className="text-brand-gold transition-colors hover:text-white"
                    >
                      {event.host.username}
                    </Link>
                    <ResonanceIcon userId={event.host._id} className="ml-1.5" />
                  </dd>
                </div>
              )}
            </dl>

            {event.description && (
              <p className="mt-8 leading-relaxed whitespace-pre-line text-white/70">
                {event.description}
              </p>
            )}

            {!isPast && (
              <div className="mt-10 flex flex-wrap gap-3">
                {event.ticketUrl && (
                  <a
                    href={event.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange"
                  >
                    Purchase Tickets
                  </a>
                )}

                <a
                  href={googleCalendarUrl(event)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-brand-gold/60 px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/10"
                >
                  + Add to Google Calendar
                </a>
              </div>
            )}
          </div>

          {/* Always here, so the buttons and who's coming show without an image too */}
          <div>
            {showImage && (
              <div className="mb-10 -skew-x-6 overflow-hidden rounded-2xl shadow-xl shadow-black/40">
                <img
                  src={event.gifUrl}
                  alt=""
                  onError={() => setImageFailed(true)}
                  className={`aspect-4/3 w-full skew-x-6 scale-115 object-cover ${
                    isPast ? 'opacity-60 grayscale' : ''
                  }`}
                />
              </div>
            )}

            <Attendance
              event={event}
              isPast={isPast}
              isAuthenticated={isAuthenticated}
              myId={currentUser?._id ?? null}
              canRemoveSeats={canRemoveSeats(currentUser)}
              onChange={(attendance) => setData((prev) => ({ ...prev, ...attendance }))}
              reward={isAdmin && rewardMode ? { awards, error: awardsError, onAwards: setAwards } : null}
            />
          </div>
        </div>

      </div>
    </section>
  )
}

const RSVPS = [
  {
    key: 'attending',
    countKey: 'attendingCount',
    button: 'Attend',
    chosen: '✓ Attending',
    tab: 'Attending',
    none: 'Nobody is going yet.',
    nonePast: 'Nobody said they were going.',
  },
  {
    key: 'interested',
    countKey: 'interestedCount',
    button: 'Interested',
    chosen: '✓ Interested',
    tab: 'Interested',
    none: "Nobody has said they're interested yet.",
    nonePast: 'Nobody said they were interested.',
  },
]

// Attend and Interested, and a box listing who picked which. A member picks
// one or neither; clicking their pick again takes it back. Logged-out
// visitors are sent to log in first, then back here. At a theatre screening
// (one with a ticket link), the Attending list shows where people are sitting.
// In Reward Mode (`reward`, admins only: { awards, error, onAwards }), each
// member has an Award button in place of their seat, and Award All buttons
// sit above the box.
function Attendance({ event, isPast, isAuthenticated, myId, canRemoveSeats, onChange, reward }) {
  const [shown, setShown] = useState('attending')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const myRsvp = event.myRsvp ?? null
  const current = RSVPS.find((option) => option.key === shown)
  const people = event[current.key] ?? []
  // Members with a private profile are counted but not listed.
  const hidden = (event[current.countKey] ?? 0) - people.length
  const showSeats = Boolean(event.ticketUrl) && shown === 'attending'

  const handleClick = async (rsvp) => {
    const next = myRsvp === rsvp ? null : rsvp
    setSaving(true)
    setError(null)

    try {
      onChange(await setEventRsvp(event._id, next))
      // Show them the list they just joined.
      if (next) setShown(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Filled gold for their pick, outlined otherwise, like "Plan to watch".
  const buttonClasses = (chosen) =>
    `rounded-md border px-5 py-2.5 text-center text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
      chosen
        ? 'border-brand-gold bg-brand-gold text-ink hover:bg-brand-gold/85'
        : 'border-brand-gold/60 text-brand-gold hover:bg-brand-gold/10'
    }`

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {RSVPS.map((option) => {
          const chosen = myRsvp === option.key

          return isAuthenticated || isPast ? (
            <button
              key={option.key}
              type="button"
              onClick={() => handleClick(option.key)}
              disabled={saving || isPast}
              aria-pressed={chosen}
              className={buttonClasses(chosen)}
            >
              {chosen ? option.chosen : option.button}
            </button>
          ) : (
            <Link
              key={option.key}
              to="/login"
              state={{ from: `/club_events/${event._id}` }}
              className={buttonClasses(false)}
            >
              {option.button}
            </Link>
          )
        })}
      </div>

      {isPast && (
        <p className="mt-3 text-sm text-white/40">This event has already happened.</p>
      )}

      {error && <p className="mt-3 text-sm text-brand-red">{error}</p>}

      {reward && (
        <AwardAll event={event} onAwards={reward.onAwards} disabled={reward.awards === null} error={reward.error} />
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex border-b border-white/10">
          {RSVPS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setShown(option.key)}
              aria-pressed={shown === option.key}
              className={`-mb-px flex-1 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                shown === option.key
                  ? 'border-brand-gold text-white'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              {option.tab}
              <span className="ml-2 text-white/40">{event[option.countKey] ?? 0}</span>
            </button>
          ))}
        </div>

        {people.length === 0 && hidden === 0 ? (
          <p className="px-5 py-6 text-sm text-white/40">
            {isPast ? current.nonePast : current.none}
          </p>
        ) : (
          <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto">
            {people.map((user) => (
              <li
                key={user._id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-white/5"
              >
                <Link
                  to={`/users/${user._id}`}
                  className="group flex min-w-0 flex-1 items-center gap-4"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white/20"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-red text-sm font-bold ring-2 ring-white/20">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5 font-medium transition-colors group-hover:text-brand-gold">
                      <span className="truncate">{user.username}</span>
                      <ResonanceIcon userId={user._id} />
                      {user._id === myId && (
                        <span className="ml-2 text-xs font-normal text-white/40">you</span>
                      )}
                    </p>
                    <p className="text-xs text-white/40">{user.memberTitle}</p>
                  </div>
                </Link>

                {reward ? (
                  <AwardButton
                    eventId={event._id}
                    member={user}
                    count={reward.awards?.[user._id] ?? 0}
                    loading={reward.awards === null}
                    onAwards={reward.onAwards}
                  />
                ) : showSeats && (
                  <SeatControls
                    eventId={event._id}
                    member={user}
                    canEdit={user._id === myId && !isPast}
                    canRemove={canRemoveSeats}
                    onChange={onChange}
                  />
                )}
              </li>
            ))}

            {hidden > 0 && (
              <li className="px-5 py-3 text-xs text-white/40">
                + {hidden} {hidden === 1 ? 'member' : 'members'} with a private profile
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

// A member's seat at a theatre screening, beside their name. Your own row has
// "Enter seat", and once entered, your seat opens the editor again. Others'
// seats are just shown. Moderators and admins can remove anyone's, after
// confirming. `onChange` gets the new attendance from the server.
function SeatControls({ eventId, member, canEdit, canRemove, onChange }) {
  // null, 'editing' or 'confirming' (a removal).
  const [mode, setMode] = useState(null)
  const [row, setRow] = useState('')
  const [seatNumber, setSeatNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const seat = member.seat
  const label = seat ? `Row ${seat.row} · Seat ${seat.seat}` : null

  const send = async (request) => {
    setSaving(true)
    setError(null)

    try {
      onChange(await request())
      setMode(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const startEditing = () => {
    setRow(seat?.row ?? '')
    setSeatNumber(seat?.seat ?? '')
    setError(null)
    setMode('editing')
  }

  const smallButton =
    'rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60'

  const smallInput =
    'w-20 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'

  const errorText = error && <p className="w-full text-xs text-brand-red">{error}</p>

  if (mode === 'editing') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(() => setMySeat(eventId, row, seatNumber))
        }}
        className="flex w-full flex-wrap items-center gap-2"
      >
        <input
          aria-label="Row"
          placeholder="Row"
          maxLength={10}
          value={row}
          onChange={(e) => setRow(e.target.value)}
          autoFocus
          className={smallInput}
        />
        <input
          aria-label="Seat"
          placeholder="Seat"
          maxLength={10}
          value={seatNumber}
          onChange={(e) => setSeatNumber(e.target.value)}
          className={smallInput}
        />
        <button
          disabled={saving}
          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setMode(null)} disabled={saving} className={smallButton}>
          Cancel
        </button>
        {errorText}
      </form>
    )
  }

  if (mode === 'confirming') {
    return (
      <div className="flex w-full flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-white/70">Remove {member.username}'s seat?</span>
        <button
          type="button"
          onClick={() => send(() => removeSeat(eventId, member._id))}
          disabled={saving}
          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? 'Removing…' : 'Yes, remove'}
        </button>
        <button type="button" onClick={() => setMode(null)} disabled={saving} className={smallButton}>
          Cancel
        </button>
        {errorText}
      </div>
    )
  }

  if (!canEdit && !seat) return null

  return (
    <div className="flex items-center gap-2">
      {canEdit ? (
        <button
          type="button"
          onClick={startEditing}
          title={seat ? 'Change your seat' : undefined}
          className={
            seat
              ? 'rounded-md border border-brand-gold/40 bg-brand-gold/10 px-3 py-1.5 text-xs font-medium text-brand-gold transition-colors hover:border-brand-gold hover:bg-brand-gold/20'
              : smallButton
          }
        >
          {label ?? 'Enter seat'}
        </button>
      ) : (
        // The same pill as your own seat, in the member title's grey.
        <span className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/40">
          {label}
        </span>
      )}

      {canRemove && seat && (
        <button
          type="button"
          onClick={() => {
            setError(null)
            setMode('confirming')
          }}
          aria-label={`Remove ${member.username}'s seat`}
          title="Remove seat"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-red/60 text-sm text-brand-red transition-colors hover:bg-brand-red/10"
        >
          ×
        </button>
      )}

      {errorText}
    </div>
  )
}

// ---- Reward Mode (admins): Black & Gold booster packs for attending (backend/utils/catflix/awards.js) ----

const SMALL_BUTTON =
  'rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60'
const GOLD_SMALL =
  'rounded-md bg-brand-gold px-3 py-1.5 text-xs font-bold text-ink transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60'

// Reward Mode: On or Off, above the event's other buttons. On, the lists
// below give every member an Award button.
function RewardToggle({ on, onChange }) {
  return (
    <div className="flex items-center gap-2 text-sm" role="group" aria-label="Reward Mode">
      <span className="font-medium text-white/70">Reward Mode:</span>
      <div className="flex overflow-hidden rounded-md border border-white/20">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            aria-pressed={on === value}
            onClick={() => onChange(value)}
            className={`px-3 py-1.5 font-medium transition-colors ${
              on === value ? (value ? 'bg-brand-gold text-ink' : 'bg-white/15 text-white') : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {value ? 'On' : 'Off'}
          </button>
        ))}
      </div>
    </div>
  )
}

// One member's Award button: a Black & Gold Spell Pack for them, for
// attending. Once they've had one for this event it says "Awarded", and
// pressing it again asks first. The server lets a member be awarded once
// every 30 seconds, and says how long to wait.
function AwardButton({ eventId, member, count, loading, onAwards }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const award = async () => {
    setBusy(true)
    setError(null)
    try {
      onAwards((await awardMember(eventId, member._id)).awards)
      setAsking(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const errorText = error && <p className="w-full text-right text-xs text-brand-red">{error}</p>

  if (asking) {
    return (
      <div className="flex w-full flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-white/70">Award {member.username} another pack?</span>
        <button type="button" onClick={award} disabled={busy} className={GOLD_SMALL}>
          {busy ? 'Awarding…' : 'Yes, award again'}
        </button>
        <button type="button" onClick={() => setAsking(false)} disabled={busy} className={SMALL_BUTTON}>
          Cancel
        </button>
        {errorText}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={
          count > 0
            ? () => {
                setError(null)
                setAsking(true)
              }
            : award
        }
        disabled={busy || loading}
        title={count > 0 ? 'Awarded already: press to award another' : 'A Black & Gold Spell Pack, for attending'}
        className={
          count > 0
            ? 'rounded-md border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-60'
            : GOLD_SMALL
        }
      >
        {busy ? 'Awarding…' : count > 1 ? `Awarded ×${count}` : count === 1 ? 'Awarded' : 'Award'}
      </button>
      {errorText}
    </div>
  )
}

const AWARD_ALL = [
  { list: 'attending', label: 'Award All Attending', countKey: 'attendingCount', who: 'attending' },
  { list: 'interested', label: 'Award All Interested', countKey: 'interestedCount', who: 'interested' },
]

// Award All Attending and Award All Interested: a Black & Gold Spell Pack
// for everyone on that list, private profiles too (anyone awarded in the
// last 30 seconds is skipped). Each asks twice before anything happens.
function AwardAll({ event, onAwards, disabled, error }) {
  // null, or { option, step: 1 | 2 } while asking.
  const [asking, setAsking] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const run = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await awardEveryone(event._id, asking.option.list)
      onAwards(result.awards)
      const skipped = result.skipped ? ` (${result.skipped} skipped: awarded in the last 30 seconds)` : ''
      setMessage({ text: `Awarded ${result.awarded} ${result.awarded === 1 ? 'pack' : 'packs'} to everyone ${asking.option.who}${skipped}.` })
      setAsking(null)
    } catch (err) {
      setMessage({ error: true, text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const count = asking ? (event[asking.option.countKey] ?? 0) : 0

  return (
    <div className="mt-6 flex flex-col gap-3">
      {asking ? (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-gold/50 bg-brand-gold/10 p-4" role="alertdialog" aria-label="Confirm">
          <p className="text-xs font-semibold tracking-widest text-brand-gold uppercase">Check {asking.step} of 2</p>
          <p className="text-sm text-white">
            {asking.step === 1
              ? `Award a Black & Gold Spell Pack to everyone ${asking.option.who} (${count} ${count === 1 ? 'member' : 'members'})?`
              : `Are you sure? That's ${count} ${count === 1 ? 'pack' : 'packs'}, one each, and they can't be taken back.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (asking.step === 1 ? setAsking({ ...asking, step: 2 }) : run())}
              disabled={busy}
              className={GOLD_SMALL}
            >
              {busy ? 'Awarding…' : asking.step === 1 ? 'Yes, next' : `Yes, award all ${count}`}
            </button>
            <button type="button" onClick={() => setAsking(null)} disabled={busy} className={SMALL_BUTTON}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {AWARD_ALL.map((option) => (
            <button
              key={option.list}
              type="button"
              disabled={disabled || !(event[option.countKey] > 0)}
              onClick={() => {
                setMessage(null)
                setAsking({ option, step: 1 })
              }}
              className="rounded-md border border-brand-gold/60 px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/10 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {(message || error) && (
        <p className={`text-sm ${message?.error || (!message && error) ? 'text-brand-red' : 'text-emerald-300'}`}>{message?.text ?? error}</p>
      )}
    </div>
  )
}

// Edit and Delete, for moderators and admins, and for the member who made a
// member screening. Delete asks first, right where the button was, so a stray
// click can't remove an event. Moderators and admins also get Promote/Demote.
// Before it starts, Promote (`canRepost`) sends it to the top of members'
// Notifications again: everyone's for a club event, the host's followers'
// for a member screening. It's done once per visit to the page.
function ManageEvent({ eventId, official, isHost, canRepost, canPromote, onOfficialChange }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [reposting, setReposting] = useState(false)
  // How many members it went to, once it has.
  const [sentTo, setSentTo] = useState(null)
  const [error, setError] = useState(null)

  const handleRepost = async () => {
    setReposting(true)
    setError(null)

    try {
      const result = await repostEvent(eventId)
      setSentTo(result.sentTo)
    } catch (err) {
      setError(err.message)
    } finally {
      setReposting(false)
    }
  }

  const handlePromote = async () => {
    setPromoting(true)
    setError(null)

    try {
      const result = await setEventOfficial(eventId, !official)
      onOfficialChange(result.official)
    } catch (err) {
      setError(err.message)
    } finally {
      setPromoting(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      await deleteEvent(eventId)
      navigate('/club_events/all', { replace: true })
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  const buttonClasses =
    'rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'

  const dangerClasses =
    'rounded-md border border-brand-red/60 px-4 py-2 text-sm font-medium text-brand-red transition-colors hover:bg-brand-red/10'

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {confirming ? (
        <>
          <span className="text-sm text-white/70">
            Delete this event? This can't be undone.
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className={buttonClasses}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          {canRepost && (
            <button
              type="button"
              onClick={handleRepost}
              disabled={reposting || sentTo !== null}
              title={`Send it to the top of ${
                official ? "every member's" : isHost ? "your followers'" : "the host's followers'"
              } Notifications again`}
              className="rounded-md border border-brand-gold/60 px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/10 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
            >
              {sentTo !== null ? '✓ Promoted' : reposting ? 'Promoting…' : 'Promote'}
            </button>
          )}
          {canPromote && (
            <button
              type="button"
              onClick={handlePromote}
              disabled={promoting}
              className={`${buttonClasses} disabled:cursor-wait disabled:opacity-60`}
            >
              {official ? 'Demote to member screening' : 'Promote to official'}
            </button>
          )}
          <Link to={`/club_events/${eventId}/edit`} className={buttonClasses}>
            Edit
          </Link>
          <button type="button" onClick={() => setConfirming(true)} className={dangerClasses}>
            Delete
          </button>
        </>
      )}

      {sentTo !== null && (
        <p className="w-full text-right text-sm text-white/60">
          Back at the top of {sentTo} {sentTo === 1 ? "member's" : "members'"} Notifications.
        </p>
      )}
      {error && <p className="w-full text-right text-sm text-brand-red">{error}</p>}
    </div>
  )
}

export default EventDetail
