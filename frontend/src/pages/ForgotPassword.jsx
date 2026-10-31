import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import AuthCard from '../components/auth/AuthCard'
import { requestPasswordReset } from '../services/passwordResets'

const inputClasses =
  'w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'
const labelClasses = 'mb-2 block text-sm font-medium text-white/70'
const textClasses = 'text-sm leading-relaxed text-white/60'
const primaryButton =
  'w-full rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60'
const errorClasses = 'rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white'

// "Forgot password?" on the login page. The member gives their email; if
// there's an account, a reset link is emailed to it. The answer is the same
// either way, so this page never says whether an account exists.
function ForgotPassword() {
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)

    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthCard title="Check your" accent="email">
        <div className="space-y-5">
          <p className={textClasses}>
            If there's an account for <span className="font-medium text-white">{email}</span>, a
            link to choose a new password is on its way. It expires in 20 minutes.
          </p>
          <p className={textClasses}>
            Didn't get it? Check your spam folder, or{' '}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-medium text-brand-gold transition-colors hover:text-white"
            >
              try again
            </button>
            .
          </p>
          <Link
            to="/login"
            className="block w-full rounded-md border border-white/20 bg-white/5 px-6 py-3 text-center font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
          >
            Back to log in
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Forgot your" accent="password?">
      <p className={`mb-6 ${textClasses}`}>
        Enter the email you signed up with and we'll send a link to choose a new password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className={labelClasses}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
          />
        </div>

        <button disabled={busy} className={primaryButton}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>

        {error && <p className={errorClasses}>{error}</p>}
      </form>

      <p className="mt-8 text-center text-sm text-white/50">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-brand-gold transition-colors hover:text-white">
          Log in here
        </Link>
      </p>
    </AuthCard>
  )
}

export default ForgotPassword
