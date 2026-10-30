import { useState } from 'react'
import MemberAvatar from '../profile/MemberAvatar'
import MemberPicker from '../profile/MemberPicker'
import TermsPicker from './TermsPicker'
import { getStakeLimit, sendChallenge } from '../../services/farkle'
import { stakeHint } from '../../utils/farkle'

// Challenging another member: find them by name, then pick the winning
// score and the stake (up to what the poorer of the two has). Any member
// can be challenged, whatever their PvP setting. `onSent(match)` gets the
// new challenge.
export default function ChallengeForm({ onSent }) {
  const [opponent, setOpponent] = useState(null)
  const [max, setMax] = useState(null)
  const [target, setTarget] = useState(4000)
  const [stakeText, setStakeText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const pick = (member) => {
    setOpponent(member)
    setMax(null)
    setError('')
    getStakeLimit(member._id)
      .then((limit) => {
        setMax(limit.max)
        setStakeText(String(Math.min(100, limit.max)))
      })
      .catch((limitError) => setError(limitError.message))
  }

  const send = async () => {
    setSending(true)
    setError('')
    try {
      const match = await sendChallenge({ opponent: opponent._id, target, stake: Number(stakeText) })
      setOpponent(null)
      setMax(null)
      onSent?.(match)
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  if (!opponent) return <MemberPicker label="Who do you want to play?" onPick={pick} />

  return (
    <div className="flex animate-slide-in flex-col gap-4 motion-reduce:animate-none">
      <div className="flex flex-wrap items-center gap-3">
        <MemberAvatar user={opponent} size="sm" />
        <span className="min-w-0 truncate text-lg font-semibold text-white">{opponent.username}</span>
        <button type="button" onClick={() => setOpponent(null)} className="cursor-pointer text-sm text-brand-gold underline underline-offset-4">
          Someone else
        </button>
      </div>

      {max === null ? (
        !error && <p className="text-sm text-white/50">Checking what you can play for…</p>
      ) : (
        <>
          <TermsPicker target={target} onTarget={setTarget} stakeText={stakeText} onStakeText={setStakeText} max={max} />
          <button
            type="button"
            onClick={send}
            disabled={sending || Boolean(stakeHint(stakeText, max))}
            className="min-h-12 cursor-pointer rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-40"
          >
            {sending ? 'Sending…' : `Challenge ${opponent.username}`}
          </button>
          <p className="text-sm text-white/50">
            Nothing is taken until they accept. They have three days to accept, decline or send new terms back, and whoever
            accepts rolls first.
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
