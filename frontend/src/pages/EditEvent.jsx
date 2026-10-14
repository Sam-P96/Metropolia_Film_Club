import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import EventForm from '../components/events/EventForm'
import { getEvent, updateEvent } from '../services/events'
import useApi from '../hooks/useApi'
import { getCurrentUser } from '../utils/currentUser'
import { canManageEvents } from '../utils/permissions'

function EditEvent() {
  const { eventId } = useParams()
  const [currentUser] = useState(getCurrentUser)
  const navigate = useNavigate()

  const allowed = canManageEvents(currentUser)
  const { data: event, loading, error } = useApi(() => getEvent(eventId), [eventId], {
    enabled: allowed,
  })

  // Same as the create page: bounce anyone below moderator. The backend
  // refuses their PUT regardless.
  if (!allowed) return <Navigate to={`/club_events/${eventId}`} replace />

  if (loading) {
    return (
      <section className="px-5 py-24 text-center text-white/50 sm:px-8">
        Loading…
      </section>
    )
  }

  if (!event) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-24 text-white sm:px-8">
        <h1 className="text-3xl font-bold">
          {error?.status === 404 ? 'Event not found' : "Couldn't load this event"}
        </h1>
        <Link
          to="/club_events/all"
          className="mt-6 inline-block font-medium text-brand-gold transition-colors hover:text-white"
        >
          See all events →
        </Link>
      </section>
    )
  }

  const handleSave = async (payload) => {
    await updateEvent(eventId, payload)
    navigate(`/club_events/${eventId}`)
  }

  return (
    <section className="px-5 py-14 text-white sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">

        <Link
          to={`/club_events/${eventId}`}
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          ← Back to the event
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          Edit <span className="text-brand-gold">event</span>
        </h1>

        <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

        {/* Keyed so the form refills if you move to a different event. */}
        <EventForm
          key={event._id}
          initialEvent={event}
          submitLabel="Save changes"
          savingLabel="Saving…"
          onSubmit={handleSave}
          cancelTo={`/club_events/${eventId}`}
        />
      </div>
    </section>
  )
}

export default EditEvent
