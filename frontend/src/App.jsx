import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react';
import { LOGIN_EXPIRED_EVENT } from './utils/currentUser';
import ScrollToTop from './components/ScrollToTop'
import NavigationBar from './components/NavigationBar'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ClubEvents from './pages/ClubEvents'
import Profile from "./pages/Profile";
import Wheel from './pages/Wheel';
import UserFilmList from "./pages/UserFilmList";
import ReviewDetail from "./pages/ReviewDetail";
import FilmDetail from "./pages/FilmDetail";
import FilmBrowser from "./pages/FilmBrowser";
import MovieReviews from "./pages/MovieReviews";
import FilmReviews from "./pages/FilmReviews";
import WriteReview from "./pages/WriteReview";
import AllEvents from "./pages/AllEvents";
import CreateEvent from "./pages/CreateEvent";
import EventDetail from "./pages/EventDetail";
import EditEvent from "./pages/EditEvent";
import PlanToWatchAll from "./pages/PlanToWatchAll";
import Members from "./pages/Members";
import SearchResults from "./pages/SearchResults";
import Privacy from "./pages/Privacy";
import Feed from "./pages/Feed";
import CutDetail from "./pages/CutDetail";
import FollowList from "./pages/FollowList";
import BannedList from "./pages/BannedList";
import SecretPfp from "./pages/SecretPfp";
import FarkleMatch from "./pages/FarkleMatch";
import FarkleLobby from "./pages/FarkleLobby";
import Games from "./pages/Games";
import ScratchGame from "./pages/ScratchGame";
import Wallet from "./pages/Wallet";


//ALWAYS KEEP IN MIND, WE WANT A CARD BASE LAYOUT
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user && user.token ? true : false;
  })

  // The server turned down an expired login (see services/api.js).
  useEffect(() => {
    const loggedOut = () => setIsAuthenticated(false)
    window.addEventListener(LOGIN_EXPIRED_EVENT, loggedOut)
    return () => window.removeEventListener(LOGIN_EXPIRED_EVENT, loggedOut)
  }, [])

  // Where to go once logged in: back to the page that asked for a login
  // (e.g. "Write a review"), otherwise home.
  const location = useLocation()
  const afterLogin = location.state?.from ?? '/'

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <NavigationBar
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
      />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
          <Route path="/about" element={<About isAuthenticated={isAuthenticated} />} />
          <Route path="/club_events" element={<ClubEvents isAuthenticated={isAuthenticated} />} />
          <Route path="/signup" element={
            isAuthenticated ? (<Navigate to="/" />) : (<Signup setIsAuthenticated={setIsAuthenticated} />)
          } />
          <Route path="/login" element={
            isAuthenticated ? (<Navigate to={afterLogin} />) : (<Login setIsAuthenticated={setIsAuthenticated} />)
          } />
          <Route path="/account" element={
            isAuthenticated ? (<Profile />) : (<Navigate to="/login" />)
          } />
          {/* "Forgot password?" on the login page, then choosing the new one
              once a moderator or admin approves. */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/privacy" element={<Privacy />} />
          {/* Not linked from anywhere on purpose. */}
          <Route path="/SECRETpfp" element={<SecretPfp isAuthenticated={isAuthenticated} />} />
          <Route path="/members" element={<Members />} />
          <Route path="/users/:userId" element={<Profile />} />
          <Route path="/users/:userId/followers" element={<FollowList key="followers" kind="followers" />} />
          <Route path="/users/:userId/following" element={<FollowList key="following" kind="following" />} />
          <Route path="/banned" element={
            isAuthenticated ? (<BannedList />) : (<Navigate to="/login" state={{ from: '/banned' }} />)
          } />
          {/* A cut and its replies, where Feed links to a reply go. */}
          <Route path="/cuts/:cutId" element={<CutDetail isAuthenticated={isAuthenticated} />} />
          <Route path="/feed" element={
            isAuthenticated ? (<Feed />) : (<Navigate to="/login" state={{ from: '/feed' }} />)
          } />

          <Route path="/wheel" element={<Wheel />} />
          {/* Games, from the nav. Anyone can see what there is; playing is
              for points, so the games themselves need a login, and come
              back to the same page after it (links from notifications). */}
          <Route path="/games" element={<Games />} />
          <Route path="/games/farkle" element={
            isAuthenticated ? (<FarkleLobby />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/farkle/bot" element={
            isAuthenticated ? (<FarkleMatch />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/farkle/:matchId" element={
            isAuthenticated ? (<FarkleMatch />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/scratch" element={
            isAuthenticated ? (<ScratchGame />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/users/:userId/films" element={<UserFilmList />} />
          <Route path="/reviews/:reviewId" element={<ReviewDetail isAuthenticated={isAuthenticated} />} />
          <Route path="/movie_reviews" element={<MovieReviews />} />

          {/* film routes — one route per path, all using :tmdbId */}
          <Route path="/films" element={<FilmBrowser />} />
          <Route
            path="/films/:tmdbId"
            element={<FilmDetail isAuthenticated={isAuthenticated} />}
          />
          <Route
            path="/films/:tmdbId/review"
            element={isAuthenticated ? <WriteReview /> : <Navigate to="/login" />}
          />
          <Route path="/films/:tmdbId/reviews" element={<FilmReviews />} />
          <Route path="/club_events/all" element={<AllEvents />} />
          <Route path="/club_events/plan_to_watch" element={<PlanToWatchAll />} />
          <Route path="/club_events/new" element={<CreateEvent />} />
          <Route
            path="/club_events/:eventId"
            element={<EventDetail isAuthenticated={isAuthenticated} />}
          />
          <Route path="/club_events/:eventId/edit" element={<EditEvent />} />
          <Route path="/wallet" element={
            isAuthenticated ? (<Wallet />) : (<Navigate to="/login" state={{ from: '/wallet' }} />)
          } />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

export default App