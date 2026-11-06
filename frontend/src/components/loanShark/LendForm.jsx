import { useState } from 'react'
import PillToggle from '../PillToggle'
import { lendPreview, points } from '../../utils/loanShark'
import { BUTTON, Feedback, INPUT } from './parts'

const STYLES = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'flexible', label: 'Flexible' },
]

// The live preview: what a borrower pays back, the lender's profit, the
// income tax on it, and what they keep. A Fixed offer's on the whole
// amount; a Flexible one's on a smallest draw.
function Preview({ style, amount, rate, rules }) {
  if (!(amount >= rules.minDraw) || !(rate >= 0)) {
    return <p className="text-sm text-white/50">Fill in an amount (at least {rules.minDraw} PP) and a rate to see what you&apos;d make.</p>
  }
  const base = style === 'fixed' ? amount : rules.minDraw
  const sums = lendPreview(base, rate, rules.tax)

  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-xl border border-white/10 bg-ink/50 px-4 py-3 text-sm" aria-live="polite">
      <dt className="col-span-2 mb-1 text-white/80">
        Borrowers who take {points(sums.amount)} pay back <strong className="text-white">{points(sums.payBack)}</strong>.
      </dt>
      <dt className="text-white/60">Your profit</dt>
      <dd className="text-right tabular-nums text-white">{points(sums.profit)} PP</dd>
      <dt className="text-white/60">Income tax ({rules.tax}%)</dt>
      <dd className="text-right tabular-nums text-red-300">{points(sums.tax)} PP</dd>
      <dt className="font-semibold text-white">You keep</dt>
      <dd className="text-right font-semibold tabular-nums text-emerald-300">{points(sums.keep)} PP</dd>
    </dl>
  )
}

// Inside the "Lend Money" box: put up an offer for other members to borrow.
// `onPost({ style, amount, rate })` resolves to a message.
export default function LendForm({ rules, offersUp, onPost }) {
  const [style, setStyle] = useState('fixed')
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const amountValue = Number(amount)
  const rateValue = rate === '' ? NaN : Number(rate)
  const full = offersUp >= rules.maxOffers
  const valid =
    Number.isInteger(amountValue) &&
    amountValue >= rules.minDraw &&
    amountValue <= rules.maxOffer &&
    Number.isInteger(rateValue) &&
    rateValue >= 0 &&
    rateValue <= rules.playerMaxRate

  async function submit(event) {
    event.preventDefault()
    if (!valid || busy || full) return
    setBusy(true)
    setMessage(null)
    const result = await onPost({ style, amount: amountValue, rate: rateValue })
    setMessage(result)
    if (!result.error) {
      setAmount('')
      setRate('')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-white/80">Loan style</span>
        <PillToggle options={STYLES} value={style} onChange={setStyle} label="Loan style" />
        <p className="text-xs text-white/50">
          {style === 'fixed'
            ? 'One borrower takes exactly this amount, and the offer closes.'
            : `A pool: anyone can borrow any amount from it, at least ${rules.minDraw} PP at a time, until it's empty.`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
          Amount (PP)
          <input
            type="number"
            inputMode="numeric"
            min={rules.minDraw}
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={`At least ${rules.minDraw}`}
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
          Interest rate (% total)
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max={rules.playerMaxRate}
            step="1"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            placeholder={`0 to ${rules.playerMaxRate}`}
            className={INPUT}
          />
        </label>
      </div>

      <Preview style={style} amount={amountValue} rate={rateValue} rules={rules} />

      <p className="text-xs text-white/50">
        Lent from your PP. It stays out of your wallet until it&apos;s borrowed or you take the offer down, and still counts towards your PP cap. You&apos;re
        paid back in P-PP: {rules.autoRepay}% of each borrower&apos;s daily PP every day at 12:00, or all at once if they pay you off early. Offers never
        expire. {offersUp} of {rules.maxOffers} offers up.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="submit" className={BUTTON} disabled={!valid || busy || full}>
          {busy ? 'Posting…' : 'Post offer'}
        </button>
        {full && <p className="text-sm text-white/60">You have {rules.maxOffers} offers up. Take one down to post another.</p>}
      </div>
      <Feedback message={message} />
    </form>
  )
}
