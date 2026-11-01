import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import AuthCard from '../components/auth/AuthCard'
import { completePasswordReset } from '../services/passwordResets'

const inputClasses =
  'w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'
const labelClasses = 'mb-2 block text-sm font-medium text-white/70'
const linkClasses = 'font-medium text-brand-gold transition-colors hover:text-white'

const MIN_PASSWORD_LENGTH = 8

// Choosing a new password from the link in the reset email. The token is in
// the URL (?token=...). Saving logs the member in. Looks like the signup page.
function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)

    try {
      const user = await completePasswordReset(token, password)
      localStorage.setItem('user', JSON.stringify(user))
      window.location.href = '/'
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (!token) {
    return (
      <AuthCard title="Reset" accent="link">
        <p className="text-sm leading-relaxed text-white/60">
          This reset link is missing its token. Open the link from your email, or{' '}
          <Link to="/forgot-password" className={linkClasses}>
            ask for a new one
          </Link>
          .
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Choose a new" accent="password">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className={labelClasses}>
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className={labelClasses}>
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClasses}
          />
        </div>

        <button
          disabled={saving}
          className="w-full rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Change password'}
        </button>

        {error && (
          <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white">
            {error}
          </p>
        )}
      </form>

      <p className="mt-8 text-center text-sm text-white/50">
        <Link to="/login" className={linkClasses}>
          Back to log in
        </Link>
      </p>
    </AuthCard>
  )
}

export default ResetPassword
