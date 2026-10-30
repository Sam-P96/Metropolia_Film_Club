import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CoinIcon from '../wallet/CoinIcon'
import TermsPicker from './TermsPicker'
import useCountdown from '../../hooks/useCountdown'
import { answerChallenge, getMatch } from '../../services/farkle'
import { walletChanged } from '../../services/wallet'
import { roughTimeLeft, stakeHint } from '../../utils/farkle'
import { formatPoints, pvpPrize } from '../../../../shared/farkle/rules.js'

const BUTTON = 'min-h-11 cursor-pointer rounded-xl px-4 py-2 font-bold transition disabled:cursor-default disabled:opacity-40'
const PRIMARY = `${BUTTON} bg-brand-gold text-ink hover:brightness-110`
const SECONDARY = `${BUTTON} border border-white/20 bg-white/5 text-white hover:border-brand-gold/60 hover:bg-white/10`
const QUIET = 'min-h-11 cursor-pointer px-2 text-sm text-white/60 underline underline-offset-4 hover:text-white disabled:cursor-default disabled:opacity-40'

// A Farkle challenge between members (match.status "challenge"), from the
// viewer's side. If it's waiting on them: the terms, then Accept, Counter
// (new terms back to the other player) and Decline. If it's waiting on the
// other player: the terms and Withdraw. Accepting goes to the game. It
// draws no box of its own: it sits in whatever card it's put in.
// `onChange(match)` gets the match after any answer, or as it is now if
// it had changed under them.
export default function ChallengeCard({ match, onChange }) {
  const navigate = useNavigate()
  const msLeft = useCountdown(match.expiresAt)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [countering, setCountering] = useState(false)
  const [target, setTarget] = useState(match.target)
  const [stakeText, setStakeText] = useState(String(Math.min(match.stake, match.counterMax ?? match.stake)))

  const them = match.players[1 - match.mySeat]
  const name = <Link to={`/users/${them._id}`} className="font-semibold text-white hover:text-brand-gold">{them.username}</Link>
  const countered = match.counters > 0
  const lowered = match.myAnswer && match.acceptStake < match.stake

  const answer = async (kind, terms = {}) => {
    setBusy(kind)
    setError('')
    try {
      const after = await answerChallenge(match._id, kind, { version: match.version, ...terms })
      if (kind === 'accept') {
        walletChanged()
        onChange?.(after)
        navigate(`/games/farkle/${match._id}`)
        return
      }
      setCountering(false)
      onChange?.(after)
    } catch (answerError) {
      setError(answerError.message)
      // It may have changed under them (answered elsewhere, expired): show it as it is now.
      if (answerError.status === 409) getMatch(match._id).then((now) => onChange?.(now)).catch(() => {})
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-lg text-white/90">
          {match.myAnswer ? (
            <>
              {name} {countered ? 'came back with new terms' : 'challenges you to Farkle'}
            </>
          ) : (
            <>
              {countered ? 'You sent new terms to' : 'You challenged'} {name}
            </>
          )}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-white/70">
          <span>First to {formatPoints(match.target)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatPoints(match.stake)} each</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            winner takes <CoinIcon kind="ppp" size={15} />
            <span className="font-bold text-brand-gold">{formatPoints(match.prize)} P-PP</span>
          </span>
        </p>
        <p className="mt-1 text-sm text-white/50">
          {msLeft > 0
            ? `${match.myAnswer ? 'Answer within' : 'They have'} ${roughTimeLeft(msLeft)}${match.myAnswer ? '' : ' to answer'}. Nothing is taken until it's accepted.`
            : 'Time is up for this challenge.'}
        </p>
        {lowered && (
          <p className="mt-2 text-sm text-amber-200">
            One of you has less than {formatPoints(match.stake)} right now, so accepting plays for {formatPoints(match.acceptStake)} each
            (winner takes {formatPoints(pvpPrize(match.acceptStake))} P-PP).
          </p>
        )}
      </div>

      {match.myAnswer ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => answer('accept')} disabled={Boolean(busy) || match.acceptStake < 1} className={PRIMARY}>
            {busy === 'accept' ? 'Starting…' : `Accept for ${formatPoints(match.acceptStake)}`}
          </button>
          <button type="button" onClick={() => setCountering(!countering)} disabled={Boolean(busy)} aria-expanded={countering} className={SECONDARY}>
            Counter
          </button>
          <button type="button" onClick={() => answer('decline')} disabled={Boolean(busy)} className={QUIET}>
            {busy === 'decline' ? 'Declining…' : 'Decline'}
          </button>
          <span className="w-full text-sm text-white/50">Whoever accepts rolls first.</span>
        </div>
      ) : (
        <div>
          <button type="button" onClick={() => answer('withdraw')} disabled={Boolean(busy)} className={QUIET}>
            {busy === 'withdraw' ? 'Taking it back…' : 'Withdraw challenge'}
          </button>
        </div>
      )}

      {countering && (
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <TermsPicker target={target} onTarget={setTarget} stakeText={stakeText} onStakeText={setStakeText} max={match.counterMax} />
          <button
            type="button"
            onClick={() => answer('counter', { target, stake: Number(stakeText) })}
            disabled={Boolean(busy) || Boolean(stakeHint(stakeText, match.counterMax)) || (target === match.target && Number(stakeText) === match.stake)}
            className={`${PRIMARY} self-start`}
          >
            {busy === 'counter' ? 'Sending…' : `Send these terms to ${them.username}`}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
