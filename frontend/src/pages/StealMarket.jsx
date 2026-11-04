import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import StealPage from '../components/steal/StealPage'
import ItemCard from '../components/steal/ItemCard'
import Dropdown from '../components/steal/Dropdown'
import Notice from '../components/steal/Notice'
import MemberAvatar from '../components/profile/MemberAvatar'
import MemberPicker from '../components/profile/MemberPicker'
import useApi from '../hooks/useApi'
import {
  acceptTrade,
  buyFromMarket,
  cancelListing,
  cancelTrade,
  declineTrade,
  getMarket,
  getPlayerItems,
  getStealHub,
  getTrades,
  listItem,
  offerTrade,
  sendItemGift,
} from '../services/steal'
import { walletChanged } from '../services/wallet'
import { getCurrentUserId } from '../utils/currentUser'
import { timeAgo } from '../utils/timeAgo'
import { FADE, LAYOUT, SLIDE } from '../components/steal/motion'
import { GLASS, GOLD_BUTTON, QUIET_BUTTON, SMALL_BUTTON, formatPp, tierColour } from '../components/steal/style'

const HEADING = "font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold"
const INPUT = 'rounded-xl border border-white/20 bg-ink/60 px-3 py-2 text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-brand-gold'
// The small buttons, with the game's subtle hover lift.
const SMALL = SMALL_BUTTON

// Their items that can go to the market, a trade or a gift: not equipped,
// not already listed or offered.
const free = (hub) => (hub?.inventory ?? []).filter((item) => item.state === 'owned' && !item.equipped)

// Those items for a dropdown: the name, with its tier and durability under it.
const itemOptions = (hub) =>
  free(hub).map((item) => ({ value: item._id, label: item.name, hint: `${item.tier} · durability ${item.durability}/${item.maxDurability}` }))

function ItemTick({ item, checked, onChange }) {
  return (
    <motion.label
      {...SLIDE}
      {...LAYOUT}
      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition-colors duration-400 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:border-white/30 ${checked ? 'border-brand-gold/70 bg-white/10' : 'border-white/10'}`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-brand-gold" />
      <span className="min-w-0 flex-1 truncate text-white">{item.name}</span>
      <span className="text-[11px]" style={{ color: tierColour(item.tier) }}>
        {item.tier}
      </span>
      <span className="text-[11px] text-white/40">
        {item.durability}/{item.maxDurability}
      </span>
    </motion.label>
  )
}

const toggle = (list, id) => (list.includes(id) ? list.filter((other) => other !== id) : [...list, id])

function wholeOrZero(value) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : 0
}

// Picking a member, then the form for them: the picker and the chosen
// member fade from one to the other.
function ToMember({ to, setTo, label, children }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {!to ? (
        <motion.div key="pick" {...FADE} className="mt-3">
          <MemberPicker label={label} onPick={setTo} />
        </motion.div>
      ) : (
        <motion.div key={to._id} {...SLIDE} className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MemberAvatar user={to} size="sm" />
            <span className="flex-1 font-semibold text-white">{to.username}</span>
            <button type="button" onClick={() => setTo(null)} className="text-xs text-white/60 hover:text-white">
              Someone else
            </button>
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// A trade offer: who to, what you give (items and PP) and what you ask
// for (their items and PP). Held in escrow until they answer.
function OfferForm({ hub, onDone }) {
  const [to, setTo] = useState(null)
  const theirs = useApi(() => getPlayerItems(to._id), [to?._id], { enabled: Boolean(to) })
  const [give, setGive] = useState([])
  const [want, setWant] = useState([])
  const [givePp, setGivePp] = useState('')
  const [wantPp, setWantPp] = useState('')
  const [problem, setProblem] = useState(null)
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    setProblem(null)
    try {
      await offerTrade({ to: to._id, giveItems: give, wantItems: want, givePp: wholeOrZero(givePp), wantPp: wholeOrZero(wantPp) })
      setGive([])
      setWant([])
      setGivePp('')
      setWantPp('')
      setTo(null)
      onDone('Offer sent. What you put in is held until they answer.')
    } catch (failure) {
      setProblem(failure.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.section className={`${GLASS} p-5`}>
      <h2 className={HEADING}>Make a trade offer</h2>
      <p className="mt-1 text-xs text-white/50">Items and/or PP, either way. PP you get comes in as P-PP. They can accept or decline; you can cancel while it waits.</p>
      <ToMember to={to} setTo={setTo} label="Trade with">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-xs tracking-widest text-white/60 uppercase">You give</p>
            {free(hub).length === 0 && <p className="text-xs text-white/40">No free items (unequip something to offer it).</p>}
            <AnimatePresence initial={false}>
              {free(hub).map((item) => (
                <ItemTick key={item._id} item={item} checked={give.includes(item._id)} onChange={() => setGive(toggle(give, item._id))} />
              ))}
            </AnimatePresence>
            <input value={givePp} onChange={(e) => setGivePp(e.target.value)} inputMode="numeric" placeholder="PP (optional)" className={INPUT} aria-label="PP you give" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs tracking-widest text-white/60 uppercase">You ask for</p>
            {theirs.loading && <p className="text-xs text-white/40">Loading their items…</p>}
            {theirs.data?.items.length === 0 && <p className="text-xs text-white/40">They have no items.</p>}
            <AnimatePresence initial={false}>
              {theirs.data?.items.map((item) => (
                <ItemTick key={item._id} item={item} checked={want.includes(item._id)} onChange={() => setWant(toggle(want, item._id))} />
              ))}
            </AnimatePresence>
            <input value={wantPp} onChange={(e) => setWantPp(e.target.value)} inputMode="numeric" placeholder="PP (optional)" className={INPUT} aria-label="PP you ask for" />
          </div>
        </div>
        {problem && <motion.p {...FADE} className="text-sm text-brand-red">{problem}</motion.p>}
        <button type="button" onClick={send} disabled={sending} className={`${GOLD_BUTTON} self-start`}>
          {sending ? 'Sending…' : 'Send offer'}
        </button>
      </ToMember>
    </motion.section>
  )
}

function GiftForm({ hub, onDone }) {
  const [to, setTo] = useState(null)
  const [item, setItem] = useState('')
  const [problem, setProblem] = useState(null)
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    setProblem(null)
    try {
      const result = await sendItemGift(to._id, item)
      setItem('')
      setTo(null)
      onDone(`Sent to ${result.to}.`)
    } catch (failure) {
      setProblem(failure.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.section className={`${GLASS} p-5`}>
      <h2 className={HEADING}>Send a gift</h2>
      <p className="mt-1 text-xs text-white/50">Give an item away for free. It arrives straight away.</p>
      <ToMember to={to} setTo={setTo} label="Send to">
        <Dropdown label="Item to send" value={item} onChange={setItem} options={itemOptions(hub)} placeholder="Pick an item" empty="No free items (unequip something first)" />
        {problem && <motion.p {...FADE} className="text-sm text-brand-red">{problem}</motion.p>}
        <button type="button" onClick={send} disabled={!item || sending} className={`${GOLD_BUTTON} self-start`}>
          {sending ? 'Sending…' : 'Send gift'}
        </button>
      </ToMember>
    </motion.section>
  )
}

function SellForm({ hub, onDone }) {
  const [item, setItem] = useState('')
  const [price, setPrice] = useState('')
  const [problem, setProblem] = useState(null)
  const [sending, setSending] = useState(false)

  const list = async () => {
    setSending(true)
    setProblem(null)
    try {
      await listItem(item, Number(price))
      setItem('')
      setPrice('')
      onDone('Listed on the market.')
    } catch (failure) {
      setProblem(failure.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.section className={`${GLASS} p-5`}>
      <h2 className={HEADING}>Sell on the market</h2>
      <p className="mt-1 text-xs text-white/50">Set a price in PP. Whoever buys it first pays you in P-PP.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <Dropdown label="Item to sell" value={item} onChange={setItem} options={itemOptions(hub)} placeholder="Pick an item" empty="No free items (unequip something first)" />
        </div>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="Price in PP" className={`${INPUT} sm:w-36`} aria-label="Price in PP" />
        <button type="button" onClick={list} disabled={!item || !(Number(price) >= 1) || sending} className={GOLD_BUTTON}>
          {sending ? 'Listing…' : 'List'}
        </button>
      </div>
      {problem && <motion.p {...FADE} className="mt-2 text-sm text-brand-red">{problem}</motion.p>}
    </motion.section>
  )
}

function TradeRow({ trade, busy, onAction }) {
  const describe = (side) =>
    [...side.items.map((item) => `${item.name}${item.gone ? ' (gone)' : ''}`), ...(side.pp ? [formatPp(side.pp)] : [])].join(', ') || 'nothing'
  const other = trade.mine ? trade.to : trade.from
  return (
    <motion.li {...SLIDE} {...LAYOUT} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
      <div className={`transition-opacity ${busy ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        {other && <MemberAvatar user={other} size="sm" />}
        <p className="min-w-0 flex-1 text-white/80">
          {trade.gift ? (trade.mine ? 'You gave ' : 'Gift from ') : trade.mine ? 'Your offer to ' : 'Offer from '}
          <span className="font-semibold text-white">{other?.username ?? 'someone who left'}</span>
          {trade.status !== 'pending' && <span className="ml-1 text-xs text-white/40">· {trade.status}</span>}
        </p>
        <span className="text-xs text-white/40">{timeAgo(trade.answeredAt ?? trade.createdAt)}</span>
      </div>
      <p className="mt-1.5 text-xs text-white/60">
        {trade.mine ? 'You give' : 'They give'}: {describe(trade.give)}
        {!trade.gift && (
          <>
            <br />
            {trade.mine ? 'You ask for' : 'They ask for'}: {describe(trade.want)}
          </>
        )}
      </p>
      {trade.status === 'pending' && (
        <div className="mt-2 flex gap-2">
          {trade.mine ? (
            <button type="button" disabled={busy} onClick={() => onAction(trade._id, () => cancelTrade(trade._id), 'Offer cancelled. Everything went back.')} className={`${SMALL} border border-white/20 text-white`}>
              Cancel
            </button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => onAction(trade._id, () => acceptTrade(trade._id), 'Trade done.')} className={`${SMALL} bg-brand-gold text-ink`}>
                Accept
              </button>
              <button type="button" disabled={busy} onClick={() => onAction(trade._id, () => declineTrade(trade._id), 'Offer declined.')} className={`${SMALL} border border-white/20 text-white`}>
                Decline
              </button>
            </>
          )}
        </div>
      )}
      </div>
    </motion.li>
  )
}

// The player market and trades (spec §10.5, §15): listings, offers, and
// what they own to put in them. Nothing reloads the page: after a buy, a
// sale or a trade the lists update in place, and whatever changed slides
// and fades in or out while the rest glide into their new places.
export default function StealMarket() {
  const me = getCurrentUserId()
  const market = useApi(getMarket, [])
  const trades = useApi(getTrades, [])
  const hub = useApi(getStealHub, [])
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(null)

  // Fresh lists, without clearing the ones showing first.
  const refresh = () => {
    market.reload()
    trades.reload()
    hub.reload()
  }

  const done = (text) => {
    setMessage({ ok: true, text })
    refresh()
    walletChanged()
  }

  // A listing bought or taken down leaves the grid straight away, and a
  // trade answered leaves the waiting list, before the fresh lists arrive.
  const dropListing = (id) => market.setData((data) => (data ? { ...data, listings: data.listings.filter((listing) => listing._id !== id) } : data))
  const dropTrade = (id) =>
    trades.setData((data) =>
      data ? { ...data, incoming: data.incoming.filter((trade) => trade._id !== id), outgoing: data.outgoing.filter((trade) => trade._id !== id) } : data
    )

  const run = async (id, work, text, drop) => {
    setMessage(null)
    setBusy(id)
    try {
      await work()
      drop?.(id)
      done(text)
    } catch (failure) {
      setMessage({ ok: false, text: failure.message })
      refresh()
    } finally {
      setBusy(null)
    }
  }

  const listings = market.data?.listings ?? []
  const waiting = trades.data ? [...trades.data.incoming, ...trades.data.outgoing] : []

  return (
    <StealPage
      back={{ to: '/games/steal-and-defend/play', label: 'Steal and Defend' }}
      title={
        <>
          Market <span className="text-brand-gold">& trades</span>
        </>
      }
      subtitle="Buy from other players, sell your own items, trade, and give things away. An item keeps its original shop price wherever it goes, so selling it back to the shop is always worth the same."
      actions={
        <Link to="/games/steal-and-defend/shop" className={`${QUIET_BUTTON} min-h-9 text-sm`}>
          The shop
        </Link>
      }
    >
      <Notice message={message} />

      <motion.section className={`${GLASS} p-5`}>
        <h2 className={HEADING}>Player market</h2>
        <AnimatePresence mode="wait" initial={false}>
          {listings.length === 0 && (
            <motion.p key="empty" {...FADE} className="mt-2 text-sm text-white/50">
              {market.data ? 'Nothing for sale right now.' : 'Loading…'}
            </motion.p>
          )}
        </AnimatePresence>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {listings.map((listing) => {
              const mine = listing.seller._id === me
              const pending = busy === listing._id
              return (
                <motion.li key={listing._id} {...SLIDE} {...LAYOUT}>
                  <div className={`h-full transition-opacity ${pending ? 'opacity-60' : ''}`}>
                  <ItemCard item={listing.item}>
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-xs text-white/60">
                        <MemberAvatar user={listing.seller} size="sm" />
                        <span className="truncate">{mine ? 'You' : listing.seller.username}</span>
                      </span>
                      {mine ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(listing._id, () => cancelListing(listing._id), 'Taken off the market.', dropListing)}
                          className={`${SMALL} border border-white/20 text-white`}
                        >
                          Take down · {formatPp(listing.price)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(listing._id, () => buyFromMarket(listing._id), `Bought ${listing.item.name}.`, dropListing)}
                          className={`${SMALL} bg-brand-gold text-ink`}
                        >
                          {pending ? 'Buying…' : `Buy · ${formatPp(listing.price)}`}
                        </button>
                      )}
                    </div>
                  </ItemCard>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      </motion.section>

      {trades.data && (
        <motion.section {...SLIDE} className={`${GLASS} p-5`}>
          <h2 className={HEADING}>Trades</h2>
          <AnimatePresence initial={false}>
            {waiting.length === 0 && (
              <motion.p key="none" {...FADE} className="mt-2 text-sm text-white/50">
                No offers waiting.
              </motion.p>
            )}
          </AnimatePresence>
          <ul className="mt-3 flex flex-col gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {waiting.map((trade) => (
                <TradeRow key={trade._id} trade={trade} busy={busy === trade._id} onAction={(id, work, text) => run(id, work, text, dropTrade)} />
              ))}
            </AnimatePresence>
          </ul>
          {trades.data.recent.length > 0 && (
            <div>
              <p className="mt-4 text-xs tracking-widest text-white/50 uppercase">Recently</p>
              <ul className="mt-2 flex flex-col gap-2">
                <AnimatePresence mode="popLayout" initial={false}>
                  {trades.data.recent.map((trade) => (
                    <TradeRow key={trade._id} trade={trade} busy={false} onAction={() => {}} />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}
        </motion.section>
      )}

      <AnimatePresence>
        {hub.data && (
          <motion.div key="forms" {...SLIDE} className="grid items-start gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <SellForm hub={hub.data} onDone={done} />
              <GiftForm hub={hub.data} onDone={done} />
            </div>
            <OfferForm hub={hub.data} onDone={done} />
          </motion.div>
        )}
      </AnimatePresence>
    </StealPage>
  )
}
