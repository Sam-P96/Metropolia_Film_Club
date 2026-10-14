import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState } from 'react';
import ScrollToTop from './components/ScrollToTop'
import NavigationBar from './components/NavigationBar'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Signup from "./pages/Signup";
import Login from "./pages/Login";
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
import Members from "./pages/Members";
import SearchResults from "./pages/SearchResults";


//ALWAYS KEEP IN MIND, WE WANT A CARD BASE LAYOUT
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user && user.token ? true : false;
  })

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
          <Route path="/search" element={<SearchResults />} />
          <Route path="/members" element={<Members />} />
          <Route path="/users/:userId" element={<Profile />} />

          <Route path="/wheel" element={<Wheel />} />
          <Route path="/users/:userId/films" element={<UserFilmList />} />
          <Route path="/reviews/:reviewId" element={<ReviewDetail />} />
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
          <Route path="/club_events/new" element={<CreateEvent />} />
          <Route path="/club_events/:eventId" element={<EventDetail />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

export default App