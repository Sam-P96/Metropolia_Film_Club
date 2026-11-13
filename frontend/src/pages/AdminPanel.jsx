import '@fontsource/bebas-neue'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import MemberAvatar from '../components/profile/MemberAvatar'
import MemberPicker from '../components/profile/MemberPicker'
import CoinIcon from '../components/wallet/CoinIcon'
import useApi from '../hooks/useApi'
import { getAdminPanel, runPayoutNow, sendPpp } from '../services/admin'
import { walletChanged } from '../services/wallet'
import { getCurrentUser } from '../utils/currentUser'
import { hasAtLeast } from '../utils/permissions'
import { SECRET_PAGES } from '../utils/secretPages'
import { timeAgo } from '../utils/timeAgo'

const CARD = 'rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6'
const HEADING = "font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white"
const GOLD = 'cursor-pointer rounded-lg bg-brand-gold px-4 py-2 font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-50'
const QUIET = 'cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2 font-semibold text-white transition hover:border-brand-gold/60 hover:bg-white/10 disabled:opacity-50'
const FIELD = 'w-full rounded-lg border border-white/15 bg-ink/70 px-3 py-2 text-white placeholder:text-white/30 focus:border-brand-gold focus:outline-none'
const QUICK = [100, 500, 1000, 5000]
const format = (points) => Number(points).toLocaleString('en-US')

// Every admin tool with a page of its own, to go to from here.
const TOOLS = [
  {
    path: '/games/steal-and-defend/admin',
    name: 'Steal and Defend admin',
    about: 'Flags of suspicious play, the Ban List (site, games and Steal and Defend bans) and resetting everyone’s steal timer.',
  },
  {
    path: '/banned',
    name: 'Banned members',
    about: 'Everyone who has lost rights to the Ban Hammer, and which. Their name opens their profile, where the Ban Hammer changes it.',
  },
  {
    path: '/games/loan-shark',
    name: 'Loan Shark test tools',
    about: 'At the bottom of the Loan Shark page, for admins: the daily checks and sending Kaveri, now.',
  },
  {
    path: '/games/loan-shark/black-market/dev',
    name: 'Black Market test tool',
    about: 'Every name style and border on made-up members, side by side.',
  },
  {
    path: '/daily-quiz/questions',
    name: 'Daily Quiz questions',
    about: 'The queue of questions written for the Daily Quiz: edit, reveal, move or shuffle them. Add more on the Daily Quiz page.',
  },
  ...SECRET_PAGES.map((page) => ({ path: page.path, name: page.name, about: page.about })),
  ...(import.meta.env.DEV
    ? [{ path: '/games/gomoku/dev', name: 'Infinite Gomoku developer tool', about: 'Every cosmetic on a test board, and playing a For Fun game alone. Only while testing on your computer.' }]
    : []),
]

// Sending P-PP to a member: who, how much, a note they'll see, and a
// confirmation before anything happens. It's newly made P-PP (nobody pays
// it), on their wallet history as sent by an admin.
function SendPpp({ maxGrant, maxNote, onSent }) {
  const [member, setMember] = useState(null)
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const amount = Number(amountText)
  const valid = member && Number.isInteger(amount) && amount >= 1 && amount <= maxGrant && note.length <= maxNote

  const send = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await sendPpp({ userId: member._id, amount, note })
      setMessage({ text: `Sent ${format(amount)} P-PP to ${member.username}.` })
      setMember(null)
      setAmountText('')
      setNote('')
      setAsking(false)
      onSent(result.grants)
    } catch (failure) {
      setMessage({ error: true, text: failure.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`${CARD} flex flex-col gap-4`} aria-labelledby="send-ppp">
      <div>
        <h2 id="send-ppp" className={HEADING}>
          Send <span className="text-brand-gold">P-PP</span>
        </h2>
        <p className="mt-1 text-sm text-white/60">
          New P-PP for a member, made from nothing. It shows on their wallet history as sent by an admin, and they get a notification with your note.
        </p>
      </div>

      {member ? (
        <div className="flex flex-wrap items-center gap-3">
          <MemberAvatar user={member} size="sm" />
          <span className="font-semibold text-white">{member.username}</span>
          <button
            type="button"
            onClick={() => {
              setMember(null)
              setAsking(false)
            }}
            className="cursor-pointer text-sm text-brand-gold underline underline-offset-4"
          >
            Someone else
          </button>
        </div>
      ) : (
        <MemberPicker label="Who to?" onPick={setMember} />
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs tracking-widest text-white/60 uppercase">How much P-PP</legend>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK.map((quick) => (
            <button
              key={quick}
              type="button"
              aria-pressed={amount === quick}
              onClick={() => setAmountText(String(quick))}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm tabular-nums ${amount === quick ? 'border-brand-gold bg-brand-gold font-bold text-ink' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}
            >
              {format(quick)}
            </button>
          ))}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={maxGrant}
            step={1}
            value={amountText}
            onChange={(event) => {
              setAmountText(event.target.value)
              setAsking(false)
            }}
            placeholder="Any amount"
            aria-label="P-PP to send"
            className={`${FIELD} w-36 tabular-nums`}
          />
        </div>
        <p className="text-xs text-white/40">1 to {format(maxGrant)} at a time.</p>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
        Note (optional, they&apos;ll see it)
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={maxNote} placeholder="Thanks for reporting that bug!" className={FIELD} />
      </label>

      {asking && valid ? (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-gold/50 bg-brand-gold/10 p-4" role="alertdialog" aria-label="Confirm">
          <p className="flex flex-wrap items-center gap-1.5 text-white">
            Send <CoinIcon kind="ppp" size={16} /> <strong>{format(amount)} P-PP</strong> to <strong>{member.username}</strong>? This can&apos;t be undone.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={send} disabled={busy} className={GOLD}>
              {busy ? 'Sending…' : `Yes, send ${format(amount)} P-PP`}
            </button>
            <button type="button" onClick={() => setAsking(false)} disabled={busy} className={QUIET}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button type="button" onClick={() => setAsking(true)} disabled={!valid} className={GOLD}>
            Send P-PP
          </button>
        </div>
      )}

      {message && (
        <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-red-300' : 'text-emerald-300'}`}>
          {message.text}
        </p>
      )}
    </section>
  )
}

// The latest sends, by any admin.
function RecentGrants({ grants }) {
  return (
    <section className={`${CARD} flex flex-col gap-3`} aria-labelledby="recent-grants">
      <h2 id="recent-grants" className={HEADING}>
        Recently <span className="text-brand-gold">sent</span>
      </h2>
      {grants.length === 0 ? (
        <p className="text-sm text-white/50">Nothing sent yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/10">
          {grants.map((grant) => (
            <li key={grant._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              {grant.to ? <MemberAvatar user={grant.to} size="sm" /> : null}
              <span className="min-w-0 flex-1 text-white/80">
                <span className="font-semibold text-white">{grant.to?.username ?? 'A former member'}</span>
                <span className="text-white/50"> · by {grant.by?.username ?? 'a former admin'}</span>
              </span>
              <span className="flex items-center gap-1 font-bold text-brand-gold tabular-nums">
                <CoinIcon kind="ppp" size={14} /> {format(grant.amount)}
              </span>
              <span className="w-full text-xs text-white/40 sm:w-auto">{timeAgo(grant.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Today's 12:00 PP payout, now, for anyone not paid today yet (it never
// pays anyone twice in a day). It asks first.
function PayoutNow() {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const run = async () => {
    setBusy(true)
    try {
      await runPayoutNow()
      walletChanged()
      setMessage({ text: "Done: everyone not paid today has their PP." })
      setAsking(false)
    } catch (failure) {
      setMessage({ error: true, text: failure.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
      <span className="font-semibold text-white">Daily PP payout, now</span>
      <span className="text-sm text-white/60">
        Runs today&apos;s 12:00 payout straight away for everyone not paid today yet (nobody is paid twice in a day), then retakes the Slot Machine&apos;s snapshot.
      </span>
      {asking ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-white/80">Run it now?</span>
          <button type="button" onClick={run} disabled={busy} className={GOLD}>
            {busy ? 'Paying…' : 'Yes, pay now'}
          </button>
          <button type="button" onClick={() => setAsking(false)} disabled={busy} className={QUIET}>
            Cancel
          </button>
        </span>
      ) : (
        <span>
          <button type="button" onClick={() => setAsking(true)} className={QUIET}>
            Run the payout
          </button>
        </span>
      )}
      {message && <span className={`text-sm ${message.error ? 'text-red-300' : 'text-emerald-300'}`}>{message.text}</span>}
    </li>
  )
}

// /admin: the admin panel, for admins (any admin, whatever their name; the
// server checks). Sending P-PP to members, the daily payout on demand, and
// every other admin tool on the site, to go to from here. Not in the nav:
// an admin's name on their own profile links here.
export default function AdminPanel() {
  const admin = hasAtLeast(getCurrentUser(), 'admin')
  const panel = useApi(() => getAdminPanel(), [], { enabled: admin })

  if (!admin || panel.error?.status === 403) {
    return <section className="mx-auto w-full max-w-3xl px-4 py-12 text-center text-white/70">This page is for admins only.</section>
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 text-white sm:py-12">
      <header>
        <h1 className="font-['Bebas_Neue'] text-5xl leading-none tracking-wide">
          Admin <span className="text-brand-gold">panel</span>
        </h1>
        <p className="mt-2 text-white/60">Everything admins can do, in one place. Only admins can open it.</p>
      </header>

      {panel.loading ? (
        <p className="text-white/50">Loading…</p>
      ) : panel.error ? (
        <p className={`${CARD} text-white/70`}>The admin panel won&apos;t load. Try refreshing the page.</p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <SendPpp maxGrant={panel.data.maxGrant} maxNote={panel.data.maxNote} onSent={(grants) => panel.setData({ ...panel.data, grants })} />
          <RecentGrants grants={panel.data.grants} />
        </div>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="admin-tools">
        <h2 id="admin-tools" className={HEADING}>
          Admin <span className="text-brand-gold">tools</span>
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PayoutNow />
          {TOOLS.map((tool) => (
            <li key={tool.path}>
              <Link
                to={tool.path}
                className="group flex h-full flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-brand-gold/60 hover:bg-white/10"
              >
                <span className="font-semibold text-white transition-colors group-hover:text-brand-gold">{tool.name}</span>
                <span className="font-mono text-xs text-brand-gold/80">{tool.path}</span>
                <span className="text-sm text-white/60">{tool.about}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
