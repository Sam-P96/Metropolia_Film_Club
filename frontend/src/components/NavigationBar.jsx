import { NavLink } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'

function NavigationBar({ isAuthenticated, setIsAuthenticated }) {

  const navigate = useNavigate()
  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("user")
    navigate("/")
  }

  const linkClasses = ({ isActive }) =>
    isActive
      ? 'text-[0.95rem] text-brand-gold transition-colors'
      : 'text-[0.95rem] text-white/70 transition-colors hover:text-white'

  const buttonClasses =
    'whitespace-nowrap rounded-md bg-brand-red px-5 py-2 text-[0.95rem] font-medium text-white transition-colors hover:bg-brand-orange'

  const logoutClasses =
    'whitespace-nowrap rounded-md border border-white/20 bg-white/5 px-5 py-2 text-[0.95rem] font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'

  return (
    <nav className="sticky top-0 z-100 flex items-center gap-8 border-b border-white/10 bg-ink/60 px-8 py-4 shadow-lg shadow-black/40 backdrop-blur-xl">
      <div>
        <NavLink to="/" className="whitespace-nowrap text-xl font-bold text-white">
          Metropolia <span className="text-brand-gold">Film Club</span>
        </NavLink>
      </div>

      <div className="flex-1">
        <input
          type="search"
          placeholder="Search upcoming club events..."
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-all placeholder:text-white/40 focus:border-brand-gold/60 focus:bg-white/10"
        />
      </div>

      <ul className="flex gap-7">
        <li>
          <NavLink to="/" className={linkClasses}>Home</NavLink>
        </li>
        <li>
          <NavLink to="/club_events" className={linkClasses}>Club Events</NavLink>
        </li>
        <li>
          <NavLink to="/screenings" className={linkClasses}>Screenings</NavLink>
        </li>
        <li>
          <NavLink to="/movie_reviews" className={linkClasses}>Movie Reviews</NavLink>
        </li>
        <li>
          <NavLink to="/about" className={linkClasses}>About Us</NavLink>
        </li>
      </ul>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <NavLink to="/account" className={buttonClasses}>Account</NavLink>
            <button onClick={handleLogout} className={logoutClasses}>Log out</button>
          </>
        ) : (
          <NavLink to="/login" className={buttonClasses}>Login / Sign Up</NavLink>
        )}
      </div>
    </nav>
  )
}

export default NavigationBar