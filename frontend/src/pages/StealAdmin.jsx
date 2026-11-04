import { useState } from 'react'
import { Link } from 'react-router-dom'
import StealPage from '../components/steal/StealPage'
import MemberAvatar from '../components/profile/MemberAvatar'
import MemberPicker from '../components/profile/MemberPicker'
import PillToggle from '../components/PillToggle'
import useApi from '../hooks/useApi'
import { createBan, dismissFlag, getAttackReset, getBans, getFlags, liftBan, resetAttacks } from '../services/steal'
import { timeAgo } from '../utils/timeAgo'
import { STEAL } from '../../../shared/steal/config.js'
import { DANGER_BUTTON, GLASS, GOLD_BUTTON, LIFT, QUIET_BUTTON, SMALL_BUTTON } from '../components/steal/style'

const HEADING = "font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold"
const INPUT = 'rounded-xl border border-white/20 bg-ink/60 px-3 py-2 text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-brand-gold'

const FLAG_NAMES = {
  alt: 'Possible alts',
  collusion: 'Possible collusion',
  debt: 'Debt pattern',
  refund: 'Refund pattern',
  trade: 'Suspicious trade',
}

function Flags() {
  const [status, setStatus] = useState('open')
  const [version, setVersion] = useState(0)
  const { data, error } = useApi(() => getFlags(status), [status, version])
  const flags = data?.flags ?? []

  return (
    <section className={`${GLASS} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={HEADING}>Flags</h2>
        <PillToggle
          options={[
            { value: 'open', label: 'Open' },
            { value: 'dismissed', label: 'Dismissed' },
          ]}
          value={status}
          onChange={setStatus}
          label="Which flags"
        />
      </div>
      {error ? (
        <p className="mt-2 text-sm text-white/50">{error.message}</p>
      ) : flags.length === 0 ? (
        <p className="mt-2 text-sm text-white/50">{data ? 'Nothing to look at.' : 'Loading…'}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {flags.map((flag) => (
            <li key={flag._id} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white">{FLAG_NAMES[flag.kind] ?? flag.kind}</span>
                {flag.count > 1 && <span className="rounded-full bg-brand-red/30 px-2 text-xs text-white">×{flag.count}</span>}
                <span className="ml-auto text-xs text-white/40">{timeAgo(flag.lastAt)}</span>
              </div>
              <p className="mt-1 text-white/70">{flag.details}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {flag.users.map((user) => (
                  <Link key={user._id} to={`/users/${user._id}`} className="flex items-center gap-1.5 text-white/80 hover:text-brand-gold">
                    <MemberAvatar user={user} size="sm" />
                    {user.username}
                  </Link>
                ))}
                {flag.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => dismissFlag(flag._id).then(() => setVersion((v) => v + 1), () => {})}
                    className={`ml-auto border border-white/20 text-white ${SMALL_BUTTON}`}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// The two confirmations before everyone's steal timer is reset.
const RESET_STEPS = [
  { ask: null, button: 'Reset steal timer for everyone' },
  {
    ask: 'Everyone gets their attack back and can steal again straight away, and everyone can be stolen from again, even by someone who already robbed them this week. Reset?',
    button: 'Yes, reset it',
  },
  { ask: "Are you sure? This can't be undone: anyone who attacks again keeps whatever they steal.", button: 'Reset for everyone' },
]

// "Reset steal timer": one button, two confirmations. Every steal limit
// starts over: the attack a day, each victim once a week, and how often a
// victim can be robbed. Soul Stone protection and follow times stay.
function AttackReset() {
  const [version, setVersion] = useState(0)
  const { data } = useApi(getAttackReset, [version])
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const press = async () => {
    setMessage(null)
    if (step < RESET_STEPS.length - 1) {
      setStep(step + 1)
      return
    }
    setBusy(true)
    try {
      const result = await resetAttacks()
      setMessage({ ok: true, text: `Done. Everyone can steal again (${result.players} had used today's attack).` })
      setVersion((v) => v + 1)
    } catch (failure) {
      setMessage({ ok: false, text: failure.message })
    } finally {
      setBusy(false)
      setStep(0)
    }
  }

  const { ask, button } = RESET_STEPS[step]
  const last = data?.reset

  return (
    <section className={`${GLASS} p-5`}>
      <h2 className={HEADING}>Steal timer</h2>
      <p className="mt-1 text-sm text-white/70">
        Starts every steal limit over: everyone gets their attack back, anyone can be attacked again by someone who already did this week,
        and victims who&apos;ve been robbed as often as allowed can be robbed again. Soul Stone protection and follow times stay as they are.
      </p>
      <p className="mt-1 text-xs text-white/40">
        {last ? `Last reset ${timeAgo(last.at)}${last.by ? ` by ${last.by.username}` : ''}.` : 'Never reset.'}
      </p>
      {ask && <p className="mt-3 rounded-lg border border-brand-red/50 bg-brand-red/10 px-3 py-2 text-sm text-white">{ask}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={press} disabled={busy} className={step === 0 ? QUIET_BUTTON : DANGER_BUTTON}>
          {busy ? 'Resetting…' : button}
        </button>
        {step > 0 && (
          <button type="button" onClick={() => setStep(0)} className={QUIET_BUTTON}>
            Cancel
          </button>
        )}
      </div>
      {message && <p className={`mt-2 text-sm ${message.ok ? 'text-emerald-300' : 'text-brand-red'}`}>{message.text}</p>}
    </section>
  )
}

function BanForm({ onBanned }) {
  const [user, setUser] = useState(null)
  const [scopes, setScopes] = useState([])
  const [days, setDays] = useState('')
  const [reason, setReason] = useState('')
  const [problem, setProblem] = useState(null)

  const ban = async () => {
    setProblem(null)
    try {
      await createBan({ user: user._id, scopes, days: days.trim() === '' ? null : Number(days), reason })
      setUser(null)
      setScopes([])
      setDays('')
      setReason('')
      onBanned()
    } catch (failure) {
      setProblem(failure.message)
    }
  }

  return (
    <section className={`${GLASS} p-5`}>
      <h2 className={HEADING}>Ban a member</h2>
      {!user ? (
        <div className="mt-3">
          <MemberPicker label="Who" onPick={setUser} />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MemberAvatar user={user} size="sm" />
            <span className="flex-1 font-semibold text-white">{user.username}</span>
            <button type="button" onClick={() => setUser(null)} className="text-xs text-white/60 hover:text-white">
              Someone else
            </button>
          </div>
          <fieldset>
            <legend className="text-xs tracking-widest text-white/60 uppercase">Banned from</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(STEAL.banScopes).map(([scope, label]) => (
                <label key={scope} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${LIFT} hover:border-white/30 ${scopes.includes(scope) ? 'border-brand-gold/70 bg-white/10 text-white' : 'border-white/10 text-white/70'}`}>
                  <input
                    type="checkbox"
                    className="accent-brand-gold"
                    checked={scopes.includes(scope)}
                    onChange={() => setScopes(scopes.includes(scope) ? scopes.filter((other) => other !== scope) : [...scopes, scope])}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1">
            <span className="text-xs tracking-widest text-white/60 uppercase">Days (leave empty for permanent)</span>
            <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" placeholder="Permanent" className={`${INPUT} sm:w-40`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs tracking-widest text-white/60 uppercase">Reason (required, saved with the ban)</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} className={INPUT} />
          </label>
          {problem && <p className="text-sm text-brand-red">{problem}</p>}
          <button type="button" onClick={ban} disabled={scopes.length === 0 || !reason.trim()} className={`${GOLD_BUTTON} self-start`}>
            Ban {user.username}
          </button>
        </div>
      )}
    </section>
  )
}

function BanList({ version, onChanged }) {
  const { data, error } = useApi(getBans, [version])
  const bans = data?.bans ?? []
  return (
    <section className={`${GLASS} p-5`}>
      <h2 className={HEADING}>Ban List</h2>
      <p className="mt-1 text-xs text-white/50">Active bans. Temporary ones end by themselves.</p>
      {error ? (
        <p className="mt-2 text-sm text-white/50">{error.message}</p>
      ) : bans.length === 0 ? (
        <p className="mt-2 text-sm text-white/50">{data ? 'Nobody is banned.' : 'Loading…'}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {bans.map((ban) => (
            <li key={ban._id} className="flex flex-wrap items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
              <MemberAvatar user={ban.user} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{ban.user.username}</p>
                <p className="text-white/70">{ban.scopes.map((scope) => STEAL.banScopes[scope]).join(', ')}</p>
                <p className="text-xs text-white/50">
                  {ban.until ? `Until ${new Date(ban.until).toLocaleString()}` : 'Permanent'} · by {ban.by?.username ?? 'an admin'} {timeAgo(ban.createdAt)}
                </p>
                <p className="mt-1 text-xs text-white/60">Reason: {ban.reason}</p>
              </div>
              <button type="button" onClick={() => liftBan(ban._id).then(onChanged, () => {})} className={`${QUIET_BUTTON} min-h-9 text-sm`}>
                Unban
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Admins only (the server checks): Steal and Defend's flags and Ban List
// (spec §14).
export default function StealAdmin() {
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  return (
    <StealPage
      back={{ to: '/games/steal-and-defend/play', label: 'Steal and Defend' }}
      title={
        <>
          Steal and Defend <span className="text-brand-gold">admin</span>
        </>
      }
      subtitle="What the game has flagged, bans (from stealing, buying items, trading, all games, or the whole site), and resetting everyone's steal timer."
    >
      <Flags />
      <AttackReset />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <BanForm onBanned={refresh} />
        <BanList version={version} onChanged={refresh} />
      </div>
    </StealPage>
  )
}
