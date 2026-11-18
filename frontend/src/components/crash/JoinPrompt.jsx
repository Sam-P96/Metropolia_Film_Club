import GlassBox from './GlassBox'
import useCountdown from '../../hooks/useCountdown'
import { CRASH_RULES, blockedFor, isProtected, playsLeft, roundsFor } from '../../../../shared/crash/rules.js'

// Someone pressed Start Game without everyone ready (backend:
// games/crash/rooms.js startGame), and you're ready: join the smaller game,
// or sit it out? Over the game screen, with the time left. No answer in
// time, and you sit it out: a smaller round can mean fewer rounds a day and
// no half back, so it's your call. `offer`: the room's ({ by, size,
// endsAt }), `starter` the member who pressed it, `me` where you stand
// today and `bet` your bet. `onAnswer(join)`.
export default function JoinPrompt({ offer, starter, me, bet, busy, onAnswer }) {
  const left = useCountdown(offer.endsAt)
  const seconds = left === null ? null : Math.min(CRASH_RULES.offerMs / 1000, Math.ceil(left / 1000))
  const size = offer.size
  const blocked = blockedFor(me, bet, size)

  return (
    <GlassBox title="Join a smaller game?">
      <p className="text-white/90">
        <strong className="text-white">{starter?.username ?? 'Someone'}</strong> wants to start without everyone: a round of up to {size} players.
      </p>
      <ul className="flex flex-col gap-1 text-sm text-white/75">
        <li>
          A round of {size} gets {roundsFor(size)} rounds a day: you&apos;ve {playsLeft(me?.used, size)} of them left.
        </li>
        <li>
          {isProtected(size)
            ? 'Protected: half of every loss back.'
            : `Not protected: half of every loss back takes ${CRASH_RULES.protectedPlayers} players.`}
        </li>
        <li>Your bet: {bet}. Fewer may join, so it can end up smaller still.</li>
      </ul>
      {blocked && <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{blocked}</p>}
      <p className="text-center font-['Bebas_Neue'] text-5xl leading-none text-[#FFD76A] tabular-nums" aria-live="off">
        {seconds ?? '–'}s
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAnswer(true)}
          disabled={busy || Boolean(blocked)}
          className="min-h-12 flex-1 cursor-pointer rounded-xl bg-brand-gold px-4 text-lg font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-40"
        >
          Join
        </button>
        <button
          type="button"
          onClick={() => onAnswer(false)}
          disabled={busy}
          className="min-h-12 flex-1 cursor-pointer rounded-xl border border-white/25 bg-white/5 px-4 text-lg font-semibold text-white transition hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
        >
          Sit out
        </button>
      </div>
      <p className="-mt-1 text-center text-xs text-white/55">No answer in time and you sit this one out, watching.</p>
    </GlassBox>
  )
}
