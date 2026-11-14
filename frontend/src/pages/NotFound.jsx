import { Link } from 'react-router-dom'
import AuthCard from '../components/auth/AuthCard'

const BUTTON =
  'block w-full rounded-md border border-white/20 bg-white/5 px-6 py-3 text-center font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'

// Any address the site doesn't have (an old link, a typo): says so, in the
// sign up page's look, with the way back. App.jsx's last route.
function NotFound() {
  return (
    <AuthCard title="Page not" accent="found">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-white/60">
          There&apos;s nothing at this address. The link may be old, or there&apos;s a typo in it.
        </p>
        <Link to="/" className="block w-full rounded-md bg-brand-red px-6 py-3 text-center font-medium text-white transition-colors hover:bg-brand-orange">
          Go home
        </Link>
        <Link to="/films" className={BUTTON}>
          Browse films
        </Link>
      </div>
    </AuthCard>
  )
}

export default NotFound
