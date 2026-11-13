import { useState } from 'react'
import { createPortal } from 'react-dom'
import FirstPlaceEditor from './FirstPlaceEditor'
import { useFirstPlace } from './firstPlaceStore'
import { getCurrentUserId } from '../../utils/currentUser'

// The ∞ beside a member's name on their own profile, while they hold a
// First Place title: the six stone colours sliding through it. It opens
// their effect's editor. Nobody else sees it, and it goes when they lose
// every title. An open editor stays open with what it opened with, so if
// the title goes meanwhile, Save can say so before it closes.
export default function InfinityButton({ user }) {
  const mine = String(user._id) === getCurrentUserId()
  const firstPlace = useFirstPlace(mine ? user._id : null)
  const [editing, setEditing] = useState(null)

  return (
    <>
      {firstPlace && (
        <button
          type="button"
          onClick={() => setEditing(firstPlace)}
          aria-label="Your First Place effect"
          title={`Your First Place effect (${firstPlace.titles.join(' · ')})`}
          className="fp-infinity cursor-pointer rounded-md px-1 text-3xl leading-none font-bold transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold motion-reduce:transition-none"
        >
          ∞
        </button>
      )}
      {editing && createPortal(<FirstPlaceEditor user={user} firstPlace={editing} onClose={() => setEditing(null)} />, document.body)}
    </>
  )
}
