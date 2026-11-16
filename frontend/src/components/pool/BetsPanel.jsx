import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import MemberAvatar from '../profile/MemberAvatar'
import CoinIcon from '../wallet/CoinIcon'
import { HEADING } from './PoolChrome'
import { getPoolBets, placePoolBet, takePoolBet, withdrawPoolBet } from '../../services/pool'
import { walletChanged } from '../../services/wallet'
import { formatPoints } from '../../../../shared/pool/rules.js'

const QUICK = [10, 50, 100, 500, 1000]
const BUTTON = 'min-h-10 cursor-pointer rounded-xl px-3 py-1.5 text-sm font-bold transition disabled:cursor-default disabled:opacity-40'
const choice = (on) =>
  `cursor-pointer rounded-xl border px-3 py-2 text-sm tabular-nums transition-colors ${on ? 'border-[#ff4d8d] bg-[#ff4d8d]/20 font-bold text-white' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`

// One bet in the list, with what can be done about it from here: take it
// back (yours, while nobody's taken it), take the other side (someone
// else's, if you can bet), or how it went.
function BetRow({ bet, names, canBet, busy, onTake, onWithdraw }) {
  const backed = names[bet.side]
  const other = names[1 - bet.side]
  const amount = formatPoints(bet.amount)

  let state
  if (bet.status === 'open') {
    if (bet.mine === 'bettor') {
      state = (
        <button type="button" disabled={busy} onClick={() => onWithdraw(bet)} className={`${BUTTON} border border-white/20 bg-white/5 text-white hover:bg-white/10`}>
          Take it back
        </button>
      )
    } else if (canBet) {
      state = (
        <button type="button" disabled={busy} onClick={() => onTake(bet)} className={`${BUTTON} bg-gradient-to-r from-[#c2185b] to-[#7b2ff7] text-white hover:brightness-110`}>
          Take it: back {other}
        </button>
      )
    } else state = <span className="text-xs text-white/50">Waiting for someone to back {other}</span>
  } else if (bet.status === 'matched') {
    state = (
      <span className="text-xs font-semibold text-emerald-300">
        On: {bet.taker?.username ?? 'someone'} backs {other}
      </span>
    )
  } else if (bet.status === 'settled') {
    const winner = bet.won === 'bettor' ? bet.bettor : bet.taker
    state = (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-gold">
        {winner?.username ?? 'Someone'} won <CoinIcon kind="ppp" size={13} /> {formatPoints(bet.amount * 2)} P-PP
      </span>
    )
  } else state = <span className="text-xs text-white/50">Nobody took it: handed back</span>

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-2.5 text-center sm:flex-row sm:justify-between sm:text-left ${
        bet.mine ? 'border-[#a35bff]/50 bg-[#a35bff]/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <MemberAvatar user={bet.bettor} size="sm" />
        <span className="min-w-0 text-sm text-white/90">
          <span className="font-semibold">{bet.mine === 'bettor' ? 'You' : bet.bettor.username}</span> bet{' '}
          <span className="font-bold text-white tabular-nums">{amount}</span> on <span className="font-semibold text-[#ff9ec7]">{backed}</span>
        </span>
      </span>
      {state}
    </motion.li>
  )
}

// The crowd's bets on a game between members (backend/utils/poolBets.js),
// on its page, for everyone there to see. Members watching can back a
// player; it goes through when someone else backs the other one for the
// same, and until then they can take it back. Nobody takes it: it's handed
// back when the game ends. The players see the bets, but can't make them.
// `names`: the two players' names by seat; `changed` goes up whenever
// Play Live hears the bets changed.
export default function BetsPanel({ matchId, names, changed, over }) {
  const [data, setData] = useState(null)
  const [side, setSide] = useState(null)
  const [amountText, setAmountText] = useState('50')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let stopped = false
    getPoolBets(matchId)
      .then((answer) => !stopped && setData(answer))
      .catch(() => {})
    return () => {
      stopped = true
    }
  }, [matchId, changed, over])

  if (!data) return null
  const { bets, canBet, maxBet } = data
  if (!canBet && bets.length === 0) return null

  const run = async (work) => {
    setBusy(true)
    setError('')
    try {
      setData(await work())
      walletChanged()
    } catch (betError) {
      setError(betError.message)
      getPoolBets(matchId).then(setData).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  const amount = Number(amountText)
  const amountOk = Number.isInteger(amount) && amount >= 1 && amount <= maxBet

  return (
    <section aria-labelledby="pool-bets" className="flex flex-col gap-4 rounded-2xl border border-[#a35bff]/30 bg-[#170b18]/75 p-5 shadow-[0_0_40px_rgba(163,91,255,0.15)] backdrop-blur-md">
      <div className="text-center">
        <h2 id="pool-bets" className={HEADING}>
          The crowd&apos;s bets
        </h2>
        <p className="mt-1 text-sm text-white/60">
          {canBet
            ? 'Back a player. Your bet goes through when someone backs the other one for the same, and whoever backed the winner takes both, in P-PP. Until then you can take it back, and if nobody takes it, you get it back when the game ends.'
            : over
              ? 'How the bets on this game went.'
              : 'Members watching are betting on this game.'}
        </p>
      </div>

      {canBet && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="grid w-full grid-cols-2 gap-2" role="group" aria-label="Who you're backing">
            {names.map((name, seat) => (
              <button key={seat} type="button" aria-pressed={side === seat} onClick={() => setSide(seat)} className={`${choice(side === seat)} truncate`}>
                {name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK.map((value) => (
              <button key={value} type="button" aria-pressed={amount === value} onClick={() => setAmountText(String(value))} className={choice(amount === value)}>
                {formatPoints(value)}
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxBet}
              value={amountText}
              onChange={(event) => setAmountText(event.target.value.replace(/[^\d]/g, ''))}
              aria-label="Bet amount"
              className="w-24 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-center text-sm text-white tabular-nums"
            />
          </div>
          <button
            type="button"
            disabled={busy || side === null || !amountOk}
            onClick={() => run(() => placePoolBet(matchId, { side, amount }))}
            className="min-h-11 w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#c2185b] to-[#7b2ff7] px-4 font-bold text-white shadow-[0_0_24px_rgba(194,24,91,0.35)] transition hover:brightness-110 disabled:cursor-default disabled:opacity-40 sm:w-auto"
          >
            {side === null ? 'Pick a player' : `Bet ${amountOk ? formatPoints(amount) : ''} on ${names[side]}`}
          </button>
          <p className="text-xs text-white/50">Up to {formatPoints(maxBet)} a bet. It&apos;s taken from your wallet now, PP first.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-red-300">
          {error}
        </p>
      )}

      {bets.length > 0 ? (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {bets.map((bet) => (
              <BetRow
                key={bet._id}
                bet={bet}
                names={names}
                canBet={canBet}
                busy={busy}
                onTake={(it) => run(() => takePoolBet(it._id))}
                onWithdraw={(it) => run(() => withdrawPoolBet(it._id))}
              />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="text-center text-sm text-white/50">No bets yet. Be the first.</p>
      )}
    </section>
  )
}
