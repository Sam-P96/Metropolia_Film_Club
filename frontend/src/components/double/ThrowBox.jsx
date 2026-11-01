import { AnimatePresence, motion } from 'motion/react'
import useCountdown, { formatCountdown } from '../../hooks/useCountdown'
import { formatPoints } from '../../hooks/useDoubleOrNothing'
import CoinIcon from '../wallet/CoinIcon'
import ListStatus from './ListStatus'
import RoundMarkers from './RoundMarkers'
import ThrowIcon from './ThrowIcon'
import { GLASS } from './glass'
import { DOUBLE } from '../../../../shared/double/config.js'

const BOX = `${GLASS} p-5 sm:p-6`
const GOLD_BUTTON =
  'flex min-h-14 w-full cursor-pointer flex-col items-center justify-center rounded-xl bg-brand-gold px-6 text-lg font-bold text-ink shadow-[0_0_24px_rgba(250,188,63,0.3)] transition-[filter] hover:brightness-110 disabled:cursor-default disabled:opacity-40 disabled:shadow-none'
const LETTER = { win: 'W', draw: 'D', loss: 'L' }
const THROW_NAMES = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' }
const ROUND_WORDS = {
  win: { text: 'You win the round!', className: 'text-emerald-300' },
  draw: { text: 'A draw.', className: 'text-brand-gold' },
  loss: { text: 'You lose the round.', className: 'text-red-300' },
}

// Before a game: the button that bets the pot. It says why when it can't:
// not enough points, or someone else playing.
function StartPanel({ status, wallet, busy, notice, onStart }) {
  const bet = status.currentBet
  const fromPp = wallet ? Math.min(wallet.pp, bet) : 0
  let label = `Bet ${formatPoints(bet)} and Play`
  if (busy) label = 'Starting…'
  else if (status.potInUse) label = `${status.potInUse.name} is playing…`
  else if (!status.canAfford) label = `Not enough points for ${formatPoints(bet)}`

  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" onClick={onStart} disabled={busy || Boolean(status.potInUse) || !status.canAfford} className={GOLD_BUTTON}>
        {label}
        {!busy && !status.potInUse && status.canAfford && wallet && (
          <small className="text-xs font-medium opacity-75">
            {[fromPp && `${formatPoints(fromPp)} PP`, bet - fromPp && `${formatPoints(bet - fromPp)} P-PP`].filter(Boolean).join(' + ')}
          </small>
        )}
      </button>
      {!status.canAfford && !status.potInUse && (
        <p className="text-sm text-white/60">You have {formatPoints(status.wallet.pp + status.wallet.ppp)} points.</p>
      )}
      <p aria-live="polite" className="min-h-5 text-center text-sm font-medium text-brand-gold">
        {notice}
      </p>
    </div>
  )
}

// Mid-game: which round, the rounds so far, the time left to throw, the
// round just played (both throws, for a moment), and the three throws.
function PlayPanel({ game, reveal, busy, offset, onThrow }) {
  const left = useCountdown(new Date(game.roundDeadline).getTime() - offset)
  const results = game.rounds.map((round) => round.result)
  const round = reveal ? reveal.number : Math.min(game.rounds.length + 1, DOUBLE.rounds)
  const timeUp = left === 0 && !reveal
  const locked = busy || Boolean(reveal) || timeUp || game.status !== 'in_progress'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-white" aria-live="polite">
            Round {round} of {DOUBLE.rounds}
          </p>
          <RoundMarkers results={results} total={DOUBLE.rounds} />
        </div>
        {!reveal && game.status === 'in_progress' && (
          <p
            className={`rounded-lg border px-3 py-1.5 text-2xl font-bold tabular-nums ${
              left !== null && left <= 10000 ? 'border-brand-red/70 text-red-300' : 'border-white/20 text-white'
            }`}
            aria-label={`Time left to throw: ${left === null ? '' : Math.ceil(left / 1000)} seconds`}
          >
            {left === null ? '…' : formatCountdown(left)}
          </p>
        )}
      </div>

      <div className="min-h-24" aria-live="polite">
        <AnimatePresence mode="wait">
          {reveal ? (
            <motion.div
              key={`reveal-${reveal.number}`}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3"
            >
              <div className="flex items-center gap-4 text-white">
                <span className="flex flex-col items-center gap-1 text-xs text-white/60">
                  <ThrowIcon hand={reveal.round.playerThrow} size={36} className="text-white" />
                  You: {THROW_NAMES[reveal.round.playerThrow]}
                </span>
                <span className="text-sm font-bold text-white/40">vs</span>
                <span className="flex flex-col items-center gap-1 text-xs text-white/60">
                  <ThrowIcon hand={reveal.round.houseThrow} size={36} className="text-white" />
                  House: {THROW_NAMES[reveal.round.houseThrow]}
                </span>
              </div>
              <p className={`text-base font-bold ${ROUND_WORDS[reveal.round.result].className}`}>
                {ROUND_WORDS[reveal.round.result].text}
              </p>
            </motion.div>
          ) : timeUp ? (
            <motion.p key="time-up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center text-sm text-white/70">
              Time&apos;s up. The server is throwing for you…
            </motion.p>
          ) : (
            <motion.p key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center text-sm text-white/60">
              {busy ? 'The house is throwing…' : 'Pick your throw. The house throws after you.'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {DOUBLE.throws.map((hand) => (
          <motion.button
            key={hand}
            type="button"
            onClick={() => onThrow(hand)}
            disabled={locked}
            whileTap={{ scale: 0.94 }}
            className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-white/15 bg-white/5 text-white transition-colors hover:border-brand-gold/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold disabled:cursor-default disabled:opacity-40 disabled:hover:border-white/15"
          >
            <ThrowIcon hand={hand} size={40} />
            <span className="text-sm font-semibold">{THROW_NAMES[hand]}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// How their game ended, until they press Done.
function ResultPanel({ result, onDone }) {
  const went = result.results.map((r) => LETTER[r]).join(', ')
  const looks = {
    win: { title: 'You won!', className: 'border-emerald-400/60 bg-emerald-500/10', titleClass: 'text-emerald-300' },
    ban: { title: 'The Ban List', className: 'border-brand-red/60 bg-brand-red/10', titleClass: 'text-red-300' },
    wait: { title: 'The Waiting List', className: 'border-dashed border-brand-gold/60 bg-brand-gold/5', titleClass: 'text-brand-gold' },
  }[result.outcome]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col gap-3 rounded-xl border-2 p-5 ${looks.className}`}
      role="status"
    >
      <h3 className={`text-3xl font-bold ${looks.titleClass}`}>{looks.title}</h3>
      {result.timedOut && <p className="text-sm text-white/60">Time ran out, so the server threw for you.</p>}
      <p className="text-white/85">
        You went {went} on {formatPoints(result.bet)}.{' '}
        {result.outcome === 'win' && (
          <>
            You won <strong className="inline-flex items-center gap-1 text-brand-gold"><CoinIcon kind="ppp" size={16} /> {formatPoints(result.payout)} P-PP</strong>
            {result.bonusWon > 0 && (
              <>
                {' '}and the bonus pot: <strong className="text-brand-gold">{formatPoints(result.bonusWon)} P-PP</strong>
              </>
            )}
            . The pot is back to {formatPoints(result.newBet)}.
          </>
        )}
        {result.outcome === 'ban' &&
          `Your bet stays in the pot, which is now ${formatPoints(result.newBet)}. You're out until someone wins it, or the Monday 12:00 reset.`}
        {result.outcome === 'wait' &&
          `Your bet stays in the pot, which is now ${formatPoints(result.newBet)}. You sit out one turn: you're back as soon as someone else plays.`}
      </p>
      <button
        type="button"
        onClick={onDone}
        className="self-start rounded-md border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
      >
        Done
      </button>
    </motion.div>
  )
}

// "Your throw": starting a game, playing it, and how it ended. While
// they're on the Ban List or the Waiting List, a box saying which, instead.
export default function ThrowBox({ play, wallet }) {
  const { status, game, reveal, result, notice, busy, offset, start, throwHand, dismissResult } = play

  if (!result && !game && status.status !== 'AVAILABLE') {
    return <ListStatus status={status.status} currentBet={status.currentBet} />
  }

  return (
    <section className={BOX} aria-labelledby="your-throw">
      <h2 id="your-throw" className="mb-4 text-xs tracking-widest text-white/50 uppercase">
        Your throw
      </h2>
      {result ? (
        <ResultPanel result={result} onDone={dismissResult} />
      ) : game ? (
        <PlayPanel game={game} reveal={reveal} busy={busy} offset={offset} onThrow={throwHand} />
      ) : (
        <StartPanel status={status} wallet={wallet} busy={busy} notice={notice} onStart={start} />
      )}
    </section>
  )
}
