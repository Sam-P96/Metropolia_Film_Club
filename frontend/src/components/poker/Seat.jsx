import { motion, useReducedMotion } from 'motion/react'
import MemberAvatar from '../profile/MemberAvatar'
import ChipStack from './ChipStack'
import { BOT_PICTURES } from './botPictures'
import { glide } from './style'
import { POKER } from '../../../../shared/poker/config.js'

// A bot's picture: the one the server picked when it sat down
// (botPictures.js), or its emoji if that's ever missing.
function BotAvatar({ seat, size }) {
  const picture = BOT_PICTURES[seat.picture]
  if (picture) {
    return (
      <span
        role="img"
        aria-label={seat.name}
        className="block rounded-full bg-ink bg-no-repeat ring-1 ring-brand-gold/60"
        style={{ width: size, height: size, backgroundImage: `url(${picture.src})`, backgroundSize: picture.size, backgroundPosition: picture.position }}
      />
    )
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#5C0E1F,#1A1024)] ring-1 ring-brand-gold/60"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden="true"
    >
      {seat.placeholder ?? '🤖'}
    </span>
  )
}

// How much of their turn is left, as a ring round the picture.
function TurnRing({ deadline, now, seconds, size }) {
  const left = Math.max(0, Math.min(1, (deadline - now) / (seconds * 1000)))
  const radius = size / 2 + 4
  const length = 2 * Math.PI * radius
  return (
    <svg className="pointer-events-none absolute -inset-1.5" width={size + 12} height={size + 12} viewBox={`0 0 ${size + 12} ${size + 12}`} aria-hidden="true">
      <circle cx={(size + 12) / 2} cy={(size + 12) / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <circle
        cx={(size + 12) / 2}
        cy={(size + 12) / 2}
        r={radius}
        fill="none"
        stroke={left < 0.25 ? '#C7253E' : '#FABC3F'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - left)}
        transform={`rotate(-90 ${(size + 12) / 2} ${(size + 12) / 2})`}
        style={{ transition: 'stroke-dashoffset 0.25s linear' }}
      />
    </svg>
  )
}

// One player round the table: picture, name, chips, what they last did,
// the dealer button, and a ring running down while it's their turn. It's
// placed by the middle of its picture (`place`), `size` wide.
export default function Seat({ seat, place, size, hand, now, mine }) {
  const reduce = useReducedMotion()
  const seconds = hand?.phase === 'draw' ? POKER.timers.drawSeconds : POKER.timers.actSeconds
  const dim = seat.folded || seat.leaving || !seat.inHand
  const winner = hand?.phase === 'done' && hand.results?.winners.some((winner) => winner.seat === seat.seat && winner.won > 0)
  return (
    <motion.div
      className="absolute z-10 flex -translate-x-1/2 flex-col items-center"
      style={{ left: place.x, top: place.y - size / 2, transition: glide(reduce, 'left', 'top') }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: dim && hand ? 0.6 : 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
    >
      <div className="relative">
        <div className={`rounded-full ${seat.isTurn ? 'shadow-[0_0_18px_rgba(250,188,63,0.8)]' : ''} ${winner ? 'shadow-[0_0_22px_rgba(74,222,128,0.85)]' : ''}`}>
          {seat.kind === 'bot' ? <BotAvatar seat={seat} size={size} /> : <MemberAvatar user={{ username: seat.name, avatarUrl: seat.avatarUrl }} size="md" />}
        </div>
        {seat.isTurn && hand?.deadline && <TurnRing deadline={hand.deadline} now={now} seconds={seconds} size={size} />}
        {seat.isDealer && (
          <span className="absolute -right-2 -bottom-1 grid size-5 place-items-center rounded-full border border-ink bg-[#FBF6EA] text-[10px] font-black text-ink shadow" title="Dealer">
            D
          </span>
        )}
        {!seat.connected && <span className="absolute -top-1 -left-2 rounded-full bg-black/80 px-1 text-[9px] text-white/80">away</span>}
      </div>
      <div className="mt-0.5 max-w-24 truncate rounded-md bg-black/65 px-1.5 text-center text-[11px] leading-4 font-semibold text-white">
        {mine ? 'You' : seat.name}
      </div>
      <div className="flex items-center gap-1">
        <ChipStack amount={seat.stack} size={12} label={false} />
        <span className="text-[11px] font-bold text-brand-gold tabular-nums">{seat.stack}</span>
      </div>
      {(seat.lastAction || seat.handLabel || seat.leaving) && (
        <div className={`mt-0.5 max-w-28 truncate rounded px-1 text-[10px] leading-4 ${seat.handLabel ? 'bg-brand-gold font-bold text-ink' : 'bg-white/10 text-white/80'}`}>
          {seat.leaving ? 'Left the table' : seat.handLabel ?? seat.lastAction}
        </div>
      )}
    </motion.div>
  )
}
