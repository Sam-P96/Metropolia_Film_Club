import { useEffect, useId, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import AuthCard from '../components/auth/AuthCard'
import useCountdown, { formatCountdown } from '../hooks/useCountdown'
import { getResetStatus, requestLocalReset, requestPasswordReset } from '../services/passwordResets'
import { forgetPendingReset, getPendingReset, savePendingReset } from '../utils/pendingReset'

// How often the waiting page asks whether a "Reset Locally" request has been
// decided.
const POLL_MS = 3000

const LOCAL_INFO = 'Reset password locally, send a request to an admin to reset password in person'

const inputClasses =
  'w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'
const labelClasses = 'mb-2 block text-sm font-medium text-white/70'
const textClasses = 'text-sm leading-relaxed text-white/60'
const primaryButton =
  'w-full rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60'
const secondaryButton =
  'block w-full rounded-md border border-white/20 bg-white/5 px-6 py-3 text-center font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'
const linkButton = 'font-medium text-brand-gold transition-colors hover:text-white'
const errorClasses = 'rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white'

// "Reset Locally", with an i at its end that explains it: on hover, on
// keyboard focus, or tapped (tap it again, or press Escape, to hide it).
// The i is a button of its own next to the main one, inside one outline,
// since a button can't hold another.
function ResetLocallyButton({ onClick, busy, disabled }) {
  const infoId = useId()
  const [hovering, setHovering] = useState(false)
  const [pinned, setPinned] = useState(false)
  const showInfo = hovering || pinned

  return (
    <div className="relative">
      <div className="flex w-full overflow-hidden rounded-md border border-white/20 bg-white/5 transition-colors focus-within:border-brand-gold/60 hover:border-brand-gold/60">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-describedby={infoId}
          className="flex-1 px-6 py-3 font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Reset Locally'}
        </button>
        <button
          type="button"
          aria-label="What's Reset Locally?"
          aria-expanded={showInfo}
          aria-controls={infoId}
          onClick={() => setPinned(!pinned)}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={() => setHovering(true)}
          onBlur={() => {
            setHovering(false)
            setPinned(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setHovering(false)
              setPinned(false)
            }
          }}
          className="flex items-center border-l border-white/15 px-4 text-white/70 transition-colors hover:bg-white/10 hover:text-brand-gold"
        >
          <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border border-current font-serif text-xs font-bold italic">
            i
          </span>
        </button>
      </div>

      <p
        id={infoId}
        role="tooltip"
        className={`absolute right-0 bottom-full z-20 mb-2 w-64 max-w-full rounded-md border border-white/15 bg-ink px-3 py-2 text-sm leading-snug text-white/90 shadow-xl shadow-black/50 transition-opacity duration-150 ${
          showInfo ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        {LOCAL_INFO}
      </p>
    </div>
  )
}

// "Forgot password?" on the login page. The member gives their email, then
// either:
//   Send reset link  a link to choose a new password is emailed, if there's
//                    an account (the answer is the same either way, so this
//                    never says whether an account exists).
//   Reset Locally    the request goes to the moderators and admins, pinned
//                    in their Notifications, for one of them to approve in
//                    person at the club. This page then waits, checking
//                    every few seconds, and moves on to choosing the
//                    password (ResetPassword.jsx) by itself once one of them
//                    approves. It times out after 20 minutes; then, or if
//                    it's dismissed, they can ask again.
function ForgotPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  // A "Reset Locally" request this browser already sent, picked up again
  // after a refresh.
  const [pending, setPending] = useState(getPendingReset)
  // 'form', 'sent' (the email), 'waiting', 'dismissed' or 'expired'
  const [step, setStep] = useState(pending ? 'waiting' : 'form')
  const [email, setEmail] = useState(pending?.email ?? location.state?.email ?? '')
  const [expiresAt, setExpiresAt] = useState(null)
  // null, 'email' or 'local': which button is sending.
  const [busy, setBusy] = useState(null)
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

  const handleSendLink = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy('email')

    try {
      await requestPasswordReset(email)
      setStep('sent')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const handleResetLocally = async () => {
    setError(null)

    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }

    setBusy('local')

    try {
      const request = await requestLocalReset(email)
      savePendingReset(request)
      setPending(request)
      setEmail(request.email)
      setExpiresAt(request.expiresAt)
      setStep('waiting')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const backToForm = () => {
    setError(null)
    setStep('form')
  }

  const errorBox = error && <p className={errorClasses}>{error}</p>

  if (step === 'sent') {
    return (
      <AuthCard title="Check your" accent="email">
        <div className="space-y-5">
          <p className={textClasses}>
            If there's an account for <span className="font-medium text-white">{email}</span>, a
            link to choose a new password is on its way. It expires in 20 minutes.
          </p>
          <p className={textClasses}>
            Didn't get it? Check your spam folder, or{' '}
            <button type="button" onClick={backToForm} className={linkButton}>
              try again
            </button>
            .
          </p>
          <Link to="/login" className={secondaryButton}>
            Back to log in
          </Link>
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
            Find one at the club: it's at the top of their Notifications, and they approve it once
            they've checked it's you. Keep this page open. Once it's approved, you'll go straight on
            to choosing a new password.
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
              ? 'A moderator or admin dismissed your password reset request. If you still need one, you can ask again, or talk to them at the club.'
              : 'Your password reset request timed out: nobody approved it within 20 minutes. You can ask again.'}
          </p>

          <button type="button" onClick={handleResetLocally} disabled={busy !== null} className={primaryButton}>
            {busy === 'local' ? 'Sending…' : 'Ask again'}
          </button>
          <button type="button" onClick={backToForm} disabled={busy !== null} className={secondaryButton}>
            Back
          </button>

          {errorBox}
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Forgot your" accent="password?">
      <p className={`mb-6 ${textClasses}`}>
        Enter the email you signed up with and we'll send a link to choose a new password. Or reset
        it locally: a moderator or admin approves it in person at the club.
      </p>

      <form onSubmit={handleSendLink} className="space-y-5">
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

        <button disabled={busy !== null} className={primaryButton}>
          {busy === 'email' ? 'Sending…' : 'Send reset link'}
        </button>

        <ResetLocallyButton onClick={handleResetLocally} busy={busy === 'local'} disabled={busy !== null} />

        {errorBox}
      </form>

      <p className="mt-8 text-center text-sm text-white/50">
        Remembered it?{' '}
        <Link to="/login" className={linkButton}>
          Log in here
        </Link>
      </p>
    </AuthCard>
  )
}

export default ForgotPassword
