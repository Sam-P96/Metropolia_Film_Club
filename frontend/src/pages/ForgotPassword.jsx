import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import AuthCard from '../components/auth/AuthCard'
import useCountdown, { formatCountdown } from '../hooks/useCountdown'
import { checkResetEmail, getResetStatus, requestPasswordReset } from '../services/passwordResets'
import { forgetPendingReset, getPendingReset, savePendingReset } from '../utils/pendingReset'

// How often the waiting page asks whether the request has been decided.
const POLL_MS = 3000

const inputClasses =
  'w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'
const labelClasses = 'mb-2 block text-sm font-medium text-white/70'
const textClasses = 'text-sm leading-relaxed text-white/60'
const primaryButton =
  'w-full rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60'
const secondaryButton =
  'w-full rounded-md border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'
const errorClasses = 'rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white'

// "Forgot password?" on the login page. The member gives their email and, if
// there's an account with it, confirms; the request goes to the moderators
// and admins. This page then waits, checking every few seconds, and moves on
// to choosing the password (ResetPassword.jsx) by itself once one of them
// approves. A request times out after 20 minutes; then, or if it's
// dismissed, they can ask again.
function ForgotPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  // A request this browser already sent, picked up again after a refresh.
  const [pending, setPending] = useState(getPendingReset)
  // 'email', 'confirm', 'waiting', 'dismissed' or 'expired'
  const [step, setStep] = useState(pending ? 'waiting' : 'email')
  const [email, setEmail] = useState(pending?.email ?? location.state?.email ?? '')
  const [expiresAt, setExpiresAt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const msLeft = useCountdown(step === 'waiting' ? expiresAt : null)

  // While waiting: ask straight away, then every few seconds.
  useEffect(() => {
    if (step !== 'waiting' || !pending) return

    let cancelled = false

    const check = async () => {
      try {
        const result = await getResetStatus(pending.token)
        if (cancelled) return

        if (result.status === 'approved') {
          navigate('/reset-password', { replace: true })
        } else if (result.status === 'pending') {
          setExpiresAt(result.expiresAt)
        } else {
          forgetPendingReset()
          setPending(null)
          setStep(result.status) // 'dismissed' or 'expired'
        }
      } catch {
        // A blip in the connection. The next check tries again.
      }
    }

    check()
    const timer = setInterval(check, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [step, pending, navigate])

  const handleCheck = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const result = await checkResetEmail(email)
      setEmail(result.email)
      setStep('confirm')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleSend = async () => {
    setError(null)
    setBusy(true)

    try {
      const request = await requestPasswordReset(email)
      savePendingReset(request)
      setPending(request)
      setExpiresAt(request.expiresAt)
      setStep('waiting')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const goTo = (next) => {
    setError(null)
    setStep(next)
  }

  const errorBox = error && <p className={errorClasses}>{error}</p>

  if (step === 'confirm') {
    return (
      <AuthCard title="Reset your" accent="password?">
        <div className="space-y-5">
          <p className={textClasses}>
            There's an account for <span className="font-medium text-white">{email}</span>.
          </p>
          <p className={textClasses}>
            Send a password reset request? The moderators and admins are notified, and once one
            of them approves it you can choose a new password. If nobody does within 20 minutes,
            it times out and you can ask again.
          </p>

          <button type="button" onClick={handleSend} disabled={busy} className={primaryButton}>
            {busy ? 'Sending…' : 'Send request'}
          </button>
          <button type="button" onClick={() => goTo('email')} disabled={busy} className={secondaryButton}>
            Back
          </button>

          {errorBox}
        </div>
      </AuthCard>
    )
  }

  if (step === 'waiting') {
    return (
      <AuthCard title="Request" accent="sent">
        <div className="space-y-5">
          <p className={textClasses}>
            Waiting for a moderator or admin to approve the password reset for{' '}
            <span className="font-medium text-white">{email}</span>.
          </p>
          <p className={textClasses}>
            Keep this page open. Once it's approved, you'll go straight on to choosing a new
            password.
          </p>

          <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand-gold motion-safe:animate-pulse" aria-hidden="true" />
            {msLeft === null ? 'Checking…' : `Times out in ${formatCountdown(msLeft)}`}
          </div>
        </div>
      </AuthCard>
    )
  }

  if (step === 'dismissed' || step === 'expired') {
    return (
      <AuthCard title="Request" accent={step}>
        <div className="space-y-5">
          <p className={textClasses}>
            {step === 'dismissed'
              ? 'A moderator or admin dismissed your password reset request. If you still need one, you can ask again, or get in touch with them.'
              : 'Your password reset request timed out: nobody approved it within 20 minutes. You can ask again.'}
          </p>

          <button type="button" onClick={() => goTo('confirm')} className={primaryButton}>
            Ask again
          </button>
          <Link to="/login" className={`block text-center ${secondaryButton}`}>
            Back to log in
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Forgot your" accent="password?">
      <p className={`mb-6 ${textClasses}`}>
        Enter the email you signed up with. A moderator or admin approves the request, then you
        can choose a new password.
      </p>

      <form onSubmit={handleCheck} className="space-y-5">
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
          {busy ? 'Checking…' : 'Continue'}
        </button>

        {errorBox}
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
