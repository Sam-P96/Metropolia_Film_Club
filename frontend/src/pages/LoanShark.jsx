import '@fontsource/bebas-neue'
import '@fontsource/cinzel'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MotionConfig, motion } from 'motion/react'

import AnimatedNumber from '../components/AnimatedNumber'
import GameBackdrop from '../components/GameBackdrop'
import CoinIcon from '../components/wallet/CoinIcon'
import KingBox from '../components/loanShark/KingBox'
import LendForm from '../components/loanShark/LendForm'
import MyLoans from '../components/loanShark/MyLoans'
import Postings from '../components/loanShark/Postings'
import { BUTTON, Feedback, GLASS, INPUT } from '../components/loanShark/parts'
import useApi from '../hooks/useApi'
import useWallet from '../hooks/useWallet'
import {
  borrowFromOffer,
  borrowFromShark,
  getLoanShark,
  payOffDebt,
  payShark,
  postOffer,
  runTestCheck,
  sendCollector,
  takeDownOffer,
} from '../services/loanShark'
import { checkTime, points } from '../utils/loanShark'

const EASE = [0.22, 1, 0.36, 1]

function Skeleton({ className }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-white/10 ${className}`} />
}

// Admins only, for testing: the next 12:00 check, right now, for
// themselves or another member. It pays that day's PP too, and the real
// payout then skips that day for them.
function TestTools({ onRun }) {
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    setMessage(await onRun(username.trim()))
    setBusy(false)
  }

  return (
    <details className={`${GLASS} p-5 text-sm text-white/70 sm:p-6`}>
      <summary className="cursor-pointer font-semibold text-white">Admin test tools</summary>
      <p className="mt-3">
        Runs a member&apos;s next 12:00 check now, as if it were noon on that day: their payout, player loan repayments, the missed-payment check and
        Kaveri. Each press is the next day. That day&apos;s real payout then skips them, so nobody is ever paid twice for a day.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username (blank: you)"
          className={`${INPUT} sm:max-w-xs`}
          aria-label="Username to run the check for"
        />
        <button type="submit" className={BUTTON} disabled={busy}>
          {busy ? 'Running…' : 'Run the next 12:00 check'}
        </button>
      </form>
      <div className="mt-2">
        <Feedback message={message} />
      </div>
    </details>
  )
}

// Development mode only (the Vite dev server: a production build leaves it
// out), and admins only on the server: Kaveri Heiwajima comes for you right
// now, to see him at work and his notifications. Your rate goes to 160%,
// and he takes 40% of your daily PP from your wallet, towards the debt.
// No payout day is used up, so press it as often as you like.
function DevTools({ inDebt, onSend }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function send() {
    setBusy(true)
    setMessage(null)
    setMessage(await onSend())
    setBusy(false)
  }

  return (
    <section className="rounded-2xl border-2 border-dashed border-sky-400/50 bg-sky-950/40 p-5 text-sm text-white/70 sm:p-6" aria-labelledby="dev-heading">
      <h2 id="dev-heading" className="text-xs font-semibold tracking-widest text-sky-300 uppercase">
        Development mode
      </h2>
      <p className="mt-2">
        Sends Kaveri Heiwajima for you right now, as at 12:00 with the collector active: your rate goes to 160%, he takes 40% of your daily PP from your
        wallet (towards your debt), and his notification arrives with a new line each time. No payout day is used up. Admins only.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={send} disabled={busy || !inDebt} className={BUTTON}>
          {busy ? 'Knocking…' : 'Send Kaveri now'}
        </button>
        {!inDebt && <p className="text-white/60">Take a loan from King Loan Shark first: Kaveri only comes for debtors.</p>}
      </div>
      {message && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Feedback message={message} />
          {!message.error && (
            <Link to="/feed" className="text-sm font-semibold text-sky-300 hover:text-white">
              See it in your notifications →
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

// Loan Shark: borrow from King Loan Shark, lend to other members, or borrow
// from them (backend/utils/loanShark/). Top to bottom: King Loan Shark's
// box, the Lend Money button and its form, the member's own player loans,
// and everyone else's offers. Every change comes back with the whole page
// as it now is.
export default function LoanShark() {
  const wallet = useWallet()
  const loaded = useApi(() => getLoanShark(), [])
  const view = loaded.data
  const [lending, setLending] = useState(false)

  // Runs a change; the page takes the new state it comes back with.
  // Resolves to a message for whatever asked: { text } or { error, text }.
  async function run(action, success) {
    try {
      const result = await action()
      loaded.setData(result.view)
      return { text: success(result.done) }
    } catch (error) {
      return { error: true, text: error.message }
    }
  }

  const handlers = {
    pay: (amount) =>
      run(
        () => payShark(amount),
        (done) =>
          done.cleared
            ? `Paid ${points(done.paid)}. Your debt to King Loan Shark is cleared!`
            : done.days > 0
              ? `Paid ${points(done.paid)}. Covered until ${checkTime(done.paidUntil)}.`
              : `Paid ${points(done.paid)}. That's towards your next daily minimum.`,
      ),
    borrow: (amount) => run(() => borrowFromShark(amount), (done) => `Borrowed ${points(done.amount)} P-PP.${done.isNew ? ' Check your jobs below.' : ''}`),
    post: (offer) => run(() => postOffer(offer), (done) => `Offer posted: ${points(done.amount)} PP at ${done.rate}%.`),
    takeDown: (id) => run(() => takeDownOffer(id), (done) => `Taken down. ${points(done.returned)} PP back in your wallet.`),
    borrowOffer: (id, amount) => run(() => borrowFromOffer(id, amount), (done) => `Borrowed ${points(done.amount)} PP.`),
    payOff: (id) => run(() => payOffDebt(id), (done) => `Paid off: ${points(done.paid)}.`),
    collector: () =>
      run(
        () => sendCollector(),
        (done) =>
          done.cleared
            ? `Kaveri took the last ${points(done.take)} PP. Your debt is cleared.`
            : `Kaveri took ${points(done.take)} PP. You still owe ${points(done.left)}.`,
      ),
    test: (username) =>
      run(
        () => runTestCheck(username || undefined),
        (done) =>
          done.result
            ? `Checked ${done.day}: ${points(done.result.daily)} daily PP, ${points(done.result.deducted)} to loans, ${points(done.result.credited)} into the wallet.`
            : `Nothing to do for ${done.day}.`,
      ),
  }

  return (
    <MotionConfig reducedMotion="user">
      {/* The club's purple running into deep sea. */}
      <GameBackdrop to="#0B5563" />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:py-12"
      >
        <header>
          <Link to="/games" className="text-sm text-white/60 hover:text-white">
            ← Games
          </Link>
          <h1 className="mt-2 font-['Bebas_Neue'] text-5xl leading-none tracking-wide text-white">
            Loan <span className="text-brand-gold">Shark</span>
          </h1>
          <p className="mt-2 max-w-2xl text-white/70">
            Short on points? King Loan Shark is always lending. So are your fellow members, for a fee. Pay on time. He has a very good memory and a very
            small bunny.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg font-bold text-white" aria-label="Your points">
            <span className="flex items-center gap-1.5">
              <CoinIcon kind="pp" size={18} /> {wallet ? <AnimatedNumber value={wallet.pp} /> : '…'}
            </span>
            <span className="flex items-center gap-1.5">
              <CoinIcon kind="ppp" size={18} /> {wallet ? <AnimatedNumber value={wallet.ppp} /> : '…'}
            </span>
          </p>
        </header>

        {!view ? (
          loaded.error ? (
            <p className={`${GLASS} p-6 text-white/70`}>Couldn&apos;t reach King Loan Shark. Try refreshing the page.</p>
          ) : (
            <>
              <Skeleton className="h-96" />
              <Skeleton className="h-14" />
              <Skeleton className="h-48" />
            </>
          )
        ) : (
          <>
            <KingBox view={view} onPay={handlers.pay} onBorrow={handlers.borrow} />

            <section className={`${GLASS} overflow-hidden`}>
              <button
                type="button"
                onClick={() => setLending((open) => !open)}
                aria-expanded={lending}
                aria-controls="lend-money"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/5 sm:px-6"
              >
                <span className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
                  Lend <span className="text-brand-gold">Money</span>
                </span>
                <span aria-hidden="true" className={`text-2xl text-brand-gold transition-transform ${lending ? 'rotate-45' : ''}`}>
                  +
                </span>
              </button>
              {lending && (
                <div id="lend-money" className="border-t border-white/10 px-5 py-5 sm:px-6">
                  <LendForm rules={view.rules} offersUp={view.player.lending.offers.length} onPost={handlers.post} />
                </div>
              )}
            </section>

            <MyLoans player={view.player} rules={view.rules} onPayOff={handlers.payOff} onTakeDown={handlers.takeDown} />
            <Postings player={view.player} rules={view.rules} canBorrow={view.me.canBorrow} onBorrow={handlers.borrowOffer} />
            {import.meta.env.DEV && <DevTools inDebt={view.shark.borrowed > 0} onSend={handlers.collector} />}
            {view.me.isAdmin && <TestTools onRun={handlers.test} />}
          </>
        )}
      </motion.div>
    </MotionConfig>
  )
}
