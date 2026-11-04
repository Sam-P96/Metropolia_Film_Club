import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import CutComposer from '../components/feed/CutComposer'
import FeedItem, { ReportNotice } from '../components/feed/FeedItem'
import { OngoingGame } from '../components/farkle/FarkleNotice'
import { PokerLive } from '../components/poker/PokerNotice'
import GifBackground from '../components/GifBackground'
import PillToggle from '../components/PillToggle'
import usePagedList from '../hooks/usePagedList'
import { getFeed, markNotificationsSeen } from '../services/feed'
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

// The toggle at the top: which notifications to show (the server sorts them:
// FEED_FILTERS in backend/controllers/feedController.js), what each one
// says it shows, and what it says when there's nothing. Every one shows club
// events and big news.
const FILTERS = [
  {
    value: 'all',
    label: 'All',
    about:
      "Likes, dislikes and replies on your reviews, replies to your cuts, new followers, cuts, new reviews and member screenings from members you follow, new club events, what's trending or viral, your daily PP, your Farkle games (games you're playing stay at the top, and challenges stay pinned until you answer), the Kino Poker table while anyone's playing (up top, with a way in), how the members you follow do at Farkle, Box Office Scratch and Double or Nothing, your Steal and Defend attacks, and every jackpot, Double or Nothing win, Kino Poker win, Kino Kasino tripling and Steal and Defend Critical Hit (new jackpots up top until you've seen them). Your last 100, kept for three months.",
    empty: 'Nothing here yet. Follow some members, write a review, or join in the comments.',
  },
  {
    value: 'events',
    label: 'Events',
    about: "New club events and member screenings, plus the big news: what's trending or viral, jackpots, Double or Nothing wins, Kino Kasino triplings and Steal and Defend Critical Hits.",
    empty: 'No events yet.',
  },
  {
    value: 'reviews',
    label: 'Reviews',
    about:
      "Likes, dislikes and replies on your reviews, new reviews from members you follow, what's trending, and members turning PvP on. Events and the big news show here too.",
    empty: 'Nothing about reviews yet. Write one, or follow some members.',
  },
  {
    value: 'games',
    label: 'Games',
    about:
      'Your Farkle games and challenges, the Kino Poker table while anyone is playing, how the members you follow do at Farkle, Box Office Scratch and Double or Nothing, your Steal and Defend attacks, jackpots, wins (Kino Poker ones too), Kino Kasino triplings and Critical Hits, your daily PP and gifts. Events and the big news show here too.',
    empty: 'No games yet. Find one on the Games page.',
  },
]

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
// the box for posting a cut of their own. From the top: for moderators and
// admins, open reports; then the Kino Poker table while members are
// playing, and the Farkle games they're playing; then jackpots they haven't seen yet; then everything
// else as usual (pinned challenges, then newest first). Opening the page
// marks it all seen, so the bell in the nav goes dark. The All / Events /
// Reviews / Games toggle narrows it down (FILTERS above). App.jsx sends
// logged-out visitors to log in first. Its background is theirs to pick in
// Edit profile.
function Feed() {
  // Clicking the bell in the nav while already here is a new navigation
  // with a new key, so the page loads again from the top, like a refresh.
  const { key } = useLocation()
  const [filter, setFilter] = useState('all')
  const feed = usePagedList((skip) => getFeed(skip, filter), [key, filter], 'items')
  const shown = FILTERS.find((option) => option.value === filter)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [key])

  // Moderators and admins only: open reports, pinned above everything else
  // (with All and Reviews).
  const reports = feed.data?.reports ?? []
  // Farkle games they're playing, under those (with All and Games). A game
  // that's over is an ordinary notification, down in the list by its date.
  const games = feed.data?.games ?? []
  // The Kino Poker table while members are playing at it, with the games.
  const poker = feed.data?.poker ?? null
  // Jackpots they hadn't seen when the page opened, under the games. The
  // same notices are in the list by date too, so they're left out there.
  const jackpots = feed.data?.jackpots ?? []
  const jackpotIds = new Set(jackpots.map((item) => item._id))
  const items = (feed.data?.items ?? []).filter((item) => !jackpotIds.has(item._id))

  // Once the page is in, everything on it is seen: up to the moment the
  // server put it together, so anything that came in since still counts as
  // new. Next time, today's jackpots wait in line by their date like
  // everything else.
  const seenUntil = feed.data?.now
  useEffect(() => {
    if (seenUntil) markNotificationsSeen(seenUntil).catch(() => {})
  }, [seenUntil])

  const handleCutDeleted = (cutId) => feed.setData(withoutCut(cutId))

  // A new cut is in the first page, so that's loaded again to show it.
  const handleCutPosted = () => feed.reload()

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
          <h1 className={`text-3xl font-bold ${tone.title}`}>Notifications</h1>
          <PillToggle options={FILTERS} value={filter} onChange={setFilter} label="Show" />
        </div>
        <p className={`mt-2 text-sm ${tone.text}`}>{shown.about}</p>

        {reports.length > 0 && (
          <ul className="mt-10 space-y-6" aria-label="Reported reviews">
            {reports.map((report) => (
              <li key={report._id}>
                <ReportNotice report={report} light={light} onResolved={handleResolved} />
              </li>
            ))}
          </ul>
        )}

        {poker && (
          <div className="mt-10">
            <PokerLive table={poker} />
          </div>
        )}

        {games.length > 0 && (
          <ul className="mt-10 space-y-6" aria-label="Your Farkle games">
            {games.map((match) => (
              <li key={match._id}>
                <OngoingGame match={match} />
              </li>
            ))}
          </ul>
        )}

        {jackpots.length > 0 && (
          <ul className="mt-10 space-y-12" aria-label="New jackpots">
            {jackpots.map((item) => (
              <li key={item._id}>
                <FeedItem item={item} light={light} onCutDeleted={handleCutDeleted} />
              </li>
            ))}
          </ul>
        )}

        {feed.loading ? (
          <p className={`mt-10 text-sm ${tone.muted}`}>Loading…</p>
        ) : feed.error ? (
          <p className={`mt-10 ${tone.text}`}>Couldn&apos;t load your feed. Try refreshing the page.</p>
        ) : items.length === 0 && jackpots.length === 0 ? (
          <p className={`mt-10 ${tone.text}`}>{shown.empty}</p>
        ) : items.length > 0 && (
          <ul className="mt-10 space-y-12">
            {items.map((item) => (
              <li key={item._id}>
                <FeedItem item={item} light={light} onCutDeleted={handleCutDeleted} />
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
