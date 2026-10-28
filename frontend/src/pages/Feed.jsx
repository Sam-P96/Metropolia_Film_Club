import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import FeedItem, { ReportNotice } from '../components/feed/FeedItem'
import GifBackground from '../components/GifBackground'
import usePagedList from '../hooks/usePagedList'
import { getFeed } from '../services/feed'
import { getCurrentUser } from '../utils/currentUser'
import pinkGlowGif from '../assets/Pink Glow GIF by xponentialdesign.gif'

// Text straight on the page: light on the GIF and the purple, dark on white.
const TONES = {
  dark: {
    title: 'text-white',
    text: 'text-white/60',
    muted: 'text-white/40',
    button: 'border-white/20 bg-white/5 text-white hover:border-brand-gold/60 hover:bg-white/10',
  },
  light: {
    title: 'text-ink',
    text: 'text-ink/70',
    muted: 'text-ink/50',
    button: 'border-ink/20 bg-ink/5 text-ink hover:border-brand-red/60 hover:bg-ink/10',
  },
}

// The "Default" background: the Upcoming events GIF under the same dark
// glass, fixed to the window so it stays put while the page scrolls or grows
// with "Load more". It sits behind the whole page; the nav and footer have
// glass of their own.
function GifBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <GifBackground src={pinkGlowGif} />
      <div className="absolute inset-0 bg-black/65" />
    </div>
  )
}

// The Notifications page: the logged-in member's notifications, behind the bell
// in the nav. Votes on their
// reviews, replies, new followers, new reviews from members they follow, and
// trending reviews. The newest 100, 10 at a time. App.jsx sends logged-out
// visitors to log in first. Its background is theirs to pick in Edit profile.
function Feed() {
  // Clicking the bell in the nav while already here is a new navigation
  // with a new key, so the page loads again from the top, like a refresh.
  const { key } = useLocation()
  const feed = usePagedList(getFeed, [key], 'items')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [key])

  const items = feed.data?.items ?? []
  // Moderators and admins only: open reports, pinned above everything else.
  const reports = feed.data?.reports ?? []

  const handleResolved = (reviewId) =>
    feed.setData((previous) => ({
      ...previous,
      reports: previous.reports.filter((report) => report._id !== reviewId),
    }))

  // The server's answer once it's in; until then the copy kept with the
  // login, so the page doesn't flash from one background to another.
  const background = feed.data?.background ?? getCurrentUser()?.feedBackground ?? 'default'
  const light = background === 'white'
  const tone = light ? TONES.light : TONES.dark

  return (
    <section className={light ? 'min-h-screen bg-white' : ''}>
      {background === 'default' && <GifBackdrop />}

      <div className="mx-auto max-w-5xl px-8 py-20">
        <h1 className={`text-3xl font-bold ${tone.title}`}>Notifications</h1>
        <p className={`mt-2 text-sm ${tone.text}`}>
          Likes, dislikes and replies on your reviews, new followers, new reviews and member
          screenings from members you follow, new club events, and what's trending. Your last
          100, kept for three months.
        </p>

        {reports.length > 0 && (
          <ul className="mt-10 space-y-6" aria-label="Reported reviews">
            {reports.map((report) => (
              <li key={report._id}>
                <ReportNotice report={report} light={light} onResolved={handleResolved} />
              </li>
            ))}
          </ul>
        )}

        {feed.loading ? (
          <p className={`mt-10 text-sm ${tone.muted}`}>Loading…</p>
        ) : feed.error ? (
          <p className={`mt-10 ${tone.text}`}>Couldn't load your feed. Try refreshing the page.</p>
        ) : items.length === 0 ? (
          <p className={`mt-10 ${tone.text}`}>
            Nothing here yet. Follow some members, write a review, or join in the comments.
          </p>
        ) : (
          <ul className="mt-10 space-y-12">
            {items.map((item) => (
              <li key={item._id}>
                <FeedItem item={item} light={light} />
              </li>
            ))}
          </ul>
        )}

        {feed.data?.hasMore && (
          <button
            type="button"
            onClick={feed.loadMore}
            disabled={feed.loadingMore}
            className={`mt-12 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${tone.button}`}
          >
            {feed.loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}

        {feed.moreError && <p className="mt-3 text-sm text-brand-red">{feed.moreError}</p>}
      </div>
    </section>
  )
}

export default Feed
