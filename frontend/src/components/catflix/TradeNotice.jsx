import { Link } from 'react-router-dom'
import PetSprite from './PetSprite'
import { timeAgo } from '../../utils/timeAgo'

const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110'
const CARD = 'relative overflow-hidden rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
const RARITY = { common: '#e8e8e8', uncommon: '#5fd35a', rare: '#3fa8ff', epic: '#b45cff', legendary: '#ff9f2e' }

const points = (n) => `${(n ?? 0).toLocaleString('en-US')} PP`

// How long is left, roughly: "2 days", "5 hours", "a few minutes".
function timeLeft(until) {
  const ms = new Date(until).getTime() - Date.now()
  if (ms <= 0) return null
  const hours = Math.floor(ms / 3600000)
  if (hours >= 48) return `${Math.floor(hours / 24)} days`
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`
  return 'under an hour'
}

// One side of a trade: its card (alive) and points, or "Nothing".
function Side({ side, label }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-3 text-center">
      <span className="text-xs font-semibold tracking-widest text-white/50 uppercase">{label}</span>
      {side?.card ? (
        <>
          <PetSprite skinId={side.card} size={72} label={side.cardName} />
          <span className="max-w-full truncate font-semibold text-white">{side.cardName}</span>
          <span className="text-xs font-semibold capitalize" style={{ color: RARITY[side.rarity] ?? RARITY.common }}>
            {side.rarity}
          </span>
        </>
      ) : null}
      {side?.points > 0 && <span className="font-['Bebas_Neue'] text-2xl leading-none tracking-wide text-brand-gold">+ {points(side.points)}</span>}
      {!side && <span className="py-6 text-sm text-white/50">Their answer</span>}
    </div>
  )
}

// A Trade Spell notification (Catflix No Chill; backend/utils/catflix/trades.js),
// `actors[0]` the other member, `item.trade` the trade as you see it:
//   tradeOffer     they offered you a card: answer it (pinned while it waits)
//   tradeCounter   they answered your offer: take it or not (pinned)
//   tradeDone      they took your answer
//   tradeDeclined  they turned it down: what you put in is back
//   tradeExpired   nobody answered in time: what you put in is back
export default function TradeNotice({ item }) {
  const other = item.actors[0]
  const { trade } = item
  const name = (
    <Link to={`/users/${other._id}`} className="font-semibold text-white hover:text-brand-gold">
      {other.username}
    </Link>
  )
  const open = trade.status === 'offered' || trade.status === 'countered'
  const waiting = open && trade.yourTurn && (item.type === 'tradeOffer' || item.type === 'tradeCounter')
  const left = waiting ? timeLeft(trade.expiresAt) : null
  const yours = trade.mine ? trade.offer : trade.counter
  const theirs = trade.mine ? trade.counter : trade.offer

  const heading = {
    tradeOffer: 'Trade Spell: an offer',
    tradeCounter: 'Trade Spell: an answer',
    tradeDone: 'Trade Spell: done',
    tradeDeclined: 'Trade Spell: turned down',
    tradeExpired: 'Trade Spell: ran out of time',
  }[item.type]
  const line = {
    tradeOffer: <>{name} wants to trade you a card. Say what you’ll give for it: a card, a card and PP, or just PP.</>,
    tradeCounter: <>{name} answered your offer. Take the trade, or turn it down.</>,
    tradeDone: <>{name} took the trade: their side is in your Spell Deck and wallet.</>,
    tradeDeclined: <>{name} turned the trade down. What you put in is back.</>,
    tradeExpired: trade.mine ? <>{name} didn’t answer in time. What you put in is back.</> : <>{name} didn’t take your answer in time. What you put in is back.</>,
  }[item.type]
  const stillUp = item.type === 'tradeOffer' || item.type === 'tradeCounter'

  return (
    <article className={`${CARD} ${waiting ? 'shadow-[0_0_26px_rgba(255,191,71,0.30)]' : ''}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-['Bebas_Neue'] text-xl tracking-[0.15em] text-brand-gold">{heading}</h2>
        <span className="text-xs text-white/45">{timeAgo(item.at)}</span>
      </div>
      <p className="text-lg text-white/90">{line}</p>
      <div className="mt-3 flex items-stretch gap-3">
        <Side side={theirs} label={`${other.username} gives`} />
        <span aria-hidden="true" className="self-center text-2xl text-white/40">⇄</span>
        <Side side={yours} label="You give" />
      </div>
      {stillUp && !open && <p className="mt-3 text-sm text-white/55">This trade’s over.</p>}
      {waiting && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link to={`/games/catflix#trade=${trade.id}`} className={BUTTON}>
            {item.type === 'tradeOffer' ? 'Answer the offer' : 'Take a look'}
          </Link>
          {left && <span className="text-sm text-white/60">{left} left to {item.type === 'tradeOffer' ? 'answer' : 'take it'}</span>}
        </div>
      )}
    </article>
  )
}
