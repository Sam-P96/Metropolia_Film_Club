import { useState } from 'react'
import { Link } from 'react-router-dom'

import AuthCard from '../components/auth/AuthCard'
import useApi from '../hooks/useApi'
import useCountdown, { formatCountdown } from '../hooks/useCountdown'
import { completePasswordReset, getResetStatus } from '../services/passwordResets'
import { forgetPendingReset, getPendingReset } from '../utils/pendingReset'
import { ROLE_LABELS } from '../utils/permissions'

const inputClasses =
  'w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'
const labelClasses = 'mb-2 block text-sm font-medium text-white/70'
const linkClasses = 'font-medium text-brand-gold transition-colors hover:text-white'

// Choosing a new password, once a moderator or admin has approved this
// browser's request. "Forgot password?" (ForgotPassword.jsx) brings the
// member here by itself. It looks like the signup page. Saving logs them in.
function ResetPassword() {
  const [pending] = useState(getPendingReset)
  const request = useApi(
    () => (pending ? getResetStatus(pending.token) : Promise.resolve({ status: 'expired' })),
    []
  )
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const approved = request.data?.status === 'approved'
  const msLeft = useCountdown(approved ? request.data.expiresAt : null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)

    try {
      const user = await completePasswordReset(pending.token, password)
      forgetPendingReset()
      localStorage.setItem('user', JSON.stringify(user))
      window.location.href = '/'
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (request.loading) {
    return (
      <AuthCard title="Choose a new" accent="password">
        <p className="text-sm text-white/40">Loading…</p>
      </AuthCard>
    )
  }

  if (request.error) {
    return (
      <AuthCard title="Choose a new" accent="password">
        <p className="text-sm leading-relaxed text-white/60">
          Couldn't check your password reset. Try refreshing the page.
        </p>
      </AuthCard>
    )
  }

  if (request.data?.status === 'pending') {
    return (
      <AuthCard title="Not approved" accent="yet">
        <p className="text-sm leading-relaxed text-white/60">
          Your password reset request is still waiting for a moderator or admin.{' '}
          <Link to="/forgot-password" className={linkClasses}>
            Back to your request
          </Link>
        </p>
      </AuthCard>
    )
  }

  if (!approved || msLeft === 0) {
    return (
      <AuthCard title="Reset" accent="closed">
        <p className="text-sm leading-relaxed text-white/60">
          There's no approved password reset to use here. It may have timed out.{' '}
          <Link to="/forgot-password" className={linkClasses}>
            Ask for a new one
          </Link>
        </p>
      </AuthCard>
    )
  }

  const { approvedBy, email } = request.data
  const approver = approvedBy
    ? `${ROLE_LABELS[approvedBy.role] ?? 'A moderator'} ${approvedBy.username}`
    : 'A moderator'

  return (
    <AuthCard title="Choose a new" accent="password">
      <p className="mb-6 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-white">
        {approver} has approved your password reset.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className={labelClasses}>
            Email address
          </label>
          {/* Read-only, and named "username" so password managers file the
              new password under this account. */}
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            readOnly
            className={`${inputClasses} cursor-default text-white/60 focus:bg-white/5`}
          />
        </div>

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
        This stays open for another {formatCountdown(msLeft)}.
      </p>
    </AuthCard>
  )
}

export default ResetPassword
