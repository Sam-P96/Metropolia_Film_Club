import { useRef, useState } from 'react'

import Board, { BoardSwatch } from '../components/gomoku/Board'
import GomokuPage, { CARD, HEADING } from '../components/gomoku/GomokuChrome'
import { PieceSwatch } from '../components/gomoku/Piece'
import PillToggle from '../components/PillToggle'
import { QUIET_BUTTON, SMALL_BUTTON } from '../components/steal/style'
import CoinIcon from '../components/wallet/CoinIcon'
import useApi from '../hooks/useApi'
import { buyGomokuItem, equipGomokuItem, getGomokuShop } from '../services/gomoku'
import { walletChanged } from '../services/wallet'
import { DEFAULTS, KINDS, KIND_LABELS, gomokuItem, itemsOfKind, pieceAgainst } from '../../../shared/gomoku/catalogue.js'
import { formatPoints } from '../../../shared/gomoku/rules.js'

const BACK = { to: '/games/gomoku', label: 'Infinite Gomoku' }
const SHOW = [
  { value: 'all', label: 'All' },
  { value: 'owned', label: 'Owned' },
]

// The preview board's stones: a few each, yours and theirs, the last one
// (yours) in the middle, where the shockwave goes off.
const PREVIEW_SIZE = 9
const PREVIEW_MOVES = [
  { x: 3, y: 3, seat: 1 },
  { x: 5, y: 3, seat: 0 },
  { x: 3, y: 5, seat: 0 },
  { x: 5, y: 5, seat: 1 },
  { x: 4, y: 3, seat: 1 },
  { x: 2, y: 4, seat: 0 },
  { x: 6, y: 4, seat: 1 },
  { x: 4, y: 4, seat: 0 },
]

const owns = (shop, item) => item.price === 0 || shop.owned.includes(item.id)

// What an item looks like on its card.
function Swatch({ item, look }) {
  if (item.kind === 'piece') return <PieceSwatch id={item.id} size={52} />
  if (item.kind === 'board') return <BoardSwatch boardId={item.id} gridId={look.grid} />
  if (item.kind === 'grid') return <BoardSwatch boardId={look.board} gridId={item.id} />
  const ring = item.look.ring
  return (
    <span
      aria-hidden="true"
      className="block size-16 rounded-full"
      style={{
        background: `radial-gradient(circle, transparent 38%, ${ring.at(-1)} 44%, ${ring[0]} 52%, transparent 62%), radial-gradient(circle, ${ring[0]}33, transparent 70%)`,
        boxShadow: `0 0 18px ${ring[1] ?? ring[0]}66`,
      }}
    />
  )
}

// One item: what it looks like, its price, and Try, Buy (asking first),
// Use or Using. `onTry(item)` shows it on the preview board.
function ItemCard({ item, shop, trying, onTry, onBuy, onEquip }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const owned = owns(shop, item)
  const using = shop.equipped[item.kind] === item.id
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
    <li className={`flex flex-col gap-3 rounded-2xl border bg-ink/50 p-3 ${using ? 'border-emerald-400/60' : trying ? 'border-brand-gold/60' : 'border-white/10'}`}>
      <button
        type="button"
        onClick={() => onTry(item)}
        className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl bg-white/5 transition-colors hover:bg-white/10"
        aria-label={`Try ${item.name} on the preview board`}
      >
        <Swatch item={item} look={shop.equipped} />
      </button>
      <div className="flex items-start justify-between gap-2 px-1">
        <h3 className="font-semibold text-white">{item.name}</h3>
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[0.7rem] font-semibold text-white/60">{item.category}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
        <span className="flex items-center gap-1.5 font-semibold tabular-nums text-white">
          {item.price === 0 ? (
            'Free'
          ) : (
            <>
              <CoinIcon kind="pp" size={15} /> {formatPoints(item.price)} PP
            </>
          )}
        </span>
        {using ? (
          <span className="flex items-center gap-2">
            <span className="font-semibold text-emerald-300">Using</span>
            {item.id !== DEFAULTS[item.kind] && (
              <button type="button" className={`${SMALL_BUTTON} border border-white/20 text-white/80`} disabled={busy} onClick={() => run(() => onEquip(item.kind, null))}>
                Take off
              </button>
            )}
          </span>
        ) : owned ? (
          <button type="button" className={`${SMALL_BUTTON} border border-white/20 text-white`} disabled={busy} onClick={() => run(() => onEquip(item.kind, item.id))}>
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
            Buy <strong className="text-white">{item.name}</strong> for {formatPoints(item.price)} points? Your PP goes first, then P-PP. It&apos;s yours
            for good, but the points are gone: no refunds.
          </p>
          <div className="flex gap-2">
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
        <p role="alert" className="px-1 text-sm text-red-300">
          {error}
        </p>
      )}
    </li>
  )
}

// The preview: a small board in what you have on, or in what you're
// trying, and its shockwave going off from the middle.
function Preview({ look, impact, onReplay, trying, onStopTrying }) {
  const mine = { id: look.piece, invert: false }
  const theirs = pieceAgainst(look.piece, look.piece)
  return (
    <section className={`${CARD} flex flex-col gap-4 md:flex-row md:items-center`} aria-label="Preview">
      <div className="mx-auto w-full max-w-64 shrink-0">
        <Board
          size={PREVIEW_SIZE}
          moves={PREVIEW_MOVES}
          pieceFor={(seat) => (seat === 0 ? mine : theirs)}
          boardId={look.board}
          gridId={look.grid}
          canPlay={false}
          impact={impact}
          label="A preview board"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className={HEADING}>{trying ? `Trying ${trying.name}` : 'Your setup'}</h2>
        <ul className="text-sm text-white/70">
          {KINDS.map((kind) => (
            <li key={kind}>
              <span className="text-white/50">{KIND_LABELS[kind].slice(0, -1)}:</span> {gomokuItem(look[kind])?.name}
            </li>
          ))}
        </ul>
        <p className="text-sm text-white/50">
          Against someone with the same piece, theirs shows in negative (Black against Black shows as White), like the second piece here.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onReplay} className={`${QUIET_BUTTON} min-h-10`}>
            Play the shockwave
          </button>
          {trying && (
            <button type="button" onClick={onStopTrying} className={`${QUIET_BUTTON} min-h-10`}>
              Back to yours
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

// The Infinite Gomoku shop, from the game's page: pieces (the stones are
// free; the Infinity Stones glow and breathe; emoji; the Infinity
// Gauntlet), shockwaves, boards and grids, for points (PP first, then
// P-PP). Its own shop, apart from the Black Market and Steal and Defend's.
// Anything can be tried on the preview board before buying. The rules are
// all checked on the server (backend/utils/gomokuShop.js).
export default function GomokuShop() {
  const shop = useApi(() => getGomokuShop(), [])
  const [kind, setKind] = useState('piece')
  const [show, setShow] = useState('all')
  const [trying, setTrying] = useState(null)
  const [impact, setImpact] = useState(null)
  const impacts = useRef(0)

  const view = shop.data
  const look = view ? { ...view.equipped, ...(trying ? { [trying.kind]: trying.id } : {}) } : DEFAULTS

  const boom = (wave) => {
    impacts.current += 1
    setImpact({ x: 4, y: 4, wave, key: impacts.current })
  }
  const tryOn = (item) => {
    setTrying(view && view.equipped[item.kind] === item.id ? null : item)
    boom(item.kind === 'shockwave' ? item.id : look.shockwave)
  }

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
      const result = await buyGomokuItem(item.id)
      walletChanged()
      return result
    })
  const equip = (itemKind, itemId) =>
    change(async () => {
      const result = await equipGomokuItem(itemKind, itemId)
      setTrying(null)
      return result
    })

  const items = view ? itemsOfKind(kind).filter((item) => show === 'all' || owns(view, item)) : []
  const categories = [...new Set(items.map((item) => item.category))]

  return (
    <GomokuPage
      back={BACK}
      wide
      subtitle="Pieces, shockwaves, boards and grids. Try anything on before you buy it."
      aside={
        view && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-lg font-bold text-white" aria-label="Your points">
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
          <Preview look={look} impact={impact} onReplay={() => boom(look.shockwave)} trying={trying} onStopTrying={() => setTrying(null)} />

          <div className="flex flex-col gap-3">
            <PillToggle options={KINDS.map((value) => ({ value, label: KIND_LABELS[value] }))} value={kind} onChange={setKind} label="What to show" />
            <PillToggle options={SHOW} value={show} onChange={setShow} label="Show" />
          </div>

          {kind === 'piece' && (
            <p className="-mt-2 text-sm text-white/60">
              Every piece sets off your shockwave when it lands. The Infinity Stones glow and breathe as well.
            </p>
          )}

          {items.length === 0 && <p className={`${CARD} text-white/70`}>Nothing here yet.</p>}

          {categories.map((category) => (
            <section key={category} aria-label={category} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold tracking-widest text-white/50 uppercase">{category}</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {items
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <ItemCard key={item.id} item={item} shop={view} trying={trying?.id === item.id} onTry={tryOn} onBuy={buy} onEquip={equip} />
                  ))}
              </ul>
            </section>
          ))}

          <p className="text-center text-sm text-white/50">Bought with points: your PP first, then P-PP. No refunds, no selling back, no trading.</p>
        </>
      )}
    </GomokuPage>
  )
}
