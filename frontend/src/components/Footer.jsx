import { NavLink } from 'react-router-dom'

function Footer() {
  const linkClasses = 'text-sm text-white/60 transition-colors hover:text-brand-gold'

  return (
    <footer className="border-t border-white/10 bg-ink/60 backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-8 py-12 md:grid-cols-4">

        <div>
          <h3 className="mb-3 text-lg font-bold text-white">
            Metropolia <span className="text-brand-gold">Film Club</span>
          </h3>
          <p className="text-sm leading-relaxed text-white/50">
            Student-run social gatherings for movie lovers.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold tracking-wide text-white uppercase">
            Navigate
          </h4>
          <ul className="space-y-2">
            <li><NavLink to="/" className={linkClasses}>Home</NavLink></li>
            <li><NavLink to="/screenings" className={linkClasses}>Club Events</NavLink></li>
            <li><NavLink to="/about" className={linkClasses}>Screenings</NavLink></li>
            <li><NavLink to="/about" className={linkClasses}>About Us</NavLink></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold tracking-wide text-white uppercase">
            Find Us
          </h4>
          <address className="text-sm leading-relaxed text-white/60 not-italic">
            Metropolia UAS, Karamalmi Campus<br />
            Karaportti 2<br />
            02610 Espoo, Finland
          </address>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold tracking-wide text-white uppercase">
            Contact
          </h4>
          <ul className="space-y-2">
            <li>
              <a href="mailto:filmclub@metropolia.fi" className={linkClasses}>
                filmclub@metropolia.fi
              </a>
            </li>
            <li>
              <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className={linkClasses}>
                Instagram
              </a>
            </li>
            <li>
              <a href="https://discord.com/" target="_blank" rel="noopener noreferrer" className={linkClasses}>
                Discord
              </a>
            </li>
          </ul>
        </div>

      </div>

      <div className="border-t border-white/5 px-8 py-6">
        <p className="mx-auto max-w-6xl text-xs text-white/40">
          © {new Date().getFullYear()} Metropolia Film Club
        </p>
      </div>
    </footer>
  )
}

export default Footer