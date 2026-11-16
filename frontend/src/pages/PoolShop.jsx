import { useState } from 'react'

import CuePreview from '../components/pool/CuePreview'
import PoolPage, { CARD, HEADING } from '../components/pool/PoolChrome'
import PillToggle from '../components/PillToggle'
import { SMALL_BUTTON } from '../components/steal/style'
import CoinIcon from '../components/wallet/CoinIcon'
import useApi from '../hooks/useApi'
import { buyPoolCue, equipPoolCue, getPoolShop } from '../services/pool'
import { walletChanged } from '../services/wallet'
import { ALL_CUES, CUE_TIERS, DEFAULT_CUE, cueItem } from '../../../shared/pool/cues.js'
import { formatPoints } from '../../../shared/pool/rules.js'

const BACK = { to: '/games/pool', label: '8 Ball Pool' }
const SHOW = [
  { value: 'all', label: 'All' },
  { value: 'owned', label: 'Owned' },
]
const CLOTH = 'rounded-xl bg-[radial-gradient(ellipse_at_center,#1f8a5b,#0a4a30)] shadow-inner shadow-black/40'

const owns = (shop, cue) => cue.price === 0 || shop.owned.includes(cue.id)

// One cue: what it looks like, its price, and Buy (asking first), Use or
// Using.
function CueCard({ cue, shop, onBuy, onUse }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const owned = owns(shop, cue)
  const using = shop.cue === cue.id
  const short = shop.points < cue.price
  const glowing = Boolean(cue.look.glow)

  const run = async (action) => {
    setBusy(true)
    setError(null)
    const problem = await action()
    setError(problem)
    if (!problem) setAsking(false)
    setBusy(false)
  }

  return (
    <li
      className={`flex flex-col gap-3 rounded-2xl border bg-[#140a14]/80 p-3 text-center ${
        using ? 'border-emerald-400/60' : glowing ? 'border-[#a35bff]/40 shadow-[0_0_24px_rgba(163,91,255,0.15)]' : 'border-white/10'
      }`}
    >
      <div className={`${CLOTH} px-2 py-3`}>
        <CuePreview id={cue.id} className="h-11" />
      </div>
      <div className="flex flex-col items-center gap-1 px-1">
        <h3 className="font-semibold text-white">{cue.name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${glowing ? 'bg-[#a35bff]/25 text-[#d9b8ff]' : 'bg-white/10 text-white/60'}`}>
          {cue.category}
        </span>
      </div>
      <div className="mt-auto flex flex-col items-center gap-2 px-1 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-white tabular-nums">
          {cue.price === 0 ? (
            'Free'
          ) : (
            <>
              <CoinIcon kind="pp" size={15} /> {formatPoints(cue.price)} PP
            </>
          )}
        </span>
        {using ? (
          <span className="flex items-center gap-2">
            <span className="font-semibold text-emerald-300">Using</span>
            {cue.id !== DEFAULT_CUE && (
              <button type="button" className={`${SMALL_BUTTON} border border-white/20 text-white/80`} disabled={busy} onClick={() => run(() => onUse(null))}>
                Take off
              </button>
            )}
          </span>
        ) : owned ? (
          <button type="button" className={`${SMALL_BUTTON} border border-white/20 text-white`} disabled={busy} onClick={() => run(() => onUse(cue.id))}>
            Use
          </button>
        ) : (
          !asking && (
            <button
              type="button"
              className={`${SMALL_BUTTON} bg-brand-gold text-ink`}
              disabled={busy || short}
              title={short ? 'Not enough points' : undefined}
              onClick={() => setAsking(true)}
            >
              Buy
            </button>
          )
        )}
      </div>

      {asking && !owned && (
        <div className="flex flex-col gap-2 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-3 text-sm text-white/80">
          <p>
            Buy <strong className="text-white">{cue.name}</strong> for {formatPoints(cue.price)} points? Your PP goes first, then P-PP. It&apos;s yours for
            good, but the points are gone: no refunds.
          </p>
          <div className="flex justify-center gap-2">
            <button type="button" className={`${SMALL_BUTTON} bg-brand-gold text-ink`} disabled={busy} onClick={() => run(() => onBuy(cue))}>
              {busy ? 'Buying…' : 'Buy it'}
            </button>
            <button type="button" className={`${SMALL_BUTTON} border border-white/20 text-white/80`} disabled={busy} onClick={() => setAsking(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="px-1 text-center text-sm text-red-300">
          {error}
        </p>
      )}
    </li>
  )
}

// 8 Ball Pool's shop, from the game's page: cues, from Classic (free) to
// the Glowing ones (1,000 points), for points (PP first, then P-PP). The
// cue you use is the one everyone at your table sees. The rules are all
// checked on the server (backend/utils/poolShop.js).
export default function PoolShop() {
  const shop = useApi(() => getPoolShop(), [])
  const [show, setShow] = useState('all')
  const view = shop.data

  // A change, then the shop as it now is. Resolves to an error message, or null.
  const change = async (action) => {
    try {
      const result = await action()
      shop.setData(result.view)
      return null
    } catch (error) {
      return error.message
    }
  }
  const buy = (cue) =>
    change(async () => {
      const result = await buyPoolCue(cue.id)
      walletChanged()
      return result
    })
  const use = (id) => change(() => equipPoolCue(id))

  const cues = view ? ALL_CUES.filter((cue) => show === 'all' || owns(view, cue)) : []
  const mine = view ? cueItem(view.cue) : null

  return (
    <PoolPage
      back={BACK}
      wide
      subtitle="Cues, from Classic to the Glowing ones. Everyone at your table sees the one you use."
      aside={
        view && (
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-lg font-bold text-white" aria-label="Your points">
            <span className="flex items-center gap-1.5">
              <CoinIcon kind="pp" size={18} /> {formatPoints(view.pp)} PP
            </span>
            <span className="flex items-center gap-1.5">
              <CoinIcon kind="ppp" size={18} /> {formatPoints(view.ppp)} P-PP
            </span>
          </p>
        )
      }
    >
      {!view ? (
        shop.error ? (
          <p className={`${CARD} text-white/70`}>The shop won&apos;t open. Try refreshing the page.</p>
        ) : (
          <div aria-hidden="true" className="h-72 animate-pulse rounded-2xl bg-white/10" />
        )
      ) : (
        <>
          <section className={`${CARD} flex flex-col items-center gap-3`} aria-label="Your cue">
            <h2 className={HEADING}>Your cue: {mine?.name}</h2>
            <div className={`${CLOTH} w-full max-w-2xl px-4 py-5`}>
              <CuePreview id={view.cue} className="h-16" />
            </div>
          </section>

          <div className="flex justify-center">
            <PillToggle options={SHOW} value={show} onChange={setShow} label="Show" />
          </div>

          {cues.length === 0 && <p className={`${CARD} text-white/70`}>Nothing here yet.</p>}

          {CUE_TIERS.map((tier) => {
            const here = cues.filter((cue) => cue.tier === tier)
            if (here.length === 0) return null
            return (
              <section key={tier} aria-label={here[0].category} className="flex flex-col gap-3">
                <h2 className="text-center text-xs font-semibold tracking-widest text-white/50 uppercase">
                  {here[0].category}
                  {tier === 'glowing' && <span className="ml-2 normal-case tracking-normal text-[#d9b8ff]">· they glow on the table</span>}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {here.map((cue) => (
                    <CueCard key={cue.id} cue={cue} shop={view} onBuy={buy} onUse={use} />
                  ))}
                </ul>
              </section>
            )
          })}

          <p className="text-center text-sm text-white/50">Bought with points: your PP first, then P-PP. No refunds, no selling back, no trading.</p>
        </>
      )}
    </PoolPage>
  )
}
