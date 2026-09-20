import { NavLink } from 'react-router-dom'

function NavigationBar() {
  const isLoggedIn = false // Modify this later for login thingies

  const linkClasses = ({ isActive }) =>
    isActive
      ? 'text-[0.95rem] text-brand-gold transition-colors'
      : 'text-[0.95rem] text-white/70 transition-colors hover:text-white'

  const buttonClasses =
    'whitespace-nowrap rounded-md bg-brand-red px-5 py-2 text-[0.95rem] font-medium text-white transition-colors hover:bg-brand-orange'

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
          <NavLink to="/screenings" className={linkClasses}>Club Events</NavLink>
        </li>
        <li>
          <NavLink to="/about" className={linkClasses}>Screenings</NavLink>
        </li>
        <li>
          <NavLink to="/about" className={linkClasses}>About Us</NavLink>
        </li>
      </ul>

      <div>
        {isLoggedIn ? (
          <NavLink to="/account" className={buttonClasses}>Account</NavLink>
        ) : (
          <NavLink to="/login" className={buttonClasses}>Login</NavLink>
        )}
      </div>
    </nav>
  )
}

export default NavigationBar