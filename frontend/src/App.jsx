import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react';
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
import DoubleOrNothing from "./pages/DoubleOrNothing";
import SlotMachine from "./pages/SlotMachine";
import Wallet from "./pages/Wallet";
import Resonance from "./pages/Resonance";
import ResonanceCompare from "./pages/ResonanceCompare";
import SecretResonance from "./pages/SecretResonance";
import SecretLoanShark from "./pages/SecretLoanShark";
import SecretIndex from "./pages/SecretIndex";
import StealAndDefend from "./pages/StealAndDefend";
import StealHub from "./pages/StealHub";
import StealShop from "./pages/StealShop";
import StealMarket from "./pages/StealMarket";
import StealAttack from "./pages/StealAttack";
import StealAdmin from "./pages/StealAdmin";
import StealAlert from "./components/steal/StealAlert";
import Poker from "./pages/Poker";
import PokerTable from "./pages/PokerTable";
import LoanShark from "./pages/LoanShark";
import BlackMarket from "./pages/BlackMarket";
import BlackMarketDev from "./pages/BlackMarketDev";
import GomokuLobby from "./pages/GomokuLobby";
import GomokuMatch from "./pages/GomokuMatch";
import GomokuLocal from "./pages/GomokuLocal";
import GomokuShop from "./pages/GomokuShop";
import GomokuClanker from "./pages/GomokuClanker";
import HazeFilter from "./components/cosmetics/HazeFilter";
import "./components/cosmetics/cosmetics.css";

// Infinite Gomoku's developer tool: only in the Vite dev server. A
// production build replaces import.meta.env.DEV with false, so the page
// isn't even in it.
const GomokuDev = import.meta.env.DEV ? lazy(() => import("./pages/GomokuDev")) : null;


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
      {/* The Black Market cosmetics' heat haze shimmer, defined once. */}
      <HazeFilter />
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
          {/* Moderators and admins only (the server checks): the icon in
              the Resonance page's heading links here for them. */}
          <Route path="/SECRETresonance" element={
            isAuthenticated ? (<SecretResonance />) : (<Navigate to="/login" state={{ from: '/SECRETresonance' }} />)
          } />
          {/* Every SECRET page, for the admin named ADMIN: their name on
              their own profile links here. Anyone else sees nothing. */}
          <Route path="/SECRET" element={
            isAuthenticated ? (<SecretIndex />) : (<Navigate to="/login" state={{ from: '/SECRET' }} />)
          } />
          {/* Admins only (the server checks): who King Loan Shark's jobs can
              pick. Not linked from anywhere on purpose. */}
          <Route path="/SECRETloanshark" element={
            isAuthenticated ? (<SecretLoanShark />) : (<Navigate to="/login" state={{ from: '/SECRETloanshark' }} />)
          } />
          <Route path="/members" element={<Members />} />
          {/* Resonance: everyone's taste match with you. Reached from the
              home page's Resonance slide, your profile and Members. */}
          <Route path="/resonance" element={
            isAuthenticated ? (<Resonance />) : (<Navigate to="/login" state={{ from: '/resonance' }} />)
          } />
          {/* Every film you and one member have both rated, side by side:
              the score on their Resonance card links here. */}
          <Route path="/resonance/:userId" element={
            isAuthenticated ? (<ResonanceCompare />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
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
          {/* Infinite Gomoku: its page (Play For Fun, Play For PP, Shop),
              two players on one device, vs Clanker, the shop, and a game
              between members. The developer tool only exists in development. */}
          <Route path="/games/gomoku" element={
            isAuthenticated ? (<GomokuLobby />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/gomoku/local" element={
            isAuthenticated ? (<GomokuLocal />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/gomoku/clanker" element={
            isAuthenticated ? (<GomokuClanker />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/gomoku/shop" element={
            isAuthenticated ? (<GomokuShop />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          {GomokuDev && (
            <Route path="/games/gomoku/dev" element={
              isAuthenticated ? (<Suspense fallback={null}><GomokuDev /></Suspense>) : (<Navigate to="/login" state={{ from: location.pathname }} />)
            } />
          )}
          <Route path="/games/gomoku/:matchId" element={
            isAuthenticated ? (<GomokuMatch />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/scratch" element={
            isAuthenticated ? (<ScratchGame />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/slots" element={
            isAuthenticated ? (<SlotMachine />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/double-or-nothing" element={
            isAuthenticated ? (<DoubleOrNothing />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          {/* Steal and Defend: the intro, the hub, the shop, the market and
              trades, one attack (its quiz, then its result), and admins'
              flags and Ban List (the server checks who's an admin). */}
          <Route path="/games/steal-and-defend" element={
            isAuthenticated ? (<StealAndDefend />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/steal-and-defend/play" element={
            isAuthenticated ? (<StealHub />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/steal-and-defend/shop" element={
            isAuthenticated ? (<StealShop />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/steal-and-defend/market" element={
            isAuthenticated ? (<StealMarket />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/steal-and-defend/attacks/:attackId" element={
            isAuthenticated ? (<StealAttack />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/steal-and-defend/admin" element={
            isAuthenticated ? (<StealAdmin />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          {/* Kino Poker: the intro, then the one table (played live, over
              the socket: backend/games/poker/live.js). */}
          <Route path="/games/poker" element={
            isAuthenticated ? (<Poker />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/poker/table" element={
            isAuthenticated ? (<PokerTable />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          {/* Loan Shark: King Loan Shark, and members lending to each other. */}
          <Route path="/games/loan-shark" element={
            isAuthenticated ? (<LoanShark />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          {/* The Black Market, from the Loan Shark page: cosmetics for P-PP.
              Its developer test tool is for admins (the server checks). */}
          <Route path="/games/loan-shark/black-market" element={
            isAuthenticated ? (<BlackMarket />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
          } />
          <Route path="/games/loan-shark/black-market/dev" element={
            isAuthenticated ? (<BlackMarketDev />) : (<Navigate to="/login" state={{ from: location.pathname }} />)
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

      {/* Steal and Defend's "you're being attacked" alert, on any page. */}
      {isAuthenticated && <StealAlert />}

      <Footer />
    </div>
  )
}

export default App