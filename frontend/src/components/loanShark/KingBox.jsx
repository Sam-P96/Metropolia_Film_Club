import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PillToggle from '../PillToggle'
import useCountdown from '../../hooks/useCountdown'
import { SHARK_LINES, WARNING_LINES, pickLine } from '../../../../shared/loanShark/lines.js'
import { checkTime, formatLeft, points } from '../../utils/loanShark'
import { Amount, BUTTON, Feedback, GLASS, HEADING, INPUT } from './parts'
import SharkJobs from './SharkJobs'
import { KING_LOAN_SHARK_PICTURE } from './kingLoanShark'

const LAST_LINE_KEY = 'loanShark.lastLine'
const DAY_MS = 24 * 60 * 60 * 1000

function readLastLine() {
  try {
    return JSON.parse(localStorage.getItem(LAST_LINE_KEY) ?? 'null')
  } catch {
    return null
  }
}

// A line for `state`, never the one shown last time (remembered in this
// browser, so a reload gets a new one too).
function pickFor(state) {
  const last = readLastLine()
  const lines = SHARK_LINES[state] ?? SHARK_LINES.clear
  return { state, index: pickLine(lines.length, last?.state === state ? last.index : null) }
}

// What King Loan Shark says: a new line each time the page opens, and
// whenever the member's situation changes (say, they borrow).
function SpeechBubble({ state }) {
  const [picked, setPicked] = useState(() => pickFor(state))
  if (picked.state !== state) setPicked(pickFor(state))

  useEffect(() => {
    try {
      localStorage.setItem(LAST_LINE_KEY, JSON.stringify(picked))
    } catch {
      // A private window: it just might repeat.
    }
  }, [picked])

  const line = (SHARK_LINES[picked.state] ?? SHARK_LINES.clear)[picked.index]

  return (
    <div className="relative rounded-2xl border border-brand-gold/40 bg-dice-ivory px-4 py-3 text-ink shadow-lg shadow-black/40 sm:px-5 sm:py-4">
      {/* The tail: pointing up at him on a phone, left at him on a wide screen. */}
      <span
        aria-hidden="true"
        className="absolute -top-2 left-10 size-4 rotate-45 border-t border-l border-brand-gold/40 bg-dice-ivory sm:top-8 sm:-left-2 sm:border-t-0 sm:border-b sm:border-l"
      />
      <p className="relative font-['Cinzel'] text-base leading-snug sm:text-lg">&ldquo;{line}&rdquo;</p>
      <p className="relative mt-1 text-right text-xs font-semibold tracking-widest text-ink/60 uppercase">King Loan Shark</p>
    </div>
  )
}

// His picture (components/loanShark/kingLoanShark.js), the same as at Kino Poker.
function Portrait() {
  return (
    <img
      src={KING_LOAN_SHARK_PICTURE.src}
      alt="King Loan Shark"
      style={{ objectPosition: KING_LOAN_SHARK_PICTURE.position }}
      className="size-28 shrink-0 rounded-full border-4 border-brand-gold bg-plum object-cover shadow-[0_0_30px_rgb(250_188_63/0.35)] sm:size-36 lg:size-44"
    />
  )
}

// "King Loan Shark leaves you alone for: 1d 4h 12m", red under a day.
function LeftAlone({ until }) {
  const left = useCountdown(until)
  if (left === null) return null
  const urgent = left < DAY_MS

  return (
    <div className={`col-span-2 rounded-xl border px-4 py-3 ${urgent ? 'border-red-400/60 bg-red-500/15' : 'border-white/10 bg-white/5'}`}>
      <p className={HEADING}>King Loan Shark leaves you alone for</p>
      <p className={`mt-1 font-['Bebas_Neue'] text-4xl leading-none tracking-wide tabular-nums ${urgent ? 'text-red-300' : 'text-white'}`} aria-live="off">
        {left > 0 ? formatLeft(left) : 'Any moment now'}
      </p>
      <p className="mt-1 text-xs text-white/50">Until {checkTime(until)}</p>
    </div>
  )
}

function Stat({ label, children, note }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className={HEADING}>{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{children}</p>
      {note && <p className="mt-0.5 text-xs text-white/50">{note}</p>}
    </div>
  )
}

// The warnings: a payment due, a payment missed, Kaveri collecting. Each
// says what's happening, then King Loan Shark adds a line of his own.
function Warnings({ shark, daily }) {
  const [flavour] = useState(() => Math.floor(Math.random() * WARNING_LINES.length))
  const { warnings } = shark
  if (!warnings || (!warnings.due && !warnings.missed && !warnings.collector)) return null

  return (
    <div role="alert" className="flex flex-col gap-1.5 rounded-xl border border-red-400/50 bg-red-950/50 px-4 py-3 text-sm text-red-100">
      {warnings.collector && (
        <p>
          <strong className="text-red-300">Debt collector active.</strong> Kaveri takes {points(shark.collectorTakes)} PP (40% of your{' '}
          {points(daily)} daily PP) every day at 12:00 until you&apos;re paid off.
        </p>
      )}
      {warnings.missed && !warnings.collector && (
        <p>
          <strong className="text-red-300">Payment missed.</strong> {shark.missed === 1 ? 'One missed payment' : `${shark.missed} missed payments`} so far: your rate
          is {shark.rate}%.
        </p>
      )}
      {warnings.due && !warnings.collector && (
        <p>
          <strong className="text-red-300">Payment due.</strong> Pay at least {points(shark.toCoverNext)} by {checkTime(shark.nextCheckAt)}, or your rate
          doubles to {shark.nextRate}%.
        </p>
      )}
      <p className="font-['Cinzel'] text-red-200/90 italic">{WARNING_LINES[flavour]}</p>
    </div>
  )
}

const MODES = [
  { value: 'pay', label: 'Pay back' },
  { value: 'borrow', label: 'Take more loan' },
]

// The box at the top of the page: King Loan Shark, what they owe him, and
// the one form to pay back or borrow more. `onPay(amount)` and
// `onBorrow(amount)` resolve to a message for under the form.
export default function KingBox({ view, onPay, onBorrow }) {
  const { shark, me, rules } = view
  const inDebt = shark.borrowed > 0
  const [mode, setMode] = useState(inDebt ? 'pay' : 'borrow')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const value = Number(amount)
  const valid = Number.isInteger(value) && value > 0
  const blocked = mode === 'borrow' ? !me.canBorrow || shark.maxBorrow === 0 : !inDebt

  async function submit(event) {
    event.preventDefault()
    if (!valid || busy || blocked) return
    setBusy(true)
    setMessage(null)
    const result = await (mode === 'pay' ? onPay : onBorrow)(value)
    setMessage(result)
    if (!result.error) {
      setAmount('')
      if (mode === 'borrow') setMode('pay')
    }
    setBusy(false)
  }

  return (
    <section className={`${GLASS} overflow-hidden`} aria-labelledby="king-heading">
      <div className="flex flex-col gap-6 p-5 sm:p-7">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Portrait />
          <div className="flex w-full min-w-0 flex-col gap-3">
            <h2 id="king-heading" className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white sm:text-4xl">
              King <span className="text-brand-gold">Loan Shark</span>
            </h2>
            <SpeechBubble state={shark.state} />
          </div>
        </div>

        <Warnings shark={shark} daily={me.dailyPp} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Amount borrowed">
            <Amount value={shark.borrowed} kind="ppp" />
          </Stat>
          <Stat label="Current interest rate" note={inDebt ? `Doubles on each missed payment, up to ${rules.sharkMaxRate}%` : `Total, not daily`}>
            <span className={shark.rate > rules.sharkStartRate ? 'text-red-300' : ''}>{shark.rate}%</span>
          </Stat>
          <Stat label="Total owed" note={inDebt && shark.jobReduction > 0 ? `${points(shark.jobReduction)} taken off by jobs` : null}>
            {points(shark.owed)}
          </Stat>
          <Stat
            label="Today's minimum payment"
            note={inDebt && shark.credit > 0 ? `${points(shark.credit)} already paid towards the next one` : inDebt ? `${rules.minimumPayment}% of what you borrowed` : null}
          >
            {points(shark.minimum)}
          </Stat>
          <Stat label="Max you can still borrow" note={`${rules.sharkCapTimesDaily}x your ${points(me.dailyPp)} daily PP, in all`}>
            <Amount value={shark.maxBorrow} kind="ppp" />
          </Stat>
          {inDebt && <LeftAlone until={shark.leavesAloneUntil} />}
        </div>

        {!me.canBorrow && (
          <p className="rounded-xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-white/80">
            King Loan Shark only lends to members with a review to their name.{' '}
            <Link to="/movie_reviews" className="font-semibold text-brand-gold hover:text-white">
              Post a review
            </Link>{' '}
            first, then come back.
          </p>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <PillToggle options={MODES} value={mode} onChange={setMode} label="Pay back or borrow" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="shark-amount">
              {mode === 'pay' ? 'Amount to pay back' : 'Amount to borrow'}
            </label>
            <input
              id="shark-amount"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={mode === 'pay' ? (inDebt ? `Up to ${points(shark.owed)}` : 'Nothing to pay back') : `Up to ${points(shark.maxBorrow)} P-PP`}
              className={`${INPUT} sm:max-w-xs`}
              disabled={blocked}
            />
            <button type="submit" className={BUTTON} disabled={!valid || busy || blocked}>
              {busy ? 'Counting…' : 'Submit'}
            </button>
          </div>
          <p className="text-xs text-white/50">
            {mode === 'pay'
              ? 'Paid from your PP first, then P-PP. Each full daily minimum you pay covers one more 12:00 check.'
              : `Paid out in P-PP. Interest is ${shark.rate}% of everything you've borrowed, in total.`}
          </p>
          <Feedback message={message} />
        </form>

        {inDebt && <SharkJobs shark={shark} rules={rules} />}
      </div>
    </section>
  )
}
