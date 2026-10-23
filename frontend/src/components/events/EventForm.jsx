import { useState } from 'react'
import { Link } from 'react-router-dom'

import { formatEventDate, formatEventTime } from '../../utils/eventDates'

// A stored UTC time as the '2026-11-07' and '19:00' the inputs want, in the
// browser's own time zone — the same zone handleSubmit reads them back in,
// so opening an event and saving it unchanged doesn't move it.
function toInputValues(iso) {
  const date = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')

  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

// Shared by the create and edit pages. With `initialEvent` it starts filled
// in. `onSubmit` gets the payload and returns a promise; if that rejects, its
// message is shown and the form stays as it was. `canMakeOfficial` adds the
// "Official club event" box (moderators and admins creating an event).
function EventForm({
  initialEvent = null,
  submitLabel,
  savingLabel,
  onSubmit,
  cancelTo,
  canMakeOfficial = false,
}) {
  const initialWhen = initialEvent ? toInputValues(initialEvent.startsAt) : null

  const [title, setTitle] = useState(initialEvent?.title ?? '')
  const [date, setDate] = useState(initialWhen?.date ?? '')
  const [time, setTime] = useState(initialWhen?.time ?? '19:00')
  const [location, setLocation] = useState(initialEvent?.location ?? '')
  const [description, setDescription] = useState(initialEvent?.description ?? '')
  const [filmTitle, setFilmTitle] = useState(initialEvent?.film?.title ?? '')
  const [tmdbId, setTmdbId] = useState(
    initialEvent?.film?.tmdbId ? String(initialEvent.film.tmdbId) : ''
  )
  const [gifUrl, setGifUrl] = useState(initialEvent?.gifUrl ?? '')
  const [official, setOfficial] = useState(true)

  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // '2026-11-07' + '19:00' parses as LOCAL time, which for someone in Finland
  // is Helsinki time. toISOString() then converts it to UTC for storage.
  const startsAt = date && time ? new Date(`${date}T${time}`) : null
  const validDate = startsAt && !Number.isNaN(startsAt.getTime())

  const handleSubmit = async (e) => {
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
      ...(canMakeOfficial && { official }),
    }

    setSaving(true)

    try {
      await onSubmit(payload)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const inputClasses =
    'w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'

  const labelClasses = 'mb-2 block text-sm font-medium text-white/70'

  return (
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
          placeholder="Myyrmäki Campus, Auditorium A"
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

      {canMakeOfficial && (
        <label className="flex items-start gap-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={official}
            onChange={(e) => setOfficial(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-gold"
          />
          <span>
            Official club event
            <span className="mt-1 block text-white/40">
              Untick to post it as a member screening instead.
            </span>
          </span>
        </label>
      )}

      <div className="flex items-center gap-4">
        <button
          disabled={saving}
          className="rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? savingLabel : submitLabel}
        </button>

        <Link
          to={cancelTo}
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

    </form>
  )
}

export default EventForm
