import { useState } from 'react'
import { Link } from 'react-router-dom'
import CoinIcon from '../wallet/CoinIcon'
import { BOT_MODE, BOT_NAME, BOT_STAKE, WINNING_SCORES, botPrize, formatPoints } from '../../../../shared/farkle/rules.js'

const CARD = 'rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
const QUICK_STAKES = [10, 50, 100, 250, 500]

const choiceClasses = (on) =>
  `cursor-pointer rounded-xl border px-3 py-2 text-sm tabular-nums transition-colors disabled:cursor-default disabled:opacity-40 ${
    on ? 'border-brand-gold bg-brand-gold font-bold text-ink' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
  }`

// Before a game against the bot: what to play to and for how much, what a
// win pays, and which coins the stake comes out of (PP first, then P-PP,
// as utils/wallet.js spends it). `wallet` is from useWallet, null while it
// loads. `onStart({ target, stake })` returns a promise that rejects with
// the server's reason if the game can't start. `initial` is the last
// game's { target, stake }, for Play again.
export default function StakePicker({ wallet, onStart, initial }) {
  const [target, setTarget] = useState(initial?.target ?? 4000)
  const [stakeText, setStakeText] = useState(String(initial?.stake ?? 100))
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const balance = wallet ? wallet.pp + wallet.ppp : null
  const max = balance === null ? BOT_STAKE.max : Math.min(BOT_STAKE.max, balance)
  const stake = Number(stakeText)
  const whole = stakeText !== '' && Number.isInteger(stake)
  const valid = whole && stake >= BOT_STAKE.min && stake <= max

  // Why Start is greyed out, if it is.
  let hint = ''
  if (!whole) hint = 'A stake is a whole number of points.'
  else if (stake < BOT_STAKE.min) hint = `The smallest stake is ${BOT_STAKE.min}.`
  else if (stake > BOT_STAKE.max) hint = `Stakes against ${BOT_NAME} go up to ${BOT_STAKE.max}.`
  else if (balance !== null && stake > balance) hint = `You have ${formatPoints(balance)} points.`

  const fromPp = wallet && valid ? Math.min(wallet.pp, stake) : 0
  const fromPpp = valid ? stake - fromPp : 0
  const prize = valid ? botPrize(stake) : 0

  const handleStart = async () => {
    setStarting(true)
    setError('')
    try {
      await onStart({ target, stake })
    } catch (startError) {
      setError(startError.message)
      setStarting(false)
    }
  }

  if (balance !== null && balance < BOT_STAKE.min) {
    return (
      <section className={CARD}>
        <h2 className="font-['Cinzel'] text-xl text-brand-gold">{BOT_MODE}</h2>
        <p className="mt-2 text-white/80">
          You need at least {BOT_STAKE.min} points to play. PP is paid every day at 12:00: 1 for each review you've written.
        </p>
        <Link to="/wallet" className="mt-3 inline-block text-brand-gold underline underline-offset-4">
          Your wallet
        </Link>
      </section>
    )
  }

  return (
    <section className={CARD} aria-labelledby="stake-heading">
      <h2 id="stake-heading" className="font-['Cinzel'] text-xl text-brand-gold">
        {BOT_MODE}
      </h2>

      <fieldset className="mt-4">
        <legend className="mb-2 text-xs uppercase tracking-widest text-white/60">Play to</legend>
        <div className="flex flex-wrap gap-2">
          {WINNING_SCORES.map((score) => (
            <button key={score} type="button" aria-pressed={target === score} onClick={() => setTarget(score)} className={choiceClasses(target === score)}>
              {formatPoints(score)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-xs uppercase tracking-widest text-white/60">Stake</legend>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={BOT_STAKE.min}
            max={max}
            step={1}
            value={stakeText}
            onChange={(event) => setStakeText(event.target.value)}
            aria-label="Stake in points"
            aria-describedby="stake-hint"
            className="w-24 rounded-xl border border-white/20 bg-ink/60 px-3 py-2 text-lg font-bold tabular-nums text-white focus-visible:outline-2 focus-visible:outline-brand-gold"
          />
          {QUICK_STAKES.map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={amount > max}
              aria-pressed={stake === amount}
              onClick={() => setStakeText(String(amount))}
              className={choiceClasses(stake === amount)}
            >
              {amount}
            </button>
          ))}
        </div>
        <p id="stake-hint" className="mt-2 min-h-5 text-sm text-red-300">
          {hint}
        </p>
      </fieldset>

      {valid && (
        <div className="mt-3 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60">If you win</div>
            <div className="mt-1 flex items-center gap-1.5 text-lg font-bold tabular-nums text-brand-gold">
              <CoinIcon kind="ppp" /> {formatPoints(prize)} P-PP
            </div>
            <div className="text-white/60">Your {formatPoints(stake)} back, plus {formatPoints(prize - stake)}.</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60">Paid with</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-bold tabular-nums text-white">
              {fromPp > 0 && (
                <span className="flex items-center gap-1.5">
                  <CoinIcon kind="pp" /> {formatPoints(fromPp)} PP
                </span>
              )}
              {fromPpp > 0 && (
                <span className="flex items-center gap-1.5">
                  <CoinIcon kind="ppp" /> {formatPoints(fromPpp)} P-PP
                </span>
              )}
            </div>
            <div className="text-white/60">If you lose, it's gone.</div>
          </div>
        </div>
      )}

      <ul className="mt-4 flex list-disc flex-col gap-1 pl-5 text-sm text-white/70">
        <li>{BOT_NAME} always rolls first.</li>
        <li>Three days without a move and you lose the game.</li>
      </ul>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={!valid || starting || !wallet}
        className="mt-5 flex min-h-14 w-full cursor-pointer items-center justify-center rounded-xl bg-brand-gold px-3 text-lg font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-40"
      >
        {starting ? 'Starting…' : valid ? `Play for ${formatPoints(stake)}` : 'Play'}
      </button>
    </section>
  )
}
