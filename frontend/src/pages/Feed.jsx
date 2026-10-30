import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import CutComposer from '../components/feed/CutComposer'
import FeedItem, { PasswordResetNotice, ReportNotice } from '../components/feed/FeedItem'
import { OngoingGame } from '../components/farkle/FarkleNotice'
import GifBackground from '../components/GifBackground'
import { OnOffSwitch } from '../components/profile/SettingRow'
import usePagedList from '../hooks/usePagedList'
import { getAllCuts } from '../services/cuts'
import { getFeed } from '../services/feed'
import { getCurrentUser } from '../utils/currentUser'
import { canModerate } from '../utils/permissions'
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

// Takes a deleted cut out of a loaded list. The next page starts that much
// earlier, since everything after it moved up.
const withoutCut = (cutId) => (previous) => {
  if (!previous) return previous
  const kept = previous.items.filter((item) => item.cut?._id !== cutId)
  return { ...previous, items: kept, next: previous.next - (previous.items.length - kept.length) }
}

// The Notifications page: the logged-in member's notifications, behind the bell
// in the nav. Votes on their
// reviews, replies, new followers, cuts and new reviews from members they
// follow, and trending reviews. The newest 100, 10 at a time. Above it all,
// the box for posting a cut of their own. Moderators and admins can switch
// on "Show all cuts" to see every member's cuts there instead, and delete
// any of them. App.jsx sends logged-out visitors to log in first. Its
// background is theirs to pick in Edit profile.
function Feed() {
  // Clicking the bell in the nav while already here is a new navigation
  // with a new key, so the page loads again from the top, like a refresh.
  const { key } = useLocation()
  const feed = usePagedList(getFeed, [key], 'items')

  const [moderator] = useState(() => canModerate(getCurrentUser()))
  const [showAllCuts, setShowAllCuts] = useState(false)
  const allCuts = usePagedList(getAllCuts, [key], 'items', { enabled: showAllCuts })
  const list = showAllCuts ? allCuts : feed

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [key])

  const items = list.data?.items ?? []
  // Moderators and admins only: password reset requests and open reports,
  // pinned above everything else.
  const passwordResets = feed.data?.passwordResets ?? []
  const reports = feed.data?.reports ?? []
  // Farkle games they're playing, at the very top, always.
  const games = feed.data?.games ?? []

  const handleResetDecided = (requestId) =>
    feed.setData((previous) => ({
      ...previous,
      passwordResets: previous.passwordResets.filter((request) => request._id !== requestId),
    }))

  // A deleted cut leaves both lists: it can be in your notifications and
  // in all cuts.
  const handleCutDeleted = (cutId) => {
    feed.setData(withoutCut(cutId))
    allCuts.setData(withoutCut(cutId))
  }

  // A new cut is in the first page, so that's loaded again to show it.
  const handleCutPosted = () => {
    feed.reload()
    allCuts.reload()
  }

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
        <CutComposer light={light} onPosted={handleCutPosted} />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className={`text-3xl font-bold ${tone.title}`}>
            {showAllCuts ? 'All cuts' : 'Notifications'}
          </h1>

          {moderator && (
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${tone.text}`}>Show all cuts</span>
              <OnOffSwitch on={showAllCuts} onChange={setShowAllCuts} label="Show all cuts" />
            </div>
          )}
        </div>
        <p className={`mt-2 text-sm ${tone.text}`}>
          {showAllCuts
            ? "Every member's cuts, newest first, whoever they reach. Deleting one here takes it out of everyone's Notifications."
            : "Likes, dislikes and replies on your reviews, replies to your cuts, new followers, cuts, new reviews and member screenings from members you follow, new club events, what's trending or viral, your daily PP, your Farkle games (games you're playing stay at the very top, and challenges stay pinned until you answer), and how the members you follow do at Farkle. Your last 100, kept for three months."}
        </p>

        {!showAllCuts && games.length > 0 && (
          <ul className="mt-10 space-y-6" aria-label="Your Farkle games">
            {games.map((match) => (
              <li key={match._id}>
                <OngoingGame match={match} />
              </li>
            ))}
          </ul>
        )}

        {passwordResets.length > 0 && (
          <ul className="mt-10 space-y-6" aria-label="Password reset requests">
            {passwordResets.map((request) => (
              <li key={request._id}>
                <PasswordResetNotice request={request} light={light} onResolved={handleResetDecided} />
              </li>
            ))}
          </ul>
        )}

        {reports.length > 0 && (
          <ul className="mt-10 space-y-6" aria-label="Reported reviews">
            {reports.map((report) => (
              <li key={report._id}>
                <ReportNotice report={report} light={light} onResolved={handleResolved} />
              </li>
            ))}
          </ul>
        )}

        {list.loading ? (
          <p className={`mt-10 text-sm ${tone.muted}`}>Loading…</p>
        ) : list.error ? (
          <p className={`mt-10 ${tone.text}`}>
            {showAllCuts ? "Couldn't load the cuts." : "Couldn't load your feed."} Try refreshing the
            page.
          </p>
        ) : items.length === 0 ? (
          <p className={`mt-10 ${tone.text}`}>
            {showAllCuts
              ? 'Nobody has posted a cut yet.'
              : 'Nothing here yet. Follow some members, write a review, or join in the comments.'}
          </p>
        ) : (
          <ul className="mt-10 space-y-12">
            {items.map((item) => (
              <li key={item._id}>
                <FeedItem item={item} light={light} onCutDeleted={handleCutDeleted} />
              </li>
            ))}
          </ul>
        )}

        {list.data?.hasMore && (
          <button
            type="button"
            onClick={list.loadMore}
            disabled={list.loadingMore}
            className={`mt-12 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${tone.button}`}
          >
            {list.loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}

        {list.moreError && <p className="mt-3 text-sm text-brand-red">{list.moreError}</p>}
      </div>
    </section>
  )
}

export default Feed
