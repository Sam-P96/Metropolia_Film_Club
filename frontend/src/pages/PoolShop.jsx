import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import CuePreview from '../components/pool/CuePreview'
import IgnitionPreview from '../components/pool/IgnitionPreview'
import PoolPage, { CARD, HEADING } from '../components/pool/PoolChrome'
import PracticeTable from '../components/pool/PracticeTable'
import ParticlesToggle from '../components/pool/ParticlesToggle'
import PillToggle from '../components/PillToggle'
import { GOLD_BUTTON, QUIET_BUTTON, SMALL_BUTTON } from '../components/steal/style'
import CoinIcon from '../components/wallet/CoinIcon'
import useApi from '../hooks/useApi'
import { buyPoolItem, equipPoolItem, getPoolShop } from '../services/pool'
import { walletChanged } from '../services/wallet'
import { ALL_CUES, CUE_TIERS, DEFAULT_CUE, cueItem } from '../../../shared/pool/cues.js'
import { ALL_IGNITIONS, DEFAULT_IGNITION, ignitionItem } from '../../../shared/pool/ignitions.js'
import { formatPoints } from '../../../shared/pool/rules.js'

const BACK = { to: '/games/pool', label: '8 Ball Pool' }
const KINDS = [
  { value: 'cue', label: 'Cues' },
  { value: 'ignition', label: 'Ignitions' },
]
const SHOW = [
  { value: 'all', label: 'All' },
  { value: 'owned', label: 'Owned' },
]
const ITEMS = { cue: ALL_CUES, ignition: ALL_IGNITIONS }
const FREE = { cue: DEFAULT_CUE, ignition: DEFAULT_IGNITION }
const NOTES = {
  cue: 'The cue you use is the one everyone at your table sees. The Glowing ones glow; the Sabers are blades of light.',
  ignition: 'What flies off when balls collide on your shots, for everyone watching. Every Ignition but Classic Sparks throws its particles twice the size.',
}
const CLOTH = 'rounded-xl bg-[radial-gradient(ellipse_at_center,#1f8a5b,#0a4a30)] shadow-inner shadow-black/40'

const owns = (shop, item) => item.price === 0 || shop.owned.includes(item.id)
const fancy = (item) => item.tier === 'glowing' || item.tier === 'saber'

// What an item looks like on its card.
function Preview({ item, tall = false }) {
  return item.kind === 'cue' ? <CuePreview id={item.id} className={tall ? 'h-16' : 'h-11'} /> : <IgnitionPreview id={item.id} className={tall ? 'h-28' : 'h-24'} />
}

// One item: what it looks like, its price, and Try, Buy (asking first), Use
// or Using.
function ItemCard({ item, shop, trying, onTry, onBuy, onUse }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const owned = owns(shop, item)
  const using = shop[item.kind] === item.id
  const short = shop.points < item.price

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
        using
          ? 'border-emerald-400/60'
          : trying
            ? 'border-brand-gold/60'
            : fancy(item)
              ? 'border-[#a35bff]/40 shadow-[0_0_24px_rgba(163,91,255,0.15)]'
              : 'border-white/10'
      }`}
    >
      <div className={`${CLOTH} px-2 py-3`}>
        <Preview item={item} />
      </div>
      <div className="flex flex-col items-center gap-1 px-1">
        <h3 className="font-semibold text-white">{item.name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${fancy(item) ? 'bg-[#a35bff]/25 text-[#d9b8ff]' : 'bg-white/10 text-white/60'}`}>
          {item.category}
        </span>
      </div>
      <div className="mt-auto flex flex-col items-center gap-2 px-1 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-white tabular-nums">
          {item.price === 0 ? (
            'Free'
          ) : (
            <>
              <CoinIcon kind="pp" size={15} /> {formatPoints(item.price)} PP
            </>
          )}
        </span>
        <span className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" className={`${SMALL_BUTTON} border border-white/20 text-white/80`} onClick={() => onTry(item)}>
            {trying ? 'Trying' : 'Try'}
          </button>
          {using ? (
            <>
              <span className="font-semibold text-emerald-300">Using</span>
              {item.id !== FREE[item.kind] && (
                <button type="button" className={`${SMALL_BUTTON} border border-white/20 text-white/80`} disabled={busy} onClick={() => run(() => onUse(item.kind, null))}>
                  Take off
                </button>
              )}
            </>
          ) : owned ? (
            <button type="button" className={`${SMALL_BUTTON} border border-white/20 text-white`} disabled={busy} onClick={() => run(() => onUse(item.kind, item.id))}>
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
        </span>
      </div>

      {asking && !owned && (
        <div className="flex flex-col gap-2 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-3 text-sm text-white/80">
          <p>
            Buy <strong className="text-white">{item.name}</strong> for {formatPoints(item.price)} points? Your PP goes first, then P-PP. It&apos;s yours for
            good, but the points are gone: no refunds.
          </p>
          <div className="flex justify-center gap-2">
            <button type="button" className={`${SMALL_BUTTON} bg-brand-gold text-ink`} disabled={busy} onClick={() => run(() => onBuy(item))}>
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

// 8 Ball Pool's shop, from the game's page: cues (Classic free, up to the
// Sabers at 2,000) and Ignitions (what flies off when balls collide, up to
// 1,000), for points (PP first, then P-PP). Test, at the top, opens a
// table to shoot on with what you use, or what you're trying. The rules
// are all checked on the server (backend/utils/poolShop.js).
export default function PoolShop() {
  const shop = useApi(() => getPoolShop(), [])
  const [kind, setKind] = useState('cue')
  const [show, setShow] = useState('all')
  const [trying, setTrying] = useState({ cue: null, ignition: null })
  const [testing, setTesting] = useState(false)
  const testRef = useRef(null)
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
  const buy = (item) =>
    change(async () => {
      const result = await buyPoolItem(item.id)
      walletChanged()
      return result
    })
  const use = (itemKind, id) =>
    change(async () => {
      const result = await equipPoolItem(itemKind, id)
      setTrying((now) => ({ ...now, [itemKind]: null }))
      return result
    })

  // Trying something: onto the Test table, which opens and comes into view.
  const tryOn = (item) => {
    setTrying((now) => ({ ...now, [item.kind]: now[item.kind] === item.id ? null : item.id }))
    setTesting(true)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => testRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }))
  }

  const look = view ? { cue: trying.cue ?? view.cue, ignition: trying.ignition ?? view.ignition } : null
  const items = view ? ITEMS[kind].filter((item) => show === 'all' || owns(view, item)) : []
  const tiers = CUE_TIERS.filter((tier) => items.some((item) => item.tier === tier))

  return (
    <PoolPage
      back={BACK}
      wide
      subtitle="Cues and Ignitions. Try anything on the Test table before you buy it."
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
          <button
            type="button"
            onClick={() => setTesting(!testing)}
            aria-expanded={testing}
            className={`${testing ? GOLD_BUTTON : QUIET_BUTTON} min-h-13 self-center px-8 text-center text-lg`}
          >
            {testing ? 'Close the Test table' : 'Test'}
          </button>

          <AnimatePresence initial={false}>
            {testing && (
              <motion.section
                ref={testRef}
                key="test"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="scroll-mt-24 overflow-hidden"
                aria-label="Test table"
              >
                <div className={`${CARD} flex flex-col gap-4`}>
                  <div className="flex flex-col items-center gap-1">
                    <h2 className={HEADING}>Test table</h2>
                    <ParticlesToggle />
                    <p className="text-sm text-white/70">
                      {cueItem(look.cue)?.name} · {ignitionItem(look.ignition)?.name}
                      {(trying.cue || trying.ignition) && <span className="text-brand-gold"> (trying)</span>}
                    </p>
                    {(trying.cue || trying.ignition) && (
                      <button type="button" onClick={() => setTrying({ cue: null, ignition: null })} className={`${SMALL_BUTTON} border border-white/20 text-white/80`}>
                        Back to yours
                      </button>
                    )}
                  </div>
                  <PracticeTable cue={look.cue} ignition={look.ignition} />
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <section className={`${CARD} flex flex-col items-center gap-3`} aria-label="What you use">
            <h2 className={HEADING}>What you use</h2>
            <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <div className={`${CLOTH} px-4 py-4`}>
                  <CuePreview id={view.cue} className="h-14" />
                </div>
                <p className="text-sm text-white/70">{cueItem(view.cue)?.name}</p>
              </div>
              <div className="flex flex-col gap-1">
                <div className={`${CLOTH} px-4 py-1`}>
                  <IgnitionPreview id={view.ignition} className="h-20" />
                </div>
                <p className="text-sm text-white/70">{ignitionItem(view.ignition)?.name}</p>
              </div>
            </div>
          </section>

          <div className="flex flex-col items-center gap-3">
            <PillToggle options={KINDS} value={kind} onChange={setKind} label="What to show" />
            <PillToggle options={SHOW} value={show} onChange={setShow} label="Show" />
          </div>
          <p className="-mt-2 text-center text-sm text-white/60">{NOTES[kind]}</p>

          {items.length === 0 && <p className={`${CARD} text-white/70`}>Nothing here yet.</p>}

          {tiers.map((tier) => {
            const here = items.filter((item) => item.tier === tier)
            return (
              <section key={tier} aria-label={here[0].category} className="flex flex-col gap-3">
                <h2 className="text-center text-xs font-semibold tracking-widest text-white/50 uppercase">{here[0].category}</h2>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {here.map((item) => (
                    <ItemCard key={item.id} item={item} shop={view} trying={trying[item.kind] === item.id} onTry={tryOn} onBuy={buy} onUse={use} />
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
