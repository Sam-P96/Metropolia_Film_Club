import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { deleteEvent, getEvent, setEventRsvp } from '../services/events'
import useApi from '../hooks/useApi'
import { getCurrentUser } from '../utils/currentUser'
import { formatEventDate, formatEventTime } from '../utils/eventDates'
import { googleCalendarUrl } from '../utils/googleCalendar'
import { canManageEvents } from '../utils/permissions'

function EventDetail({ isAuthenticated }) {
  const { eventId } = useParams()
  const { data: event, loading, error, setData } = useApi(() => getEvent(eventId), [eventId])

  const [currentUser] = useState(getCurrentUser)
  const canManage = canManageEvents(currentUser)

  // A broken gif link shouldn't leave an empty frame on the page.
  const [imageFailed, setImageFailed] = useState(false)

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

          {canManage && <ManageEvent eventId={event._id} />}
        </div>

        <div className="mt-8 grid items-start gap-12 md:grid-cols-2">
          <div>
            <p
              className={`text-sm font-semibold tracking-widest uppercase ${
                isPast ? 'text-white/40' : 'text-brand-gold'
              }`}
            >
              {isPast ? 'Past event' : 'Upcoming event'}
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
            </dl>

            {event.description && (
              <p className="mt-8 leading-relaxed whitespace-pre-line text-white/70">
                {event.description}
              </p>
            )}

            {!isPast && (
              <a
                href={googleCalendarUrl(event)}
                target="_blank"
                rel="noreferrer"
                className="mt-10 inline-block rounded-md border border-brand-gold/60 px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/10"
              >
                + Add to Google Calendar
              </a>
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
              onChange={(attendance) => setData((prev) => ({ ...prev, ...attendance }))}
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
// visitors are sent to log in first, then back here.
function Attendance({ event, isPast, isAuthenticated, myId, onChange }) {
  const [shown, setShown] = useState('attending')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const myRsvp = event.myRsvp ?? null
  const current = RSVPS.find((option) => option.key === shown)
  const people = event[current.key] ?? []
  // Members with a private profile are counted but not listed.
  const hidden = (event[current.countKey] ?? 0) - people.length

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
              <li key={user._id}>
                <Link
                  to={`/users/${user._id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
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
                    <p className="truncate font-medium transition-colors group-hover:text-brand-gold">
                      {user.username}
                      {user._id === myId && (
                        <span className="ml-2 text-xs font-normal text-white/40">you</span>
                      )}
                    </p>
                    <p className="text-xs text-white/40">{user.memberTitle}</p>
                  </div>
                </Link>
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

// Edit and Delete, for moderators and admins. Delete asks first, right where
// the button was, so a stray click can't remove an event.
function ManageEvent({ eventId }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

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
          <Link to={`/club_events/${eventId}/edit`} className={buttonClasses}>
            Edit
          </Link>
          <button type="button" onClick={() => setConfirming(true)} className={dangerClasses}>
            Delete
          </button>
        </>
      )}

      {error && <p className="w-full text-right text-sm text-brand-red">{error}</p>}
    </div>
  )
}

export default EventDetail
