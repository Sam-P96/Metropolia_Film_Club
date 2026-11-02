import { useState } from 'react'
import CoinIcon from '../wallet/CoinIcon'
import Sheet from './Sheet'
import { SLOTS } from '../../../../shared/slots/config.js'

const BUTTON = 'min-h-11 cursor-pointer rounded-xl font-bold transition disabled:cursor-default disabled:opacity-40'

// Add credits: points from the wallet into the machine, PP first, then
// P-PP. A number to type, or the quick buttons, which add to it (All takes
// everything). `onAdd(amount)` moves them and resolves when done.
export default function AddCreditsSheet({ wallet, onAdd, onClose }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const total = wallet ? wallet.pp + wallet.ppp : 0
  const amount = Number(text)
  const valid = Number.isInteger(amount) && amount >= 1 && amount <= total
  const fromPp = valid ? Math.min(wallet.pp, amount) : 0

  const bump = (by) => setText(String(Math.min(total, (Number.isInteger(amount) && amount > 0 ? amount : 0) + by)))

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      await onAdd(amount)
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Sheet title="Add credits" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
          In your wallet:
          <span className="flex items-center gap-1.5 font-semibold text-white">
            <CoinIcon kind="pp" size={16} /> {wallet ? wallet.pp : '…'} PP
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-white">
            <CoinIcon kind="ppp" size={16} /> {wallet ? wallet.ppp : '…'} P-PP
          </span>
        </p>

        <label className="flex flex-col gap-1.5 text-xs tracking-widest text-white/50 uppercase">
          How many points
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            max={total}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="0"
            className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 font-['Bebas_Neue'] text-3xl tracking-wide text-white outline-none focus:border-(--slot-gold)"
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          {SLOTS.quickCredits.map((by) => (
            <button key={by} type="button" onClick={() => bump(by)} disabled={!wallet || total === 0} className={`${BUTTON} border border-white/15 bg-white/5 text-white hover:bg-white/10`}>
              +{by}
            </button>
          ))}
          <button type="button" onClick={() => setText(String(total))} disabled={!wallet || total === 0} className={`${BUTTON} border border-white/15 bg-white/5 text-white hover:bg-white/10`}>
            All
          </button>
        </div>

        <p className="min-h-5 text-sm text-white/60">
          {valid
            ? [fromPp && `${fromPp} PP`, amount - fromPp && `${amount - fromPp} P-PP`].filter(Boolean).join(' + ')
            : text && amount > total
              ? `You have ${total} points.`
              : 'PP goes in first, then P-PP.'}
        </p>

        {error && <p role="alert" className="text-sm text-(--slot-alert)">{error}</p>}

        <button type="submit" disabled={!valid || saving} className={`${BUTTON} bg-(--slot-gold) text-ink hover:brightness-110`}>
          {saving ? 'Adding…' : valid ? `Add ${amount}` : 'Add credits'}
        </button>
      </form>
    </Sheet>
  )
}
