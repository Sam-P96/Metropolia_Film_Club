import { useState } from 'react'
import CoinIcon from './CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import MemberPicker from '../profile/MemberPicker'
import { sendGift, walletChanged } from '../../services/wallet'

// What a gift costs on top of itself, whatever its size. Matches GIFT_FEE
// in backend/utils/wallet.js.
const FEE = 1

const format = (points) => points.toLocaleString('en-US')

// "Gift PP": some of your P-PP to another member. It's called Gift PP, but
// only P-PP can be given. Each gift costs 1 point on top, taken from PP if
// you have any, otherwise from P-PP. `wallet` is from useWallet.
export default function GiftForm({ wallet }) {
  const [to, setTo] = useState(null)
  const [amountText, setAmountText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(null)

  const feeFromPp = wallet && wallet.pp >= FEE
  const max = wallet ? Math.max(0, wallet.ppp - (feeFromPp ? 0 : FEE)) : 0
  const amount = Number(amountText)
  const whole = amountText !== '' && Number.isInteger(amount)

  let hint = ''
  if (amountText !== '' && (!whole || amount < 1)) hint = 'A gift is a whole number of P-PP, at least 1.'
  else if (whole && amount > max) hint = `The most you can gift right now is ${format(max)} P-PP.`
  const valid = whole && amount >= 1 && amount <= max

  const send = async () => {
    setSending(true)
    setError('')
    try {
      await sendGift({ to: to._id, amount })
      walletChanged()
      setSent({ name: to.username, amount })
      setTo(null)
      setAmountText('')
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  if (wallet && max < 1 && !sent) {
    return <p className="text-sm text-white/70">You need some P-PP to gift. P-PP is what you win in games.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {sent && (
        <p role="status" className="flex flex-wrap items-center gap-1.5 text-emerald-300">
          Sent! {sent.name} got <CoinIcon kind="ppp" size={15} /> {format(sent.amount)} P-PP.
        </p>
      )}

      {!to ? (
        <MemberPicker
          label="Who to gift"
          onPick={(member) => {
            setTo(member)
            setSent(null)
            setError('')
          }}
        />
      ) : (
        <div className="flex animate-slide-in flex-col gap-4 motion-reduce:animate-none">
          <div className="flex flex-wrap items-center gap-3">
            <MemberAvatar user={to} size="sm" />
            <span className="min-w-0 truncate text-lg font-semibold text-white">{to.username}</span>
            <button type="button" onClick={() => setTo(null)} className="cursor-pointer text-sm text-brand-gold underline underline-offset-4">
              Someone else
            </button>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-white/60">How much P-PP</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              step={1}
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
              className="w-32 rounded-xl border border-white/20 bg-ink/60 px-3 py-2 text-lg font-bold tabular-nums text-white focus-visible:outline-2 focus-visible:outline-brand-gold"
            />
          </label>

          <p className={`min-h-5 text-sm ${hint ? 'text-red-300' : 'text-white/70'}`}>
            {hint ||
              (valid && (
                <>
                  {to.username} gets {format(amount)} P-PP. It costs you {format(amount + (feeFromPp ? 0 : FEE))} P-PP
                  {feeFromPp ? ' and 1 PP for the fee.' : ', with the 1 point fee.'}
                </>
              ))}
          </p>

          <button
            type="button"
            onClick={send}
            disabled={!valid || sending}
            className="min-h-12 cursor-pointer self-start rounded-xl bg-brand-gold px-5 font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-40"
          >
            {sending ? 'Sending…' : valid ? `Gift ${format(amount)} P-PP` : 'Gift'}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
