import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react'
import PlayingCard from './cards'
import ChipStack from './ChipStack'
import Seat from './Seat'
import { glide } from './style'
import { POKER } from '../../../../shared/poker/config.js'

const DEAL_GAP = 0.09 // seconds between cards in the deal
const FLIGHT = 0.5 // seconds a card is in the air
const EASE = [0.25, 0.8, 0.25, 1]
// A card lying on the table, and hovered.
const REST = { x: 0, y: 0, scale: 1, opacity: 1, boxShadow: '0 3px 6px rgba(0,0,0,0.45)' }
const HOVER_SHADOW = '0 14px 18px rgba(0,0,0,0.4)'
const SETTLE = { duration: 0.4, ease: EASE }
// How far a card you've picked to swap stands up out of your hand.
const MAX_LIFT = 14

// Every seat's picture is this wide, with this much under it (name, chips,
// what they last did).
const AVATAR = 40
const INFO = 50

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

// Where everything goes for a table `width` x `height`: the seats spread
// evenly round an ellipse with the viewer's own at the bottom, each placed
// by the middle of its picture. Everyone else's cards peek out from behind
// their picture (and come out in front of it, face up, at a showdown);
// bets sit between the seat and the middle; the deck and pot in the
// middle; the viewer's own hand big along the bottom.
function layout({ width, height, seats, anchor, seated }) {
  const handHeight = seated ? Math.min(150, Math.max(96, height * 0.24)) : 0
  const tableHeight = height - handHeight
  const cx = width / 2
  const cy = tableHeight * 0.5
  const rx = Math.min(width * 0.41, tableHeight * 0.9)
  const ry = tableHeight * 0.37
  const smallCard = Math.max(20, Math.min(34, width * 0.06))
  const showCard = smallCard * 1.25
  // Room above the top seat for the cards peeking over its picture, and
  // under the bottom one for its name and chips.
  const top = AVATAR / 2 + smallCard * 1.4 * 0.6 + 4
  const bottom = tableHeight - AVATAR / 2 - INFO
  const ordered = [...seats].sort((a, b) => ((a.seat - anchor + POKER.seats) % POKER.seats) - ((b.seat - anchor + POKER.seats) % POKER.seats))

  const places = new Map()
  ordered.forEach((seat, k) => {
    const angle = Math.PI / 2 + (k * 2 * Math.PI) / ordered.length
    const x = clamp(cx + rx * Math.cos(angle), 52, width - 52)
    const y = clamp(cy + ry * 1.08 * Math.sin(angle), top, Math.max(top, bottom))
    const length = Math.hypot(cx - x, cy - y) || 1
    const ux = (cx - x) / length
    const uy = (cy - y) / length
    // From the middle of the picture to the edge of the seat, toward the
    // middle of the table (the name and chips under the picture count when
    // the middle is below it), then `gap` further for something `w` x `h`.
    const reach = AVATAR / 2 + Math.max(0, uy) * INFO
    const out = (w, h, gap = 6) => {
      const distance = reach + Math.abs(ux) * (w / 2) + Math.abs(uy) * (h / 2) + gap
      return { x: x + ux * distance, y: y + uy * distance }
    }
    places.set(seat.seat, {
      x,
      y,
      mine: seated && seat.seat === anchor,
      peek: { x: x + 4, y: y - AVATAR / 2 - 2 },
      show: out(showCard * 3, showCard * 1.4),
      bet: out(28, 40),
    })
  })

  const handCard = Math.min(78, (width - 32 - 4 * 10) / 5, handHeight * 0.62)
  return {
    width,
    height,
    tableHeight,
    handHeight,
    center: { x: cx, y: cy },
    radius: { x: rx, y: ry },
    deck: { x: cx - Math.min(34, width * 0.07), y: cy - 6 },
    pot: { x: cx + Math.min(30, width * 0.06), y: cy + 6 },
    places,
    smallCard,
    showCard,
    handCard,
    handSlot: (index) => ({ x: cx + (index - 2) * (handCard + 10), y: tableHeight + handHeight / 2 }),
  }
}

// One card on the table. New cards fly in from the deck on an arc (up and
// over, a shadow that falls away as it rises), with a short delay so a deal
// goes round the table one card at a time; they turn face up as they land
// if they're yours. Cards leaving (thrown away, folded, collected at the
// end) fly back to the middle.
function TableCard({ card, slot, width, deck, delay: dealtDelay, fresh: dealtFresh, tilt = 0, selected, lift = 0, onClick, label, front = false }) {
  const reduce = useReducedMotion()
  const dx = deck.x - slot.x
  const dy = deck.y - slot.y
  const faceUp = Boolean(card.code)
  // Worked out once, when the card first appears, so later renders never
  // fly it again or hold back a later flip (a showdown's) by the deal's delay.
  const [arrival] = useState(() => ({
    fresh: dealtFresh,
    delay: dealtFresh ? dealtDelay : 0,
    flipOnLanding: dealtFresh && faceUp,
    flight:
      dealtFresh && !reduce
        ? {
            x: [dx, dx * 0.45, 0],
            y: [dy, dy * 0.45 - 46, 0],
            scale: [0.55, 1.12, 1],
            boxShadow: ['0 1px 2px rgba(0,0,0,0.4)', '0 26px 22px rgba(0,0,0,0.35)', '0 3px 6px rgba(0,0,0,0.45)'],
          }
        : null,
  }))
  const { fresh, delay, flight } = arrival
  // Once it has landed it just rests there, so everything after (being
  // hovered, picked, let go) eases from that rest, never replaying the
  // flight or waiting out the deal's delay.
  const [landed, setLanded] = useState(!fresh)
  const [hovered, setHovered] = useState(false)
  const present = useIsPresent()
  const height = width * 1.4
  const rotateY = faceUp ? 0 : 180
  const flip = { duration: 0.45, ease: EASE }
  const lifted = landed && hovered && !reduce && Boolean(onClick)
  // Picked cards stand up out of the row; the one under the mouse rises a
  // little more, its shadow falling further away.
  const rest = { ...REST, y: -lift - (lifted ? 6 : 0), scale: lifted ? 1.04 : 1, boxShadow: lifted ? HOVER_SHADOW : REST.boxShadow }

  return (
    <>
      <PlayingCard
        code={card.code}
        width={width}
        selected={selected}
        className="pointer-events-none"
        style={{
          left: slot.x - width / 2,
          top: slot.y - height / 2,
          rotate: tilt,
          // In front of the seats when shown, behind them when held.
          zIndex: front ? 15 : undefined,
          // A held card sliding out to be shown, or the table changing
          // size, moves and grows it smoothly.
          transition: glide(reduce, 'top', 'left', 'width', 'height'),
        }}
        initial={fresh ? { x: dx, y: dy, scale: 0.55, rotateY: 180, opacity: reduce ? 0 : 1 } : false}
        animate={landed ? { ...rest, rotateY } : { ...(flight ?? REST), opacity: 1, rotateY }}
        onAnimationComplete={() => setLanded(true)}
        exit={{
          x: dx,
          y: [0, dy * 0.5 - 30, dy],
          scale: 0.5,
          rotateY: 180,
          opacity: [1, 1, 0],
          transition: { duration: reduce ? 0.15 : 0.45, ease: 'easeIn' },
        }}
        transition={
          landed
            ? { default: SETTLE, rotateY: flip }
            : {
                default: { duration: reduce ? 0.2 : FLIGHT, delay, ease: 'easeOut', times: [0, 0.5, 1] },
                rotateY: { ...flip, delay: arrival.flipOnLanding ? delay + FLIGHT * 0.8 : 0 },
                opacity: { duration: 0.2, delay },
              }
        }
      />
      {/* Your own cards in the draw: tapped and hovered through a still
          area over the card and the room it rises into, so a card moving
          up never slips out from under the mouse and jitters. */}
      {onClick && present && (
        <button
          type="button"
          aria-label={label}
          aria-pressed={selected}
          onClick={onClick}
          onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          className="absolute z-20 cursor-pointer rounded-[10%] focus-visible:outline-2 focus-visible:outline-brand-gold"
          style={{ left: slot.x - width / 2, top: slot.y - height / 2 - MAX_LIFT, width, height: height + MAX_LIFT }}
        />
      )}
    </>
  )
}

// The whole table, as `view` (the server's table for this member) has it.
//   selected / onToggle  the viewer's cards picked to swap in the draw
//   bubbles   [{ id, seat, name, text }]: the bot speech bubble showing
//   emojis    [{ id, seat, emoji }]: reactions floating up
//   slides    [{ id, seat, amount }]: pots sliding to winners
//   now       the server's time, for the turn timers
export default function TableScene({ view, selected = [], onToggle, bubbles = [], emojis = [], slides = [], now }) {
  const ref = useRef(null)
  // Measured before anything is drawn, so the table opens at its real size
  // and only glides when that changes afterwards.
  const [size, setSize] = useState(null)
  // Cards already on the table when the page opens just sit there; only
  // ones that arrive after that fly in.
  const [ready, setReady] = useState(false)
  const reduce = useReducedMotion()

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => setSize({ width: element.clientWidth, height: element.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    const frame = requestAnimationFrame(() => setReady(true))
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  if (!size) return <div ref={ref} className="relative h-full w-full overflow-hidden" />

  const mySeat = view.you.seat
  const seated = mySeat !== null
  const anchor = seated ? mySeat : (view.seats[0]?.seat ?? 0)
  const L = layout({ ...size, seats: view.seats, anchor, seated })
  const hand = view.hand

  // A card appearing in the first betting round is part of the deal: it
  // comes in its turn round the table, one card at a time from the
  // dealer's left. One appearing in the draw replaces a thrown-away card,
  // a moment after that one has flown back to the middle.
  const order = hand?.order ?? []
  const dealDelay = (seat, index) => (index * order.length + Math.max(0, order.indexOf(seat))) * DEAL_GAP
  const potAmount = hand && hand.phase !== 'done' ? hand.pot - view.seats.reduce((sum, seat) => sum + seat.bet, 0) : 0

  const cards = []
  for (const seat of view.seats) {
    const place = L.places.get(seat.seat)
    if (!place) continue
    seat.cards.forEach((card, index) => {
      const fresh = ready
      const delay = hand?.phase === 'bet1' ? dealDelay(seat.seat, index) : 0.4 + index * 0.08
      if (place.mine) {
        const slot = L.handSlot(index)
        const isSelected = selected.includes(index)
        cards.push(
          <TableCard
            key={card.id}
            card={card}
            slot={slot}
            width={L.handCard}
            deck={L.deck}
            delay={delay}
            fresh={fresh}
            selected={isSelected}
            lift={isSelected ? MAX_LIFT : 0}
            onClick={onToggle ? () => onToggle(index) : undefined}
            label={`Card ${index + 1}: ${isSelected ? 'picked to swap' : 'tap to swap'}`}
          />
        )
      } else {
        // Held behind the picture; shown in front of the seat.
        const shown = Boolean(card.code)
        const width = shown ? L.showCard : L.smallCard
        const at = shown ? place.show : place.peek
        const slot = { x: at.x + (index - 2) * width * (shown ? 0.5 : 0.36), y: at.y + Math.abs(index - 2) * 1.5 }
        cards.push(
          <TableCard key={card.id} card={card} slot={slot} width={width} deck={L.deck} delay={delay} fresh={fresh} tilt={(index - 2) * 6} front={shown} />
        )
      }
    })
  }

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      {/* The table, tipped away from you: felt, a gold rail, a spotlight. */}
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          left: L.center.x - L.radius.x,
          top: L.center.y - L.radius.y,
          width: L.radius.x * 2,
          height: L.radius.y * 2,
          perspective: 900,
          transition: glide(reduce, 'left', 'top', 'width', 'height'),
        }}
      >
        <div
          className="h-full w-full rounded-[50%]"
          style={{
            transform: 'rotateX(24deg)',
            background: 'radial-gradient(ellipse at 50% 38%, #1F7A4D 0%, #0E4D30 55%, #082E1D 100%)',
            border: `${Math.max(8, L.radius.x * 0.06)}px solid #4A1414`,
            transition: glide(reduce, 'border-width'),
            boxShadow: '0 0 0 3px #FABC3F, 0 28px 50px rgba(0,0,0,0.65), inset 0 0 40px rgba(0,0,0,0.55), inset 0 -10px 30px rgba(250,188,63,0.08)',
          }}
        />
      </div>

      {/* The deck. */}
      <div
        aria-label="The deck"
        className="absolute"
        style={{ left: L.deck.x - L.smallCard / 2, top: L.deck.y - (L.smallCard * 1.4) / 2, transition: glide(reduce, 'left', 'top') }}
      >
        {[0, 1, 2].map((i) => (
          <PlayingCard key={i} code={null} width={L.smallCard} style={{ left: -i * 1.5, top: -i * 1.5, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} initial={false} animate={{ rotateY: 180 }} />
        ))}
      </div>

      {/* The pot. */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: L.pot.x, top: L.pot.y + 14, transition: glide(reduce, 'left', 'top') }}
        aria-label={`Pot ${potAmount}`}
      >
        <ChipStack amount={potAmount} size={Math.max(20, L.smallCard * 0.85)} />
      </div>

      {/* What each player has bet this round. */}
      {view.seats.map((seat) => {
        const place = L.places.get(seat.seat)
        if (!place || seat.bet <= 0 || hand?.phase === 'done') return null
        const at = place.bet
        return (
          <motion.div
            key={`bet-${seat.seat}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: at.x, top: at.y, transition: glide(reduce, 'left', 'top') }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <ChipStack amount={seat.bet} size={16} />
          </motion.div>
        )
      })}

      {/* The seats. */}
      {view.seats.map((seat) => {
        const place = L.places.get(seat.seat)
        return place ? <Seat key={seat.seat} seat={seat} place={place} size={AVATAR} hand={hand} now={now} mine={place.mine} /> : null
      })}

      {/* The cards. */}
      <AnimatePresence>{cards}</AnimatePresence>

      {/* Pots sliding to whoever won them. */}
      <AnimatePresence>
        {slides.map((slide) => {
          const place = L.places.get(slide.seat)
          if (!place) return null
          return (
            <motion.div
              key={slide.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: L.pot.x, top: L.pot.y + 14 }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: place.x - L.pot.x, y: place.y - L.pot.y - 14, opacity: [1, 1, 0], scale: [1, 1.1, 0.8] }}
              transition={{ duration: reduce ? 0.3 : 1.1, ease: [0.25, 0.8, 0.25, 1], times: [0, 0.75, 1] }}
            >
              <ChipStack amount={slide.amount} size={22} />
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Emoji reactions, floating up from the seat. */}
      <AnimatePresence>
        {emojis.map((item) => {
          const place = L.places.get(item.seat)
          if (!place) return null
          return (
            <motion.span
              key={item.id}
              aria-hidden="true"
              className="pointer-events-none absolute z-20 -translate-x-1/2 text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
              style={{ left: place.x, top: place.y - 40 }}
              initial={{ opacity: 0, y: 10, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], y: [10, -10, -40, -70], scale: [0.4, 1.25, 1, 0.9] }}
              transition={{ duration: POKER.emoji.showSeconds, ease: 'easeOut', times: [0, 0.15, 0.7, 1] }}
            >
              {item.emoji}
            </motion.span>
          )
        })}
      </AnimatePresence>

      {/* The bot speaking, one bubble at a time. */}
      <AnimatePresence>
        {bubbles.map((bubble) => {
          const place = L.places.get(bubble.seat)
          if (!place) return null
          const below = place.y < L.tableHeight * 0.35
          // Narrow enough that two bots talking at once don't overlap.
          const width = Math.min(190, L.width * 0.44)
          const left = Math.min(L.width - width - 12, Math.max(12, place.x - width / 2))
          return (
            <motion.div
              key={bubble.id}
              role="status"
              className="pointer-events-none absolute z-30"
              style={{ left, width, top: below ? place.y + AVATAR / 2 + INFO : undefined, bottom: below ? undefined : L.height - place.y + AVATAR / 2 + 20 }}
              initial={{ opacity: 0, y: below ? -8 : 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
            >
              <div className="rounded-2xl border border-brand-gold/50 bg-[#FBF6EA] px-3 py-1.5 text-center text-xs font-semibold text-ink shadow-lg shadow-black/50">
                <span className="block text-[10px] font-bold tracking-wide text-brand-red uppercase">{bubble.name}</span>
                {bubble.text}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
