import { useState } from 'react'
import CoinIcon from '../wallet/CoinIcon'
import StyledAvatar from '../cosmetics/StyledAvatar'
import StyledUsername from '../cosmetics/StyledUsername'

const BUTTON = 'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40'
const GOLD = `${BUTTON} bg-brand-gold text-ink hover:bg-white`
const QUIET = `${BUTTON} border border-white/20 text-white/80 hover:border-brand-gold hover:text-white`

// The preview: the member's own name in the style, or their own picture in
// the border, at the size they're shown on a leaderboard.
export function ItemPreview({ item, me }) {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-xl bg-ink/80 px-4 py-6">
      {item.type === 'name' ? (
        <span className="max-w-full text-center font-medium text-white">
          <StyledUsername name={me.username} styleId={item.id} />
        </span>
      ) : (
        <StyledAvatar borderId={item.id} user={me} />
      )}
    </div>
  )
}

// One item in the shop: its preview, price and review requirement, and what
// the member can do with it: buy it (asking first), wear it, or take it off.
// `shop` is the member's state (backend/utils/blackMarket.js shopView);
// `onBuy`, `onWear` and `onTakeOff` resolve to an error message, or null.
export default function ItemCard({ item, me, shop, onBuy, onWear, onTakeOff }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const free = item.price === 0
  const owned = free || shop.owned.includes(item.id)
  const worn = (shop.wearing[item.type] ?? `${item.type}.default`) === item.id
  const fewReviews = shop.reviews < item.reviews
  const short = shop.ppp < item.price

  async function run(action) {
    setBusy(true)
    setError(null)
    const problem = await action()
    setError(problem)
    if (!problem) setAsking(false)
    setBusy(false)
  }

  let action
  if (worn) {
    action = free ? (
      <span className="text-sm font-semibold text-emerald-300">Wearing</span>
    ) : (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-emerald-300">Wearing</span>
        <button type="button" className={QUIET} disabled={busy} onClick={() => run(() => onTakeOff(item.type))}>
          Take off
        </button>
      </div>
    )
  } else if (owned) {
    action = (
      <button type="button" className={QUIET} disabled={busy} onClick={() => run(() => onWear(item))}>
        Wear
      </button>
    )
  } else if (asking) {
    action = null
  } else {
    action = (
      <button
        type="button"
        className={GOLD}
        disabled={busy || fewReviews || short}
        onClick={() => setAsking(true)}
        title={fewReviews ? `Needs ${item.reviews} reviews` : short ? 'Not enough P-PP' : undefined}
      >
        Buy
      </button>
    )
  }

  return (
    <li className={`flex flex-col gap-3 rounded-2xl border bg-plum/40 p-3 backdrop-blur-md ${worn ? 'border-emerald-400/60' : 'border-white/10'}`}>
      <ItemPreview item={item} me={me} />
      <div className="flex items-start justify-between gap-2 px-1">
        <h3 className="font-semibold text-white">{item.name}</h3>
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[0.7rem] font-semibold text-white/60">{item.category}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-sm">
        <span className="flex items-center gap-1.5 font-semibold tabular-nums text-white">
          {free ? (
            'Free'
          ) : (
            <>
              <CoinIcon kind="ppp" size={15} />
              {item.price.toLocaleString('en-US')} P-PP
            </>
          )}
        </span>
        {!owned && item.reviews > 0 && (
          <span className={fewReviews ? 'text-red-300' : 'text-white/50'}>
            Needs {item.reviews} reviews{fewReviews ? ` (you have ${shop.reviews})` : ''}
          </span>
        )}
        {owned && !free && <span className="text-white/50">Yours</span>}
      </div>

      {asking && !owned && (
        <div className="flex flex-col gap-2 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-3 text-sm text-white/80">
          <p>
            Buy <strong className="text-white">{item.name}</strong> for {item.price.toLocaleString('en-US')} P-PP? It&apos;s yours for good, but the P-PP is
            gone: no refunds, no selling back, no trading.
          </p>
          <div className="flex gap-2">
            <button type="button" className={GOLD} disabled={busy} onClick={() => run(() => onBuy(item))}>
              {busy ? 'Buying…' : 'Buy it'}
            </button>
            <button type="button" className={QUIET} disabled={busy} onClick={() => setAsking(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {action && <div className="mt-auto flex items-center justify-end px-1">{action}</div>}
      {error && (
        <p role="alert" className="px-1 text-sm text-red-300">
          {error}
        </p>
      )}
    </li>
  )
}
