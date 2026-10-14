import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import users from '../data/users'
import { getCurrentUser } from '../utils/currentUser'
import { canCreateEvents } from '../utils/permissions'
import { formatEventDate, formatEventTime } from '../utils/eventDates'

function CreateEvent() {
  const [currentUser] = useState(getCurrentUser)
  const canCreate = canCreateEvents(users, currentUser)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('19:00')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [filmTitle, setFilmTitle] = useState('')
  const [tmdbId, setTmdbId] = useState('')
  const [gifUrl, setGifUrl] = useState('')

  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  // Anyone below moderator who types the URL in gets bounced. The real guard is the
  // backend refusing POST /api/events without a moderator/admin token.
  if (!canCreate) return <Navigate to="/club_events" replace />

  // '2026-11-07' + '19:00' parses as LOCAL time, which for someone in Finland
  // is Helsinki time. toISOString() then converts it to UTC for storage.
  const startsAt = date && time ? new Date(`${date}T${time}`) : null
  const validDate = startsAt && !Number.isNaN(startsAt.getTime())

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('The event needs a title.')
      return
    }

    if (!validDate) {
      setError('Pick a date and a time.')
      return
    }

    const payload = {
      title: title.trim(),
      startsAt: startsAt.toISOString(),
      location: location.trim(),
      description: description.trim(),
      film: filmTitle.trim()
        ? { title: filmTitle.trim(), tmdbId: tmdbId ? Number(tmdbId) : null }
        : null,
      gifUrl: gifUrl.trim() || null,
    }

    console.log('POST /api/events', payload)
    setSaved(true)
  }

  const inputClasses =
    'w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'

  const labelClasses = 'mb-2 block text-sm font-medium text-white/70'

  return (
    <section className="px-5 py-14 text-white sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">

        <Link
          to="/club_events"
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          ← Back to club events
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          Create an <span className="text-brand-gold">event</span>
        </h1>

        <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label htmlFor="title" className={labelClasses}>Title</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Screening: Perfect Blue"
              className={inputClasses}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className={labelClasses}>Date</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClasses} [color-scheme:dark]`}
              />
            </div>

            <div>
              <label htmlFor="time" className={labelClasses}>Start time</label>
              <input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`${inputClasses} [color-scheme:dark]`}
              />
            </div>
          </div>

          {validDate && (
            <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              Members will see:{' '}
              <span className="text-white">
                {formatEventDate(startsAt.toISOString())} at{' '}
                {formatEventTime(startsAt.toISOString())}
              </span>{' '}
              (Helsinki)
            </p>
          )}

          <div>
            <label htmlFor="location" className={labelClasses}>Location</label>
            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Karamalmi Campus, Auditorium A"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="description" className={labelClasses}>Description</label>
            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening, and what to expect afterwards."
              className={`${inputClasses} resize-y`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <div>
              <label htmlFor="filmTitle" className={labelClasses}>
                Film <span className="font-normal text-white/40">(optional)</span>
              </label>
              <input
                id="filmTitle"
                value={filmTitle}
                onChange={(e) => setFilmTitle(e.target.value)}
                placeholder="Perfect Blue"
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="tmdbId" className={labelClasses}>TMDB id</label>
              <input
                id="tmdbId"
                inputMode="numeric"
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value)}
                placeholder="10494"
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label htmlFor="gifUrl" className={labelClasses}>
              Image URL <span className="font-normal text-white/40">(optional)</span>
            </label>
            <input
              id="gifUrl"
              value={gifUrl}
              onChange={(e) => setGifUrl(e.target.value)}
              placeholder="https://..."
              className={inputClasses}
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange">
              Create event
            </button>

            <Link
              to="/club_events"
              className="text-sm text-white/50 transition-colors hover:text-white"
            >
              Cancel
            </Link>
          </div>

          {error && (
            <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white">
              {error}
            </p>
          )}

          {saved && (
            <p className="rounded-md border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-white">
              Event not saved — the backend isn't built yet. Check the console
              for the payload.
            </p>
          )}

        </form>
      </div>
    </section>
  )
}

export default CreateEvent