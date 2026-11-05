import '@fontsource/bebas-neue'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'

import AnimatedNumber from '../components/AnimatedNumber'
import CardShine from '../components/CardShine'
import GameBackdrop from '../components/GameBackdrop'
import CoinIcon from '../components/wallet/CoinIcon'
import HowToPlay from '../components/scratch/HowToPlay'
import ScratchTicket, { TicketSkeleton } from '../components/scratch/ScratchTicket'
import { Skeleton } from '../components/scratch/Marquee'
import { GoldenTicketIcon } from '../components/scratch/TileFace'
import { ticketTheme } from '../components/scratch/ticketThemes'
import useJackpot from '../hooks/useJackpot'
import useScratchCard from '../hooks/useScratchCard'
import useTicketHours from '../hooks/useTicketHours'
import useWallet from '../hooks/useWallet'
import { askTiltPermission } from '../utils/tilt'
import { timeAgo } from '../utils/timeAgo'
import { SCRATCH } from '../../../shared/scratch/config.js'
import { DEFAULT_TICKET_TYPE, TICKET_TYPES, describeHours, ticketType, ticketTypeOf } from '../../../shared/scratch/tickets.js'

const GLASS = 'rounded-2xl border border-white/10 bg-black/40 shadow-xl shadow-black/40 backdrop-blur-md'
const EASE = [0.22, 1, 0.36, 1]
const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 } }

// The ticket types sold only at certain hours (VIP).
const TIMED = TICKET_TYPES.map((key) => ticketType(key)).filter((type) => type.hours)

// Their PP and P-PP, counting up and down as tickets are bought and won.
function BalancePanel({ wallet }) {
  return (
    <section className={`${GLASS} min-h-24 p-4`} aria-label="Your points">
      <p className="text-xs uppercase tracking-widest text-white/50">Your points</p>
      <AnimatePresence mode="wait" initial={false}>
        {wallet ? (
          <motion.div key="wallet" {...fade} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xl font-bold text-white">
            <span className="flex items-center gap-1.5">
              <CoinIcon kind="pp" size={20} /> <AnimatedNumber value={wallet.pp} />
            </span>
            <span className="flex items-center gap-1.5">
              <CoinIcon kind="ppp" size={20} /> <AnimatedNumber value={wallet.ppp} />
            </span>
          </motion.div>
        ) : (
          <motion.div key="loading" {...fade} className="mt-2 flex gap-4">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// A ticket type's name, in its colour.
function TicketName({ type, prefix = '' }) {
  return <span style={{ color: ticketTheme(type).tag }}>{prefix}{ticketType(type).name}</span>
}

// The jackpots: big, the pool of the ticket type being looked at or played
// (`viewType`), ticking up live; under it, every type's pool, each a button
// to look at that one (`onLook`); and who won them lately, whichever the
// ticket. Its height never changes, loading or loaded, whichever type it
// shows, so the ticket below it never moves.
function JackpotPanel({ jackpot, viewType, onLook }) {
  return (
    <section className={`${GLASS} min-h-24 border-brand-gold/30 p-4`} aria-label="Jackpots">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-brand-gold/80">
        <GoldenTicketIcon className="w-5" /> Jackpot
        <span className="relative">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={viewType}
              className="inline-block"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <TicketName type={viewType} prefix="· " />
            </motion.span>
          </AnimatePresence>
        </span>
      </p>
      <AnimatePresence mode="wait" initial={false}>
        {jackpot ? (
          <motion.div key="pool" {...fade}>
            <div className="relative mt-1 h-9">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.p
                  key={viewType}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="flex items-center gap-1.5 font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-brand-gold drop-shadow-[0_0_10px_rgba(250,188,63,0.4)]"
                >
                  <AnimatedNumber value={jackpot.amounts[viewType]} /> <span className="text-xl">P-PP</span>
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Each ticket's jackpot">
              {TICKET_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={type === viewType}
                  onClick={() => onLook(type)}
                  className={`flex min-h-11 min-w-0 cursor-pointer flex-col items-start justify-center rounded-lg border px-2 text-left transition-colors duration-300 ${
                    type === viewType ? 'border-white/25 bg-white/10' : 'border-white/10 bg-transparent hover:bg-white/5'
                  }`}
                >
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    <TicketName type={type} />
                  </span>
                  <span className="truncate text-sm font-semibold text-white/85">
                    <AnimatedNumber value={jackpot.amounts[type]} />
                  </span>
                </button>
              ))}
            </div>

            {/* Always three lines tall, whatever's in it: the ticket sits
                below this panel, and a new jackpot (anyone's) must never
                push it down mid-scratch. New winners slide in sideways. */}
            <ul className="mt-2 flex h-16 flex-col gap-0.5 overflow-hidden text-xs leading-5 text-white/60" aria-label="Recent jackpots">
              <AnimatePresence initial={false} mode="popLayout">
                {jackpot.recent.length === 0 ? (
                  <motion.li key="none" {...fade} className="text-white/40">
                    Nobody has won one yet. It could be you.
                  </motion.li>
                ) : (
                  jackpot.recent.slice(0, 3).map((win) => (
                    <motion.li
                      key={`${win.username}-${win.at}`}
                      layout
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="truncate"
                    >
                      <span className="text-white/80">{win.username}</span> won {win.amount.toLocaleString('en-US')} on{' '}
                      <TicketName type={ticketTypeOf(win)} /> · {timeAgo(win.at)}
                    </motion.li>
                  ))
                )}
              </AnimatePresence>
            </ul>
          </motion.div>
        ) : (
          <motion.div key="loading" {...fade} className="mt-1 flex flex-col gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-11" />
            <div className="flex h-16 flex-col gap-2 pt-1">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-40" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// One ticket type's Buy button: its name and price, and which coins pay
// (PP first), in its type's colours (ticketThemes.js): Standard gold as it
// always was, Premium red, VIP gold in a purple aura (the friend glow from
// the review cards, CardShine). Dimmed and off while it can't be bought: not
// enough points, a ticket printing, or for VIP, out of its hours ("Opens at
// 16:00"), which `sale` (from the server) says; it switches on by itself
// when the hours start. Pointing at it or focusing it shows its jackpot
// (`onLook`).
function BuyButton({ type, wallet, buying, sale, onBuy, onLook }) {
  const kind = ticketType(type)
  const theme = ticketTheme(type)
  const price = kind.price
  const total = wallet ? wallet.pp + wallet.ppp : null
  const fromPp = wallet ? Math.min(wallet.pp, price) : 0
  const short = total !== null && total < price
  // A ticket sold at certain hours stays off until the server says it's on.
  const closed = Boolean(kind.hours) && !sale?.open
  const disabled = Boolean(buying) || short || !wallet || closed

  let detail = null
  if (kind.hours && sale && !sale.open) detail = `Opens at ${kind.hours.opens}`
  else if (!buying && wallet && !short && !closed) {
    detail = [fromPp && `${fromPp} PP`, price - fromPp && `${price - fromPp} P-PP`].filter(Boolean).join(' + ')
  }

  // An iPhone only lets a page ask for the phone's tilt from inside a tap,
  // so the VIP button asks now, before anything is waited on.
  const tap = () => {
    if (theme.liveStars) askTiltPermission()
    onBuy(type)
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-1.5" style={theme.vars} onPointerEnter={() => onLook(type)}>
      <motion.div
        className="relative w-full"
        initial={false}
        animate={{ opacity: disabled ? 0.4 : 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.95 }}
      >
        <button
          type="button"
          onClick={tap}
          onFocus={() => onLook(type)}
          disabled={disabled}
          className="flex min-h-14 w-full cursor-pointer flex-col items-center justify-center rounded-xl [background:var(--tk-buy)] px-6 text-lg font-bold text-(--tk-buy-text) shadow-[0_0_24px_var(--tk-buy-glow)] transition-[filter] hover:brightness-110 disabled:cursor-default"
        >
          {buying === type ? 'Printing your ticket…' : `${kind.name} ticket · ${price}`}
          <AnimatePresence initial={false} mode="wait">
            {detail && (
              <motion.small key={detail} {...fade} className="text-xs font-medium">
                {/* Its strength on an inner span: the fade sets the outer one's. */}
                <span className="opacity-(--tk-buy-detail)">{detail}</span>
              </motion.small>
            )}
          </AnimatePresence>
        </button>
        {theme.aura && <CardShine tone={theme.aura} shape="button" />}
      </motion.div>
      <AnimatePresence initial={false}>
        {short && (
          <motion.p
            key="short"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden text-sm text-red-300"
          >
            A {kind.name} ticket is {price} points, and you have {total}.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// Buying a ticket: a button for each type, cheapest first. `hours` is
// whether each is on sale (useTicketHours).
function BuyPanel({ wallet, buying, hours, onBuy, onLook, again }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={`${GLASS} flex flex-col items-center gap-3 p-6 text-center`}
    >
      <h2 className="font-['Bebas_Neue'] text-3xl tracking-wide text-white">{again ? 'Another showing?' : 'Get your ticket'}</h2>
      <p className="max-w-sm text-sm text-white/70">
        {SCRATCH.scratches} scratches, {SCRATCH.stars} stars hidden on the card. Find {SCRATCH.starsToWin} to win, and keep an eye out for the
        Golden Ticket. Pricier tickets pay bigger prizes, and each has its own jackpot.
      </p>
      <div className="flex w-full flex-col items-center gap-3">
        {TICKET_TYPES.map((type) => (
          <BuyButton key={type} type={type} wallet={wallet} buying={buying} sale={hours?.[type] ?? null} onBuy={onBuy} onLook={onLook} />
        ))}
      </div>
      {TIMED.map((type) => (
        <p key={type.key} className="text-xs text-white/50">
          <TicketName type={type.key} /> tickets are on sale {describeHours(type.hours)}.
        </p>
      ))}
    </motion.section>
  )
}

// Box Office Scratch: a scratch card game for points (backend/utils/scratch.js).
// Your balance and the jackpots up top, your ticket (or the way to buy one:
// Standard, Premium or VIP), and how to play. Coming back mid-card picks it
// up where you left it. The jackpot and the prize table follow the ticket
// you're looking at (pointing at a Buy button, or tapping a jackpot) or
// playing. Everything moves into place rather than snapping; with reduced
// motion, movement becomes simple fades (MotionConfig). Behind it all, the
// club's purple runs into blue.
export default function ScratchGame() {
  const wallet = useWallet()
  const jackpot = useJackpot()
  const { hours, refresh: refreshHours } = useTicketHours()
  const game = useScratchCard()
  const { card, loading, buying, error, buy, clearError, uncovered } = game
  const [looking, setLooking] = useState(null)

  const viewType = looking ?? (card ? ticketTypeOf(card) : DEFAULT_TICKET_TYPE)

  const buyTicket = useCallback(
    (type) => {
      setLooking(type)
      buy(type)
    },
    [buy]
  )

  // An error shows for a few seconds, then fades. A refused ticket may be
  // VIP closing that very moment, so the hours are checked again too.
  useEffect(() => {
    if (!error) return
    refreshHours()
    const timer = setTimeout(clearError, 4500)
    return () => clearTimeout(timer)
  }, [error, clearError, refreshHours])

  const lastTile = card?.scratched[card.scratched.length - 1]
  const finished = card?.status === 'complete' && (lastTile === undefined || uncovered.has(lastTile))

  return (
    <MotionConfig reducedMotion="user">
      {/* Outside the sliding wrapper: a moving parent would carry a fixed
          background along with it. */}
      <GameBackdrop to="#1E3A8A" />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:py-12"
      >
        <header>
          <Link to="/games" className="text-sm text-white/60 hover:text-white">
            ← Games
          </Link>
          <h1 className="mt-2 font-['Bebas_Neue'] text-5xl leading-none tracking-wide text-white">
            Box Office <span className="text-brand-gold">Scratch</span>
          </h1>
          <p className="mt-1 text-white/60">Scratch for stars. The sooner the third one shows, the bigger the hit.</p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BalancePanel wallet={wallet} />
          <JackpotPanel jackpot={jackpot} viewType={viewType} onLook={setLooking} />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <div className="flex min-w-0 flex-col gap-4">
            {/* The ticket's room is kept from the start, so nothing below
                jumps as it loads or as one card gives way to the next. */}
            <div className="relative min-h-148 perspective-distant">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="skeleton" {...fade}>
                    <TicketSkeleton />
                  </motion.div>
                ) : card ? (
                  <ScratchTicket key={card._id} game={game} />
                ) : (
                  <BuyPanel key="buy" wallet={wallet} buying={buying} hours={hours} onBuy={buyTicket} onLook={setLooking} />
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {finished && (
                <BuyPanel key="again" wallet={wallet} buying={buying} hours={hours} onBuy={buyTicket} onLook={setLooking} again />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.p
                  key={error}
                  role="alert"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-center text-sm text-red-200 backdrop-blur-md"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <HowToPlay jackpots={jackpot?.amounts ?? null} viewType={viewType} hours={hours} />
        </div>
      </motion.div>
    </MotionConfig>
  )
}
