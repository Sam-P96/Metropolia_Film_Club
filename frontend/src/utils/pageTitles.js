import { matchPath } from 'react-router-dom'
import { SLOTS } from '../../../shared/slots/config.js'

const SITE = 'Kino Kaverit'

// Each page's name in the browser tab, history and bookmarks, by its route
// in App.jsx: "Games · Kino Kaverit". The first pattern that matches wins,
// so a fixed path comes before a :param one beside it. null keeps the plain
// site name (Home, and the SECRET pages, which stay discreet). A new page
// needs a line here, or its tab says "Page Not Found".
const TITLES = [
  ['/', null],
  ['/about', 'About'],
  ['/signup', 'Sign Up'],
  ['/login', 'Log In'],
  ['/account', 'Your Profile'],
  ['/forgot-password', 'Forgot Password'],
  ['/reset-password', 'Reset Password'],
  ['/search', 'Search'],
  ['/privacy', 'Privacy'],
  ['/admin', 'Admin Panel'],
  ['/SECRET', null],
  ['/SECRETpfp', null],
  ['/SECRETresonance', null],
  ['/SECRETloanshark', null],
  ['/members', 'Members'],
  ['/resonance', 'Resonance'],
  ['/resonance/:userId', 'Resonance'],
  ['/users/:userId/followers', 'Followers'],
  ['/users/:userId/following', 'Following'],
  ['/users/:userId/films', 'Film List'],
  ['/users/:userId', 'Profile'],
  ['/banned', 'Banned List'],
  ['/cuts/:cutId', 'Cut'],
  ['/feed', 'Notifications'],
  ['/wheel', 'Movie Wheel'],
  ['/daily-quiz', 'Daily Quiz'],
  ['/daily-quiz/questions', 'Quiz Questions'],
  ['/games', 'Games'],
  ['/games/farkle', 'Kino Farkle'],
  ['/games/farkle/bot', 'Kino Farkle vs Clanker'],
  ['/games/farkle/:matchId', 'Kino Farkle'],
  ['/games/gomoku', 'Infinite Gomoku'],
  ['/games/gomoku/clanker', 'Infinite Gomoku vs Clanker'],
  ['/games/gomoku/shop', 'Infinite Gomoku Shop'],
  ['/games/gomoku/local', 'Infinite Gomoku'],
  ['/games/gomoku/dev', 'Infinite Gomoku'],
  ['/games/gomoku/:matchId', 'Infinite Gomoku'],
  ['/games/scratch', 'Box Office Scratch'],
  ['/games/slots', SLOTS.name],
  ['/games/double-or-nothing', 'Double or Nothing'],
  ['/games/steal-and-defend', 'Steal and Defend'],
  ['/games/steal-and-defend/play', 'Steal and Defend'],
  ['/games/steal-and-defend/shop', 'Steal and Defend Shop'],
  ['/games/steal-and-defend/market', 'Steal and Defend Market'],
  ['/games/steal-and-defend/attacks/:attackId', 'Steal and Defend'],
  ['/games/steal-and-defend/admin', 'Steal and Defend Admin'],
  ['/games/poker', 'Kino Poker'],
  ['/games/poker/table', 'Kino Poker'],
  ['/games/loan-shark', 'Loan Shark'],
  ['/games/loan-shark/black-market', 'Black Market'],
  ['/games/loan-shark/black-market/dev', 'Black Market Test Tool'],
  ['/reviews/:reviewId', 'Review'],
  ['/movie_reviews', 'Movie Reviews'],
  ['/films', 'Films'],
  ['/films/:tmdbId/review', 'Write a Review'],
  ['/films/:tmdbId/reviews', 'Reviews'],
  ['/films/:tmdbId', 'Film'],
  ['/club_events', 'Club Events'],
  ['/club_events/all', 'All Events'],
  ['/club_events/plan_to_watch', 'Plan to Watch'],
  ['/club_events/new', 'New Event'],
  ['/club_events/:eventId/edit', 'Edit Event'],
  ['/club_events/:eventId', 'Event'],
  ['/wallet', 'Wallet'],
]

// The tab title for `pathname`. An address the site doesn't have (App.jsx
// shows NotFound there) says so.
export function pageTitle(pathname) {
  const hit = TITLES.find(([pattern]) => matchPath(pattern, pathname))
  if (!hit) return `Page Not Found · ${SITE}`
  return hit[1] ? `${hit[1]} · ${SITE}` : SITE
}
