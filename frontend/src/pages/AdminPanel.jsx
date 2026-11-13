import '@fontsource/bebas-neue'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import GrantLog from '../components/admin/GrantLog'
import SendPpp from '../components/admin/SendPpp'
import { runPayoutNow } from '../services/admin'
import { walletChanged } from '../services/wallet'
import { getCurrentUser } from '../utils/currentUser'
import { hasAtLeast } from '../utils/permissions'
import { SECRET_PAGES } from '../utils/secretPages'

const CARD = 'rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6'
const HEADING = "font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white"
const GOLD = 'cursor-pointer rounded-lg bg-brand-gold px-4 py-2 font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-50'
const QUIET = 'cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2 font-semibold text-white transition hover:border-brand-gold/60 hover:bg-white/10 disabled:opacity-50'

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

// The Send P-PP tool (components/admin/SendPpp.jsx), in a card. The
// Wallet has it too, for admins.
function SendCard({ onSent }) {
  return (
    <section className={`${CARD} flex flex-col gap-4`} aria-labelledby="send-ppp">
      <div>
        <h2 id="send-ppp" className={HEADING}>
          Send <span className="text-brand-gold">P-PP</span>
        </h2>
        <p className="mt-1 text-sm text-white/60">
          New P-PP for a member or yourself, made from nothing. It shows on their wallet history as sent by an admin, and they get a notification with your note.
        </p>
      </div>
      <SendPpp onSent={onSent} />
    </section>
  )
}

// Every send by every admin (components/admin/GrantLog.jsx), in a card.
function GrantsCard({ version }) {
  return (
    <section className={`${CARD} flex flex-col gap-3`} aria-labelledby="recent-grants">
      <div>
        <h2 id="recent-grants" className={HEADING}>
          Sent by <span className="text-brand-gold">admins</span>
        </h2>
        <p className="mt-1 text-sm text-white/60">Every send with the Send P-PP tool, by every admin, newest first.</p>
      </div>
      <GrantLog version={version} />
    </section>
  )
}

// The three warnings before running the payout early, one after another:
// what each part of it does to members if it runs before 12:00.
const PAYOUT_WARNINGS = [
  {
    title: 'Everyone is paid now, not at 12:00',
    why: "Every member not paid today gets today's PP straight away, and the real 12:00 payout then pays nobody, since nobody is paid twice in a day. Reviews written between now and 12:00 won't count until tomorrow's payout. (If today's payout has already gone out, this does nothing.)",
    next: 'I understand, next',
  },
  {
    title: "Loan Shark's daily check runs now too",
    why: "The payout is when loans are settled. Anyone with a King Loan Shark payment due who hasn't paid it yet has their rate doubled now, hours before they expect it. Kaveri collects from everyone at the top rate, lenders get their share of borrowers' PP, and Steal and Defend debts are paid off out of it.",
    next: 'I understand, next',
  },
  {
    title: "It can't be undone",
    why: "Nobody's PP, doubled loan rates or Kaveri's collecting can be taken back from here, and every member paid gets the payout notification now. Only run it if the 12:00 payout didn't happen (say the server was down) or everyone knows it's coming.",
    next: 'Yes, pay everyone now',
  },
]

// Today's 12:00 PP payout, now, for anyone not paid today yet (it never
// pays anyone twice in a day). It asks three times first, each time saying
// why running it could be a problem.
function PayoutNow() {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const warning = step > 0 ? PAYOUT_WARNINGS[step - 1] : null

  const run = async () => {
    setBusy(true)
    try {
      await runPayoutNow()
      walletChanged()
      setMessage({ text: 'Done: everyone not paid today has their PP.' })
      setStep(0)
    } catch (failure) {
      setMessage({ error: true, text: failure.message })
    } finally {
      setBusy(false)
    }
  }

  const next = () => {
    if (step < PAYOUT_WARNINGS.length) setStep(step + 1)
    else run()
  }

  return (
    // The warnings take the whole row while they're up, to be read.
    <li className={`flex flex-col gap-2 rounded-xl border p-4 ${warning ? 'border-red-400/60 bg-red-950/40 sm:col-span-2 lg:col-span-3' : 'border-white/10 bg-white/5'}`}>
      <span className="font-semibold text-white">Daily PP payout, now</span>
      <span className="text-sm text-white/60">Runs today&apos;s 12:00 payout straight away, for everyone not paid today yet. Nobody is paid twice in a day.</span>
      {warning ? (
        <div className="flex flex-col gap-3" role="alertdialog" aria-labelledby="payout-warning" aria-describedby="payout-why">
          <p className="text-xs font-semibold tracking-widest text-red-300 uppercase">
            Warning {step} of {PAYOUT_WARNINGS.length}
          </p>
          <p id="payout-warning" className="text-lg font-bold text-white">
            {warning.title}
          </p>
          <p id="payout-why" className="text-sm text-white/80">
            {warning.why}
          </p>
          <span className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={next} disabled={busy} className={step === PAYOUT_WARNINGS.length ? GOLD : QUIET}>
              {busy ? 'Paying…' : warning.next}
            </button>
            <button type="button" onClick={() => setStep(0)} disabled={busy} className={QUIET}>
              Cancel
            </button>
          </span>
        </div>
      ) : (
        <span>
          <button
            type="button"
            onClick={() => {
              setMessage(null)
              setStep(1)
            }}
            className={QUIET}
          >
            Run the payout
          </button>
        </span>
      )}
      {message && <span className={`text-sm ${message.error ? 'text-red-300' : 'text-emerald-300'}`}>{message.text}</span>}
    </li>
  )
}

// /admin: the admin panel, for admins (any admin, whatever their name; the
// server checks everything it does). Sending P-PP to members, every send
// by every admin, the daily payout on demand, and every other admin tool
// on the site, to go to from here. Not in the nav: an admin's name on
// their own profile links here.
export default function AdminPanel() {
  const admin = hasAtLeast(getCurrentUser(), 'admin')
  // Goes up after each send, so the list loads it.
  const [sends, setSends] = useState(0)

  if (!admin) {
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

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SendCard onSent={() => setSends((count) => count + 1)} />
        <GrantsCard version={sends} />
      </div>

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
