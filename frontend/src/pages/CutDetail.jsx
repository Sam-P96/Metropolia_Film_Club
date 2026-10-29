import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { CutNotice } from '../components/feed/FeedItem'
import useApi from '../hooks/useApi'
import { getCut } from '../services/cuts'

// One cut on its own page, with its replies open under it: where a Feed
// link to a reply goes (#comment-<id> scrolls to it and flashes it). Cuts
// are for logged-in members, so anyone else logs in first and comes back.
function CutDetail({ isAuthenticated }) {
  const { cutId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: item, loading, error } = useApi(() => getCut(cutId), [cutId], {
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: `${location.pathname}${location.hash}` }} replace />
  }

  if (loading) {
    return (
      <section className="px-5 py-24 text-center text-white/50 sm:px-8">
        Loading…
      </section>
    )
  }

  if (!item) {
    const notFound = error?.status === 404

    return (
      <section className="mx-auto max-w-3xl px-5 py-24 text-white sm:px-8">
        <h1 className="text-3xl font-bold">{notFound ? 'Cut not found' : "Couldn't load this cut"}</h1>
        <p className="mt-3 text-white/60">
          {notFound
            ? 'It may have been deleted.'
            : 'Something went wrong on our end. Try refreshing the page.'}
        </p>
        <Link
          to="/feed"
          className="mt-6 inline-block font-medium text-brand-gold transition-colors hover:text-white"
        >
          Back to Notifications →
        </Link>
      </section>
    )
  }

  return (
    <section className="text-white">
      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <h1 className="sr-only">{item.actors[0].username}'s cut</h1>

        <Link to="/feed" className="text-sm text-white/50 transition-colors hover:text-white">
          ← Back to Notifications
        </Link>

        <div className="mt-8">
          <CutNotice
            key={item._id}
            item={item}
            repliesOpen
            onDeleted={() => navigate('/feed', { replace: true })}
          />
        </div>
      </div>
    </section>
  )
}

export default CutDetail
