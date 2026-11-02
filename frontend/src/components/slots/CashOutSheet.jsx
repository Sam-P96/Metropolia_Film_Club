import { useEffect, useState } from 'react'
import CoinIcon from '../wallet/CoinIcon'
import Sheet from './Sheet'
import { getCashOutQuote } from '../../services/slots'
import { formatPoints } from './format'

const BUTTON = 'min-h-11 cursor-pointer rounded-xl font-bold transition disabled:cursor-default disabled:opacity-40'

// Cash out's confirmation: what goes back to the wallet (PP as PP, P-PP as
// P-PP, each rounded down), what stays in the machine, and how much more
// P-PP can be cashed out today. `onConfirm` cashes out and resolves when done.
export default function CashOutSheet({ onConfirm, onClose }) {
  const [quote, setQuote] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let stopped = false
    getCashOutQuote().then(
      (data) => !stopped && setQuote(data),
      (err) => !stopped && setError(err.message)
    )
    return () => {
      stopped = true
    }
  }, [])

  const nothing = quote && quote.pp + quote.ppp === 0

  const confirm = async () => {
    setSaving(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Sheet title="Cash out" onClose={onClose}>
      <div className="flex flex-col gap-3 text-sm">
        {!quote && !error && <p className="text-white/50">Counting…</p>}

        {quote && (
          <>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-xs tracking-widest text-white/50 uppercase">To your wallet</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <CoinIcon kind="pp" size={18} /> {quote.pp} PP
                </span>
                <span className="flex items-center gap-1.5">
                  <CoinIcon kind="ppp" size={18} /> {quote.ppp} P-PP
                </span>
              </p>
            </div>

            {quote.stays > 0 && (
              <p className="text-white/70">
                Staying in the machine: <span className="font-semibold text-white">{formatPoints(quote.stays)} PP</span>
                {quote.overCap > 0
                  ? `, ${formatPoints(quote.overCap)} of it P-PP over today's cap, which you can cash out on another day.`
                  : ': the fractions under 1 point.'}
              </p>
            )}

            <p className="text-white/70">
              P-PP you can still cash out today: <span className="font-semibold text-(--slot-gold)">{formatPoints(quote.capLeft)}</span>.
              The cap resets at 12:00.
            </p>
          </>
        )}

        {error && <p role="alert" className="text-(--slot-alert)">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className={`${BUTTON} border border-white/15 bg-white/5 text-white hover:bg-white/10`}>
            Keep playing
          </button>
          <button type="button" onClick={confirm} disabled={!quote || nothing || saving} className={`${BUTTON} bg-(--slot-gold) text-ink hover:brightness-110`}>
            {saving ? 'Cashing out…' : 'Cash out'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
