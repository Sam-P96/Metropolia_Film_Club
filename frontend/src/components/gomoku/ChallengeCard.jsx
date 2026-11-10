import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CoinIcon from '../wallet/CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import ResonanceIcon from '../resonance/ResonanceIcon'
import TermsPicker from './TermsPicker'
import useCountdown from '../../hooks/useCountdown'
import { answerGomokuChallenge, getGomokuMatch } from '../../services/gomoku'
import { walletChanged } from '../../services/wallet'
import { roughTimeLeft } from '../../utils/farkle'
import { boardName, termsHint } from '../../utils/gomoku'
import { GAME_NAME, MIN_STAKE, formatPoints, prizeFor } from '../../../../shared/gomoku/rules.js'

const BUTTON = 'min-h-11 cursor-pointer rounded-xl px-4 py-2 font-bold transition disabled:cursor-default disabled:opacity-40'
const PRIMARY = `${BUTTON} bg-brand-gold text-ink hover:brightness-110`
const SECONDARY = `${BUTTON} border border-white/20 bg-white/5 text-white hover:border-brand-gold/60 hover:bg-white/10`
const QUIET = 'min-h-11 cursor-pointer px-2 text-sm text-white/60 underline underline-offset-4 hover:text-white disabled:cursor-default disabled:opacity-40'

// The terms in a line: the board, and For Fun or the stake and the prize.
export function Terms({ match }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{boardName(match.size)} board</span>
      <span aria-hidden="true">·</span>
      {match.forFun ? (
        <span className="font-semibold text-emerald-300">For Fun</span>
      ) : (
        <>
          <span>{formatPoints(match.stake)} each</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            winner takes <CoinIcon kind="ppp" size={15} />
            <span className="font-bold text-brand-gold">{formatPoints(match.prize)} P-PP</span>
          </span>
        </>
      )}
    </span>
  )
}

// An Infinite Gomoku challenge (status "challenge"), from the viewer's
// side, like Kino Farkle's. Waiting on them: the terms, then Accept,
// Counter (new terms back: the board, For Fun or For PP, the stake) and
// Decline. Waiting on the other player: the terms and Withdraw. Accepting
// goes to the game. `onChange(match)` gets the game after any answer.
export default function ChallengeCard({ match, onChange }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const msLeft = useCountdown(match.expiresAt)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [countering, setCountering] = useState(false)
  const [forFun, setForFun] = useState(match.forFun)
  const [size, setSize] = useState(match.size)
  const [stakeText, setStakeText] = useState(String(match.forFun ? Math.min(10, match.counterMax ?? 10) : Math.min(match.stake, match.counterMax ?? match.stake)))

  const them = match.players[1 - match.mySeat]
  const name = (
    <>
      <Link to={`/users/${them._id}`} className="font-semibold text-white hover:text-brand-gold">
        {them.username}
      </Link>
      <ResonanceIcon userId={them._id} className="ml-1" />
    </>
  )
  const countered = match.counters > 0
  const lowered = match.myAnswer && !match.forFun && match.acceptStake < match.stake
  const gamePath = `/games/gomoku/${match._id}`

  const answer = async (kind, terms = {}) => {
    setBusy(kind)
    setError('')
    try {
      const after = await answerGomokuChallenge(match._id, kind, { version: match.version, ...terms })
      if (kind === 'accept') {
        if (!after.forFun) walletChanged()
        onChange?.(after)
        if (pathname !== gamePath) navigate(gamePath)
        return
      }
      setCountering(false)
      onChange?.(after)
    } catch (answerError) {
      setError(answerError.message)
      if (answerError.status === 409) getGomokuMatch(match._id).then((now) => onChange?.(now)).catch(() => {})
    } finally {
      setBusy('')
    }
  }

  const counterTerms = { size, stake: forFun ? 0 : Number(stakeText) }
  const sameTerms = counterTerms.size === match.size && counterTerms.stake === match.stake

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <Link to={`/users/${them._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
          <MemberAvatar user={them} size="lg" />
        </Link>
        <div className="min-w-0">
          <p className="text-lg text-white/90">
            {match.myAnswer ? (
              <>
                {name} {countered ? 'came back with new terms' : `challenges you to ${GAME_NAME}`}
              </>
            ) : (
              <>
                {countered ? 'You sent new terms to' : 'You challenged'} {name}
              </>
            )}
          </p>
          <p className="mt-1 text-white/70">
            <Terms match={match} />
          </p>
          <p className="mt-1 text-sm text-white/50">
            {msLeft > 0
              ? `${match.myAnswer ? 'Answer within' : 'They have'} ${roughTimeLeft(msLeft)}${match.myAnswer ? '' : ' to answer'}.${match.forFun ? '' : " Nothing is taken until it's accepted."}`
              : 'Time is up for this challenge.'}
          </p>
          {lowered && (
            <p className="mt-2 text-sm text-amber-200">
              One of you has less than {formatPoints(match.stake)} right now, so accepting plays for {formatPoints(match.acceptStake)} each (winner
              takes {formatPoints(prizeFor(match.acceptStake))} P-PP).
            </p>
          )}
        </div>
      </div>

      {match.myAnswer ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => answer('accept')}
            disabled={Boolean(busy) || (!match.forFun && match.acceptStake < 1)}
            className={PRIMARY}
          >
            {busy === 'accept' ? 'Starting…' : match.forFun ? 'Accept' : `Accept for ${formatPoints(match.acceptStake)}`}
          </button>
          <button type="button" onClick={() => setCountering(!countering)} disabled={Boolean(busy)} aria-expanded={countering} className={SECONDARY}>
            Counter
          </button>
          <button type="button" onClick={() => answer('decline')} disabled={Boolean(busy)} className={QUIET}>
            {busy === 'decline' ? 'Declining…' : 'Decline'}
          </button>
          <span className="w-full text-sm text-white/50">Whoever accepts moves first.</span>
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
          <TermsPicker
            canSwitch
            forFun={forFun}
            onForFun={setForFun}
            size={size}
            onSize={setSize}
            stakeText={stakeText}
            onStakeText={setStakeText}
            max={match.counterMax}
          />
          {!forFun && match.counterMax < MIN_STAKE && (
            <p className="text-sm text-white/60">One of you has fewer than {MIN_STAKE} points, so this one can only be For Fun.</p>
          )}
          <button
            type="button"
            onClick={() => answer('counter', counterTerms)}
            disabled={Boolean(busy) || Boolean(termsHint(forFun, stakeText, match.counterMax)) || sameTerms}
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
