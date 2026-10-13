import { Routes, Route, Navigate } from 'react-router-dom'
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


//ALWAYS KEEP IN MIND, WE WANT A CARD BASE LAYOUT
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user && user.token ? true : false;
  })

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
            isAuthenticated ? (<Navigate to="/" />) : (<Login setIsAuthenticated={setIsAuthenticated} />)
          } />
          <Route path="/account" element={
            isAuthenticated ? (<Profile />) : (<Navigate to="/login" />)
          } />
          <Route path="/users/:userId" element={<Profile />} />

          <Route path="/wheel" element={<Wheel />} />
          <Route path="/users/:userId/films" element={<UserFilmList />} />
          <Route path="/reviews/:reviewId" element={<ReviewDetail />} />
          <Route path="/films/:tmdbId" element={<FilmDetail />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

export default App