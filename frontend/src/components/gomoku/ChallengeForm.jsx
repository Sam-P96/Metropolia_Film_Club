import { useEffect, useState } from 'react'
import MemberAvatar from '../profile/MemberAvatar'
import MemberPicker from '../profile/MemberPicker'
import ResonanceIcon from '../resonance/ResonanceIcon'
import TermsPicker from './TermsPicker'
import { getGomokuStakeLimit, sendGomokuChallenge } from '../../services/gomoku'
import { termsHint } from '../../utils/gomoku'
import { DEFAULT_SIZE } from '../../../../shared/gomoku/rules.js'

// Challenging another member to Infinite Gomoku: find them by name (or
// pick a friend: `initialOpponent`), then the board and, For PP, the stake.
// `forFun` is which button brought them here. `onSent(match)` gets the new
// challenge.
export default function ChallengeForm({ forFun, initialOpponent = null, onSent }) {
  const [opponent, setOpponent] = useState(initialOpponent)
  const [max, setMax] = useState(null)
  const [size, setSize] = useState(DEFAULT_SIZE)
  const [stakeText, setStakeText] = useState('10')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // For PP: the most the two of them can play for.
  const showLimit = (limit) => {
    setMax(limit.max)
    setStakeText(String(Math.max(2, Math.min(10, limit.max))))
  }

  const pick = (member) => {
    setOpponent(member)
    setMax(null)
    setError('')
    if (!forFun) {
      getGomokuStakeLimit(member._id)
        .then(showLimit)
        .catch((limitError) => setError(limitError.message))
    }
  }

  // Opened on a friend. (The lobby gives each pick a fresh form.)
  useEffect(() => {
    if (!initialOpponent || forFun) return
    let stopped = false
    getGomokuStakeLimit(initialOpponent._id)
      .then((limit) => {
        if (stopped) return
        setMax(limit.max)
        setStakeText(String(Math.max(2, Math.min(10, limit.max))))
      })
      .catch((limitError) => !stopped && setError(limitError.message))
    return () => {
      stopped = true
    }
  }, [initialOpponent, forFun])

  const send = async () => {
    setSending(true)
    setError('')
    try {
      const match = await sendGomokuChallenge({ opponent: opponent._id, size, stake: forFun ? 0 : Number(stakeText) })
      setOpponent(null)
      onSent?.(match)
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  if (!opponent) return <MemberPicker label="Who do you want to play?" onPick={pick} />

  const ready = forFun || max !== null
  return (
    <div className="flex animate-slide-in flex-col gap-4 motion-reduce:animate-none">
      <div className="flex flex-wrap items-center gap-3">
        <MemberAvatar user={opponent} size="sm" />
        <span className="min-w-0 truncate text-lg font-semibold text-white">{opponent.username}</span>
        <ResonanceIcon userId={opponent._id} className="-ml-1.5" />
        <button type="button" onClick={() => setOpponent(null)} className="cursor-pointer text-sm text-brand-gold underline underline-offset-4">
          Someone else
        </button>
      </div>

      {!ready ? (
        !error && <p className="text-sm text-white/50">Checking what you can play for…</p>
      ) : (
        <>
          <TermsPicker forFun={forFun} size={size} onSize={setSize} stakeText={stakeText} onStakeText={setStakeText} max={max} />
          <button
            type="button"
            onClick={send}
            disabled={sending || Boolean(termsHint(forFun, stakeText, max))}
            className="min-h-12 cursor-pointer rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-40"
          >
            {sending ? 'Sending…' : `Challenge ${opponent.username}${forFun ? ' for fun' : ''}`}
          </button>
          <p className="text-sm text-white/50">
            {forFun ? '' : 'Nothing is taken until they accept. '}They have three days to accept, decline or send new terms back, and whoever accepts
            moves first, so you&apos;ll move second.
          </p>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
