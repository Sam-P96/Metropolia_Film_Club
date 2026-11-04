import { motion } from 'motion/react'

// Kino Poker's playing cards. A card is a code like "Ts" (ten of spades)
// or "Ah", or null for one you can't see. The card is a 3D object with a
// face and a back (backface-visibility hidden), turned with rotateY, so it
// really flips over.

const SUITS = { s: '♠', h: '♥', d: '♦', c: '♣' }
const SUIT_NAMES = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }
const RANKS = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' }
const RANK_NAMES = { T: 'Ten', J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' }

const rankLabel = (code) => RANKS[code[0]] ?? code[0]
const suitSymbol = (code) => SUITS[code[1]]
const cardName = (code) => (code ? `${RANK_NAMES[code[0]] ?? code[0]} of ${SUIT_NAMES[code[1]]}` : 'Face-down card')
const isRed = (code) => code[1] === 'h' || code[1] === 'd'

// The face: ivory, the rank and suit in two corners and a big suit in the
// middle, red or black.
export function CardFace({ code, width }) {
  const small = width < 40
  const colour = isRed(code) ? '#C7253E' : '#1A1024'
  return (
    <div
      className="absolute inset-0 flex flex-col justify-between rounded-[10%] border border-black/20 bg-[#FBF6EA] p-[7%] select-none [backface-visibility:hidden]"
      style={{ color: colour, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)' }}
    >
      <span className="leading-none font-bold" style={{ fontSize: Math.max(9, width * 0.26) }}>
        {rankLabel(code)}
        {!small && <span className="block" style={{ fontSize: Math.max(8, width * 0.22) }}>{suitSymbol(code)}</span>}
      </span>
      <span className="pointer-events-none absolute inset-0 grid place-items-center" style={{ fontSize: width * (small ? 0.5 : 0.55) }} aria-hidden="true">
        {suitSymbol(code)}
      </span>
      {!small && (
        <span className="rotate-180 self-end leading-none font-bold" style={{ fontSize: Math.max(9, width * 0.26) }}>
          {rankLabel(code)}
          <span className="block" style={{ fontSize: Math.max(8, width * 0.22) }}>{suitSymbol(code)}</span>
        </span>
      )}
    </div>
  )
}

// The back: the club's red velvet, a gold border, and a film reel.
export function CardBack({ width }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[10%] border border-brand-gold/70 [backface-visibility:hidden]"
      style={{
        transform: 'rotateY(180deg)',
        backgroundColor: '#5C0E1F',
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(250,188,63,0.14) 0 2px, transparent 2px 7px), repeating-linear-gradient(-45deg, rgba(250,188,63,0.14) 0 2px, transparent 2px 7px)',
      }}
    >
      <div className="absolute inset-[9%] grid place-items-center rounded-[8%] border border-brand-gold/40">
        <span className="text-brand-gold/80" style={{ fontSize: width * 0.42 }} aria-hidden="true">
          ✦
        </span>
      </div>
    </div>
  )
}

// A whole card, `width` wide (height 1.4 times that), showing its face if
// `code` is known and its back otherwise. Every motion prop goes on the
// card, so the table can fly it about; `faceUp` turns it face up. Anything
// inside it (a best-hand glow) moves and turns with it.
export default function PlayingCard({ code, width, faceUp = Boolean(code), selected = false, className = '', style, children, ...motionProps }) {
  return (
    <motion.div
      role="img"
      aria-label={faceUp && code ? cardName(code) : 'Face-down card'}
      className={`absolute rounded-[10%] ${className}`}
      style={{ width, height: width * 1.4, transformStyle: 'preserve-3d', transformPerspective: 900, ...style }}
      {...motionProps}
    >
      {code && <CardFace code={code} width={width} />}
      <CardBack width={width} />
      {selected && <div className="pointer-events-none absolute -inset-1 rounded-[12%] ring-2 ring-brand-gold [backface-visibility:hidden]" />}
      {children}
    </motion.div>
  )
}
