import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import GlobalSearch from './search/GlobalSearch'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/club_events', label: 'Club Events' },
  { to: '/movie_reviews', label: 'Movie Reviews' },
  { to: '/about', label: 'About Us' },
]

// Lucide's bell (lucide.dev, ISC licence: free to use, no attribution
// required on the page).
function BellIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </svg>
  )
}

function NavigationBar({ isAuthenticated, setIsAuthenticated }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Navigating should always close the panel
  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  // Escape closes it
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Stop the page scrolling behind the open panel
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    setIsAuthenticated(false)
    localStorage.removeItem('user')
    navigate('/')
  }

  const linkClasses = ({ isActive }) =>
    isActive
      ? 'whitespace-nowrap text-[0.95rem] text-brand-gold transition-colors'
      : 'whitespace-nowrap text-[0.95rem] text-white/70 transition-colors hover:text-white'

  const panelLinkClasses = ({ isActive }) =>
    isActive
      ? 'block rounded-md bg-white/10 px-4 py-3 text-base font-medium text-brand-gold'
      : 'block rounded-md px-4 py-3 text-base font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white'

  // Notifications, as a round bell beside Account. Gold while you're on it.
  const bellClasses = ({ isActive }) =>
    `flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
      isActive
        ? 'border-brand-gold/60 bg-white/10 text-brand-gold'
        : 'border-white/20 bg-white/5 text-white/80 hover:border-brand-gold/60 hover:bg-white/10 hover:text-white'
    }`

  const buttonClasses =
    'whitespace-nowrap rounded-md bg-brand-red px-5 py-2 text-[0.95rem] font-medium text-white transition-colors hover:bg-brand-orange'

  const logoutClasses =
    'whitespace-nowrap rounded-md border border-white/20 bg-white/5 px-5 py-2 text-[0.95rem] font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'

  return (
    <>
      <nav className="sticky top-0 z-100 flex items-center gap-8 border-b border-white/10 bg-ink/60 px-8 py-4 shadow-lg shadow-black/40 backdrop-blur-xl">

        <div>
          <NavLink to="/" className="whitespace-nowrap text-xl font-bold text-white">
            Kino <span className="text-brand-gold">Kaverit</span>
          </NavLink>
        </div>

        {/* Desktop only, from 1280px: below that, the links, the search box,
            the bell and the account buttons leave the search box too narrow
            to use, so the menu has them. */}
        <div className="hidden flex-1 xl:block">
          <GlobalSearch />
        </div>

        <ul className="hidden gap-7 xl:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} className={linkClasses}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 xl:flex">
          {isAuthenticated ? (
            <>
              {/* Clicking it while on the page loads the page again (Feed.jsx). */}
              <NavLink to="/feed" className={bellClasses} aria-label="Notifications" title="Notifications">
                <BellIcon />
              </NavLink>
              <NavLink to="/account" className={buttonClasses}>Account</NavLink>
              <button onClick={handleLogout} className={logoutClasses}>Log out</button>
            </>
          ) : (
            <NavLink to="/login" className={buttonClasses}>Login / Sign Up</NavLink>
          )}
        </div>

        {/* Mobile only */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="ml-auto rounded-md border border-white/20 bg-white/5 p-2 text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 xl:hidden"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

      </nav>

      {/* Backdrop */}
      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
        className={
          menuOpen
            ? 'fixed inset-0 z-110 bg-black/60 opacity-100 backdrop-blur-sm transition-opacity duration-300 xl:hidden'
            : 'pointer-events-none fixed inset-0 z-110 bg-black/60 opacity-0 backdrop-blur-sm transition-opacity duration-300 xl:hidden'
        }
      />

      {/* Sliding panel */}
      <aside
        aria-hidden={!menuOpen}
        className={
          menuOpen
            ? 'fixed top-0 right-0 z-120 flex h-full w-80 max-w-[85vw] translate-x-0 flex-col border-l border-white/10 bg-ink/60 shadow-2xl shadow-black/60 backdrop-blur-xl transition-transform duration-300 ease-out xl:hidden'
            : 'fixed top-0 right-0 z-120 flex h-full w-80 max-w-[85vw] translate-x-full flex-col border-l border-white/10 bg-ink/60 shadow-2xl shadow-black/60 backdrop-blur-xl transition-transform duration-300 ease-out xl:hidden'
        }
      >

        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <span className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Menu
          </span>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="rounded-md border border-white/20 bg-white/5 p-2 text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <GlobalSearch inline />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={panelLinkClasses}>
                  {link.label}
                </NavLink>
              </li>
            ))}

            {isAuthenticated && (
              <li>
                <NavLink to="/feed" className={panelLinkClasses}>
                  <span className="flex items-center gap-3">
                    <BellIcon size={18} />
                    Notifications
                  </span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="space-y-3 border-t border-white/10 px-5 py-5">
          {isAuthenticated ? (
            <>
              <NavLink to="/account" className={`${buttonClasses} block text-center`}>
                Account
              </NavLink>
              <button
                onClick={handleLogout}
                className={`${logoutClasses} block w-full text-center`}
              >
                Log out
              </button>
            </>
          ) : (
            <NavLink to="/login" className={`${buttonClasses} block text-center`}>
              Login / Sign Up
            </NavLink>
          )}
        </div>

      </aside>
    </>
  )
}

export default NavigationBar