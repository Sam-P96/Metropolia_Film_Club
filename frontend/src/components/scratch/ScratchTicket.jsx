import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import ScratchTile from './ScratchTile'
import TierBanner from './TierBanner'
import { Bulbs, Skeleton } from './Marquee'
import { ticketTheme } from './ticketThemes'
import useStarMotion from '../../hooks/useStarMotion'
import { askTiltPermission } from '../../utils/tilt'
import { SCRATCH } from '../../../../shared/scratch/config.js'
import { DEFAULT_TICKET_TYPE, ticketType, ticketTypeOf } from '../../../../shared/scratch/tickets.js'

// The perforation between the ticket's header and its tiles sits this far
// down, and the notches cut into the ticket's sides line up with it.
const HEADER_HEIGHT = 132

// The film-ticket shape: a round notch out of each side at the perforation.
const NOTCHES = (() => {
  const notch = (side) => `radial-gradient(circle 11px at ${side} ${HEADER_HEIGHT}px, transparent 98%, #000) ${side === '0' ? 'left' : 'right'} / 51% 100% no-repeat`
  const mask = `${notch('0')}, ${notch('100%')}`
  return { WebkitMask: mask, mask }
})()

// The ticket's buttons, in its type's colours (ticketThemes.js): the main
// one (Reveal card, and Collect once it asks), and the quieter ones.
const BUTTON = 'min-h-11 cursor-pointer rounded-xl px-4 font-bold transition disabled:cursor-default disabled:opacity-40'
const MAIN_BUTTON = `${BUTTON} bg-(--tk-cta) text-(--tk-cta-text) hover:brightness-110`
const QUIET_BUTTON = `${BUTTON} border border-(--tk-ghost-edge) bg-(--tk-ghost) text-(--tk-ghost-text) hover:bg-(--tk-ghost-hover)`

// A counter whose number drops in when it changes.
function Count({ label, value, of }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-(--tk-label)">{label}</span>
      <span className="relative inline-flex min-w-[1ch] justify-center overflow-hidden font-bold text-(--tk-value) tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-(--tk-label)">/ {of}</span>
    </span>
  )
}

// The ticket's shape and header, shared by the real ticket and its
// loading placeholder: `stats` go under the title, `children` below the
// perforation, `footer` at the bottom. `type` is its ticket type: every
// colour in it comes from that type's theme (ticketThemes.js), set here as
// CSS variables. Premium and VIP say which they are next to "Admit one".
function TicketFrame({ type = DEFAULT_TICKET_TYPE, number, stats, children, footer }) {
  const theme = ticketTheme(type)
  return (
    <div className="drop-shadow-[0_22px_32px_rgba(0,0,0,0.6)]" style={theme.vars}>
      <div
        style={NOTCHES}
        className={`rounded-3xl border border-(--tk-edge) [background:var(--tk-body)] backdrop-blur-md ${theme.bodyClass}`}
      >
        <header className="flex flex-col px-5 pt-4" style={{ height: HEADER_HEIGHT }}>
          <Bulbs count={16} />
          <div className="mt-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.3em] text-(--tk-fine)">
            <span>{type === DEFAULT_TICKET_TYPE ? 'Admit one' : `${ticketType(type).name} · Admit one`}</span>
            <span>{number}</span>
          </div>
          <h2 className="mt-1 text-center font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-(--tk-title) drop-shadow-[0_0_10px_var(--tk-title-glow)]">
            Box Office Scratch
          </h2>
          {stats}
        </header>
        <div className="mx-4 border-t-2 border-dashed border-(--tk-rule)" />
        <div className="flex flex-col gap-3 p-4">{children}</div>
        {footer}
      </div>
    </div>
  )
}

// The ticket while the page loads: the same shape and size, shimmering.
export function TicketSkeleton() {
  return (
    <TicketFrame
      number="No. ······"
      stats={
        <div className="mt-3 flex justify-center gap-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
      }
    >
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: SCRATCH.rows * SCRATCH.cols }, (_, i) => (
            <Skeleton key={i} className="aspect-square min-h-11" />
          ))}
        </div>
      <Skeleton className="mx-auto h-4 w-48" />
      <Skeleton className="h-11" />
    </TicketFrame>
  )
}

// "Collect", which asks first: it ends the card with scratches unused.
function CollectButton({ scratchesLeft, onCollect }) {
  const [asking, setAsking] = useState(false)

  return (
    <AnimatePresence mode="wait" initial={false}>
      {asking ? (
        <motion.div
          key="ask"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-2 text-center"
        >
          <p className="text-sm text-(--tk-ask)">
            End the card? Your {scratchesLeft} {scratchesLeft === 1 ? 'scratch' : 'scratches'} left go unused.
          </p>
          <div className="grid w-full grid-cols-2 gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setAsking(false)
                onCollect()
              }}
              className={MAIN_BUTTON}
            >
              Collect
            </motion.button>
            <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => setAsking(false)} className={QUIET_BUTTON}>
              Keep scratching
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <motion.button
          key="collect"
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setAsking(true)}
          className={`${QUIET_BUTTON} w-full hover:border-(--tk-ghost-hover-edge)`}
        >
          Collect
        </motion.button>
      )}
    </AnimatePresence>
  )
}

// One Box Office Scratch card: `game` is useScratchCard. The tiles, the
// two counters, the marquee when a tier locks in, and what you can do now:
// scratch, Collect, or once it's done, Reveal card. It looks like its
// ticket type (ticketThemes.js); on a VIP card the stars come alive
// (useStarMotion), and coming back to one, the first scratch is the tap
// that asks an iPhone for its tilt (the Buy tap asked for a new card).
export default function ScratchTicket({ game }) {
  const { card, uncovered, pending, busy, reveal, scratch, uncover, collect, revealAll } = game
  const type = ticketTypeOf(card)
  const theme = ticketTheme(type)
  const starMotion = useStarMotion(theme.liveStars)
  const askTilt = theme.liveStars ? () => askTiltPermission() : undefined

  const done = card.status === 'complete'
  const layout = reveal?.cardId === card._id ? reveal.layout : null

  // What the player has actually seen, so the counters and banners keep
  // pace with the foil coming off, not with the server answering.
  const shownStars = card.scratched.filter((tile) => uncovered.has(tile) && card.tiles[tile] === 'star').length
  const lastTile = card.scratched[card.scratched.length - 1]
  const settled = done && (lastTile === undefined || uncovered.has(lastTile))
  const tierTile = card.tier ? card.scratched[card.tier.scratch - 1] : null
  const goldenTile = card.goldenFound ? card.scratched.find((tile) => card.tiles[tile] === 'golden') : null

  // Everything the card has won, each on its own marquee as it's
  // uncovered: a tier and the jackpot can both be won on one card. A card
  // with neither, once done, closes on the Bomb.
  const banners = []
  if (card.tier && uncovered.has(tierTile)) banners.push({ key: 'tier', kind: 'tier', tier: card.tier })
  if (card.goldenFound && uncovered.has(goldenTile) && card.jackpotAmount) {
    banners.push({ key: 'jackpot', kind: 'jackpot', amount: card.jackpotAmount })
  }
  if (settled && !card.tier && !card.goldenFound) banners.push({ key: 'bomb', kind: 'bomb' })

  const missedGolden = Boolean(layout) && !card.goldenFound && layout.includes('golden')
  const unscratched = [...Array(SCRATCH.rows * SCRATCH.cols).keys()].filter((tile) => card.tiles[tile] === null)

  const goldenSeen = card.goldenFound && uncovered.has(goldenTile)
  const tierSeen = Boolean(card.tier) && uncovered.has(tierTile)

  let status
  if (missedGolden) status = 'So close… the Golden Ticket was on this card.'
  else if (layout) status = 'Every tile, revealed. The dim ones are those you didn\'t scratch.'
  else if (settled) status = 'Card finished.'
  else if (busy !== null) status = pending !== null ? 'Scratching…' : 'Rub away, or let go to uncover it.'
  else if (tierSeen && goldenSeen) status = 'A win and the jackpot! Scratch the rest for fun, or Collect.'
  else if (goldenSeen) status = 'The Golden Ticket! Keep scratching for stars.'
  else if (tierSeen) status = 'Tier locked in! Your scratches left hunt for the Golden Ticket.'
  else status = 'Tap or rub any tile to scratch it.'

  return (
    <motion.article
      initial={{ opacity: 0, y: 36, rotateY: -75 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      exit={{ opacity: 0, y: -24, rotateY: 60 }}
      transition={{ type: 'spring', stiffness: 170, damping: 20 }}
      style={{ transformPerspective: 1200 }}
      aria-label={`Your ${ticketType(type).name} scratch card`}
    >
      <TicketFrame
        type={type}
        number={`No. ${String(card._id).slice(-6).toUpperCase()}`}
        stats={
          <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm" aria-live="polite">
            <Count label="Scratches left:" value={card.scratchesLeft} of={SCRATCH.scratches} />
            <Count label="Stars found:" value={Math.min(shownStars, SCRATCH.starsToWin)} of={SCRATCH.starsToWin} />
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-(--tk-footer-rule) px-5 py-3 text-[11px] text-(--tk-seal)">
            <span className="font-mono" title={card.hash}>
              Seal {card.hash.slice(0, 8)}…{card.hash.slice(-6)}
            </span>
            <AnimatePresence>
              {layout && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={reveal.verified === false ? 'text-(--tk-bad)' : 'text-(--tk-ok)'}
                >
                  {reveal.verified === null ? 'Seal: this browser can\'t check it' : reveal.verified ? '✓ Matches the seal' : '✗ Doesn\'t match the seal'}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        }
      >
        <AnimatePresence mode="popLayout">
          {banners.map(({ key, ...banner }) => (
            <TierBanner key={key} {...banner} />
          ))}
        </AnimatePresence>

        {/* touch-action: none here only, so rubbing the card doesn't scroll
            the page, and the rest of the page scrolls as normal. On a VIP
            card, the end of a tap here (touchend, or click with a mouse)
            asks an iPhone for its tilt, if nobody has yet. */}
        <div className="grid touch-none grid-cols-4 gap-2 select-none" onTouchEnd={askTilt} onClick={askTilt}>
          {Array.from({ length: SCRATCH.rows * SCRATCH.cols }, (_, tile) => {
            const scratchedHere = card.tiles[tile] !== null
            const content = card.tiles[tile] ?? layout?.[tile] ?? null
            const revealing = Boolean(layout) && !scratchedHere
            const active =
              busy === tile || (busy === null && pending === null && card.status === 'active' && !scratchedHere)
            const row = Math.floor(tile / SCRATCH.cols) + 1
            const col = (tile % SCRATCH.cols) + 1

            return (
              <ScratchTile
                key={`${card._id}-${tile}`}
                index={tile}
                label={`Row ${row}, tile ${col}: ${uncovered.has(tile) || revealing ? content ?? 'covered' : active ? 'scratch it' : 'covered'}`}
                content={content}
                covered={!uncovered.has(tile)}
                active={active}
                waiting={pending === tile}
                autoClear={revealing}
                delay={revealing ? unscratched.indexOf(tile) * 0.07 : 0}
                dim={revealing}
                missed={revealing && content === 'golden'}
                type={type}
                starMotion={starMotion}
                onPress={scratch}
                onUncovered={uncover}
              />
            )
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={status}
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={`min-h-5 text-center text-sm ${missedGolden ? 'font-semibold text-(--tk-highlight)' : 'text-(--tk-status)'}`}
          >
            {missedGolden ? (
              <motion.span
                className="bg-linear-to-r from-(--tk-highlight) via-(--tk-highlight-via) to-(--tk-highlight) bg-size-[200%_100%] bg-clip-text text-transparent"
                animate={{ backgroundPosition: ['100% 0', '-100% 0'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                {status}
              </motion.span>
            ) : (
              status
            )}
          </motion.p>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {card.status === 'active' && (
            <motion.div key="collect" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CollectButton scratchesLeft={card.scratchesLeft} onCollect={collect} />
            </motion.div>
          )}
          {settled && !layout && (
            <motion.button
              key="reveal"
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.96 }}
              onClick={revealAll}
              className={`${MAIN_BUTTON} w-full`}
            >
              Reveal card
            </motion.button>
          )}
        </AnimatePresence>
      </TicketFrame>
    </motion.article>
  )
}
