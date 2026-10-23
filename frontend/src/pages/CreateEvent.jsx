import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import EventForm from '../components/events/EventForm'
import { createEvent } from '../services/events'
import { getCurrentUser } from '../utils/currentUser'
import { canCreateEvents, canMakeEventsOfficial } from '../utils/permissions'

function CreateEvent() {
  const [currentUser] = useState(getCurrentUser)
  const navigate = useNavigate()

  // Logged-out visitors log in first, then come back here. The real guard is
  // the backend refusing POST /api/events without a login.
  if (!canCreateEvents(currentUser)) {
    return <Navigate to="/login" state={{ from: '/club_events/new' }} replace />
  }

  // Members host member screenings. Moderators and admins choose.
  const canMakeOfficial = canMakeEventsOfficial(currentUser)

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
          {canMakeOfficial ? (
            <>Create an <span className="text-brand-gold">event</span></>
          ) : (
            <>Host a <span className="text-brand-gold">screening</span></>
          )}
        </h1>

        <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

        {!canMakeOfficial && (
          <p className="-mt-2 mb-8 text-sm text-white/60">
            It'll be listed under Member screenings on the club events page. A
            moderator may promote it to an official club event.
          </p>
        )}

        <EventForm
          submitLabel={canMakeOfficial ? 'Create event' : 'Create screening'}
          savingLabel="Creating…"
          onSubmit={handleCreate}
          cancelTo="/club_events"
          canMakeOfficial={canMakeOfficial}
        />
      </div>
    </section>
  )
}

export default CreateEvent
