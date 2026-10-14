import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import EventForm from '../components/events/EventForm'
import { createEvent } from '../services/events'
import { getCurrentUser } from '../utils/currentUser'
import { canCreateEvents } from '../utils/permissions'

function CreateEvent() {
  const [currentUser] = useState(getCurrentUser)
  const navigate = useNavigate()

  // Anyone below moderator who types the URL in gets bounced. The real guard is the
  // backend refusing POST /api/events without a moderator/admin token.
  if (!canCreateEvents(currentUser)) return <Navigate to="/club_events" replace />

  const handleCreate = async (payload) => {
    const created = await createEvent(payload)
    navigate(`/club_events/${created._id}`)
  }

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

        <EventForm
          submitLabel="Create event"
          savingLabel="Creating…"
          onSubmit={handleCreate}
          cancelTo="/club_events"
        />
      </div>
    </section>
  )
}

export default CreateEvent
