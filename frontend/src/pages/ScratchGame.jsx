import '@fontsource/bebas-neue'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'

import AnimatedNumber from '../components/AnimatedNumber'
import CoinIcon from '../components/wallet/CoinIcon'
import HowToPlay from '../components/scratch/HowToPlay'
import ScratchTicket, { TicketSkeleton } from '../components/scratch/ScratchTicket'
import { Skeleton } from '../components/scratch/Marquee'
import { GoldenTicketIcon } from '../components/scratch/TileFace'
import useJackpot from '../hooks/useJackpot'
import useScratchCard from '../hooks/useScratchCard'
import useWallet from '../hooks/useWallet'
import { timeAgo } from '../utils/timeAgo'
import { SCRATCH } from '../../../shared/scratch/config.js'

const GLASS = 'rounded-2xl border border-white/10 bg-black/40 shadow-xl shadow-black/40 backdrop-blur-md'
const EASE = [0.22, 1, 0.36, 1]
const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 } }

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

// The jackpot pool, ticking up live, and who won it lately.
function JackpotPanel({ jackpot }) {
  return (
    <section className={`${GLASS} min-h-24 border-brand-gold/30 p-4`} aria-label="Jackpot">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-brand-gold/80">
        <GoldenTicketIcon className="w-5" /> Jackpot
      </p>
      <AnimatePresence mode="wait" initial={false}>
        {jackpot ? (
          <motion.div key="pool" {...fade}>
            <p className="mt-1 flex items-center gap-1.5 font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-brand-gold drop-shadow-[0_0_10px_rgba(250,188,63,0.4)]">
              <AnimatedNumber value={jackpot.amount} /> <span className="text-xl">P-PP</span>
            </p>
            {/* Always three lines tall, whatever's in it: the ticket sits
                below this panel, and a new jackpot (anyone's) must never
                push it down mid-scratch. New winners slide in sideways. */}
            <ul className="mt-2 flex h-16 flex-col gap-0.5 overflow-hidden text-xs leading-5 text-white/60" aria-label="Recent jackpots">
              <AnimatePresence initial={false} mode="popLayout">
                {jackpot.recent.length === 0 ? (
                  <motion.li key="none" {...fade} className="text-white/40">
                    Nobody has won it yet. It could be you.
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
                      <span className="text-white/80">{win.username}</span> won {win.amount.toLocaleString('en-US')} · {timeAgo(win.at)}
                    </motion.li>
                  ))
                )}
              </AnimatePresence>
            </ul>
          </motion.div>
        ) : (
          <motion.div key="loading" {...fade} className="mt-1 flex flex-col gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-3 w-40" />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// Buying a ticket: what it costs, and which coins pay (PP first).
function BuyPanel({ wallet, buying, onBuy, again }) {
  const price = SCRATCH.ticketPrice
  const total = wallet ? wallet.pp + wallet.ppp : null
  const fromPp = wallet ? Math.min(wallet.pp, price) : 0
  const short = total !== null && total < price

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
        Golden Ticket.
      </p>
      <motion.button
        type="button"
        onClick={onBuy}
        disabled={buying || short || !wallet}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        className="flex min-h-14 w-full max-w-xs cursor-pointer flex-col items-center justify-center rounded-xl bg-brand-gold px-6 text-lg font-bold text-ink shadow-[0_0_24px_rgba(250,188,63,0.3)] transition-[filter] hover:brightness-110 disabled:cursor-default disabled:opacity-40"
      >
        {buying ? 'Printing your ticket…' : `Buy a ticket · ${price}`}
        {!buying && wallet && !short && (
          <small className="text-xs font-medium opacity-75">
            {[fromPp && `${fromPp} PP`, price - fromPp && `${price - fromPp} P-PP`].filter(Boolean).join(' + ')}
          </small>
        )}
      </motion.button>
      {short && <p className="text-sm text-red-300">A ticket is {price} points, and you have {total}.</p>}
    </motion.section>
  )
}

// Box Office Scratch: a scratch card game for points (backend/utils/scratch.js).
// Your balance and the jackpot up top, your ticket (or the way to buy one),
// and how to play. Coming back mid-card picks it up where you left it.
// Everything moves into place rather than snapping; with reduced motion,
// movement becomes simple fades (MotionConfig).
export default function ScratchGame() {
  const wallet = useWallet()
  const jackpot = useJackpot()
  const game = useScratchCard()
  const { card, loading, buying, error, buy, clearError, uncovered } = game

  // An error shows for a few seconds, then fades.
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(clearError, 4500)
    return () => clearTimeout(timer)
  }, [error, clearError])

  const lastTile = card?.scratched[card.scratched.length - 1]
  const finished = card?.status === 'complete' && (lastTile === undefined || uncovered.has(lastTile))

  return (
    <MotionConfig reducedMotion="user">
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
          <JackpotPanel jackpot={jackpot} />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <div className="flex flex-col gap-4">
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
                  <BuyPanel key="buy" wallet={wallet} buying={buying} onBuy={buy} />
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {finished && <BuyPanel key="again" wallet={wallet} buying={buying} onBuy={buy} again />}
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

          <HowToPlay jackpot={jackpot?.amount ?? null} />
        </div>
      </motion.div>
    </MotionConfig>
  )
}
