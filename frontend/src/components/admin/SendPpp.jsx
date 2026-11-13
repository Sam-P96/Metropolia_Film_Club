import { useState } from 'react'
import MemberAvatar from '../profile/MemberAvatar'
import MemberPicker from '../profile/MemberPicker'
import CoinIcon from '../wallet/CoinIcon'
import { sendPpp } from '../../services/admin'
import { walletChanged } from '../../services/wallet'
import { getCurrentUser } from '../../utils/currentUser'
import { ADMIN_GRANT } from '../../../../shared/admin/config.js'

const GOLD = 'cursor-pointer rounded-lg bg-brand-gold px-4 py-2 font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-50'
const QUIET = 'cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2 font-semibold text-white transition hover:border-brand-gold/60 hover:bg-white/10 disabled:opacity-50'
const FIELD = 'w-full rounded-lg border border-white/15 bg-ink/70 px-3 py-2 text-white placeholder:text-white/30 focus:border-brand-gold focus:outline-none'
const QUICK = [100, 500, 1000, 5000]
const format = (points) => Number(points).toLocaleString('en-US')

// The admin Send P-PP tool, in the admin panel and the Wallet (admins
// only; the server checks): who (any member, or themselves), how much, a
// note they'll see, and a confirmation before anything happens. It's newly
// made P-PP (nobody pays it), on their wallet history as sent by an admin.
// `onSent()` is called after each send (to reload the list of sends).
export default function SendPpp({ onSent }) {
  const me = getCurrentUser()
  const [member, setMember] = useState(null)
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const amount = Number(amountText)
  const valid = member && Number.isInteger(amount) && amount >= 1 && amount <= ADMIN_GRANT.max && note.length <= ADMIN_GRANT.maxNote
  const self = member?._id === me?._id
  const who = self ? 'yourself' : member?.username

  const pick = (picked) => {
    setMember(picked)
    setAsking(false)
  }

  const send = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await sendPpp({ userId: member._id, amount, note })
      setMessage({ text: `Sent ${format(amount)} P-PP to ${who}.` })
      // Their own balance and history, wherever they're showing.
      if (self) walletChanged()
      setMember(null)
      setAmountText('')
      setNote('')
      setAsking(false)
      onSent?.()
    } catch (failure) {
      setMessage({ error: true, text: failure.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {member ? (
        <div className="flex flex-wrap items-center gap-3">
          <MemberAvatar user={member} size="sm" />
          <span className="font-semibold text-white">
            {member.username}
            {self && <span className="font-normal text-white/50"> (you)</span>}
          </span>
          <button type="button" onClick={() => pick(null)} className="cursor-pointer text-sm text-brand-gold underline underline-offset-4">
            Someone else
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <MemberPicker label="Who to?" onPick={pick} includeSelf />
          {me && (
            <button type="button" onClick={() => pick(me)} className="cursor-pointer self-start text-sm text-brand-gold underline underline-offset-4">
              Send it to myself
            </button>
          )}
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs tracking-widest text-white/60 uppercase">How much P-PP</legend>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK.map((quick) => (
            <button
              key={quick}
              type="button"
              aria-pressed={amount === quick}
              onClick={() => {
                setAmountText(String(quick))
                setAsking(false)
              }}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm tabular-nums ${amount === quick ? 'border-brand-gold bg-brand-gold font-bold text-ink' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}
            >
              {format(quick)}
            </button>
          ))}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={ADMIN_GRANT.max}
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
        <p className="text-xs text-white/40">1 to {format(ADMIN_GRANT.max)} at a time.</p>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
        Note (optional, they&apos;ll see it)
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={ADMIN_GRANT.maxNote}
          placeholder="Thanks for reporting that bug!"
          className={FIELD}
        />
      </label>

      {asking && valid ? (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-gold/50 bg-brand-gold/10 p-4" role="alertdialog" aria-label="Confirm">
          <p className="flex flex-wrap items-center gap-1.5 text-white">
            Send <CoinIcon kind="ppp" size={16} /> <strong>{format(amount)} P-PP</strong> to <strong>{who}</strong>? This can&apos;t be undone.
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
    </div>
  )
}
