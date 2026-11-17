import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import BetControls from '../components/crash/BetControls'
import CashOutButton from '../components/crash/CashOutButton'
import CrashPage, { CARD, CRASH_BACKDROP, CrashTitle, HEADING } from '../components/crash/CrashChrome'
import CrashStage from '../components/crash/CrashStage'
import RoundSummary from '../components/crash/RoundSummary'
import { saveBet, savedBet } from '../components/crash/betMemory'
import { FrameBackdrop } from '../components/GameBackdrop'
import MemberAvatar from '../components/profile/MemberAvatar'
import { GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import useCrash from '../hooks/useCrash'
import useGameFrame from '../hooks/useGameFrame'
import { devResetCrashDay } from '../services/crash'
import { getCurrentUserId } from '../utils/currentUser'
import { CRASH_RULES, autoTarget, blockedFor, playsLine } from '../../../shared/crash/rules.js'

const autoOf = (value) => (value.autoOn ? autoTarget(value.autoText) : null)

// A message from the server (sent back to the lobby, a bet that couldn't be
// taken), until it's dismissed.
function Notice({ text, onClose }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-[#FFD76A]/50 bg-[#2a2006]/90 px-4 py-2.5 text-sm text-white shadow-lg"
        >
          <p className="flex-1">{text}</p>
          <button type="button" onClick={onClose} className="cursor-pointer text-white/60 hover:text-white" aria-label="Dismiss">
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Developer tool: only in the Vite dev server (import.meta.env.DEV), and the
// server only answers on your own computer (backend/middleware/devTools.js).
function DevReset() {
  const [said, setSaid] = useState('')
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() =>
          devResetCrashDay()
            .then(() => setSaid("Today's rounds are back to 6 (3 solo)."))
            .catch((error) => setSaid(error.message))
        }
        className="rounded-lg border border-sky-400/50 bg-sky-950/40 px-3 py-1.5 text-sm font-semibold text-sky-200 hover:border-sky-300 hover:text-white"
      >
        Dev: reset today&apos;s rounds
      </button>
      {said && <span className="text-xs text-sky-200">{said}</span>}
    </div>
  )
}

function HowItWorks() {
  return (
    <details className={`${CARD} text-sm text-white/80`}>
      <summary className="cursor-pointer text-center font-semibold text-white">How it works</summary>
      <div className="mt-3 flex flex-col gap-2">
        <p>
          Every round starts at 0.99x and moves up and down like a stock chart, live, until it crashes to 0, hits 25x, or runs for 60 seconds. Cash out
          whenever you like: you get your bet times the multiplier at that moment (whole points, rounded down), even under 1x. If it crashes first, the
          bet is gone. At 25x, or after 60 seconds, everyone still in is cashed out automatically.
        </p>
        <p>
          Set an auto cash-out and the server cashes you out the moment it reaches your target, even if your page has closed. Bets take PP first, then
          P-PP; your stake comes back in the same coins, and anything above it is P-PP.
        </p>
        <p>
          You can bet up to a quarter of your daily PP. Six rounds a day, from 12:00: at most three of them solo (alone, or a room of 2 or 3). A room of
          four plays a bonus round, which only counts towards the six.
        </p>
      </div>
    </details>
  )
}

// One open room in the lobby.
function RoomCard({ room, onJoin, busy, disabled }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <ul className="flex flex-wrap gap-3">
        {room.players.map((player) => (
          <li key={player.userId} className="flex items-center gap-2">
            <span className="relative">
              <MemberAvatar user={player.user} size="sm" />
              {player.ready && (
                <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-[#1FD18B] text-[10px] font-bold text-black" aria-label="Ready">
                  ✓
                </span>
              )}
            </span>
            <span className="max-w-28 truncate text-sm text-white">{player.user?.username}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className={`text-sm font-semibold tabular-nums ${room.players.length >= CRASH_RULES.roomSize ? 'text-[#FFD76A]' : 'text-white/70'}`}>
          {room.players.length}/{CRASH_RULES.roomSize} players
        </span>
        {room.playing && <span className="rounded-full bg-[#1FD18B]/20 px-2 py-0.5 text-xs font-semibold text-[#B8FFE0]">Playing</span>}
        <button type="button" onClick={onJoin} disabled={busy || disabled || room.full} className={`${GOLD_BUTTON} min-h-10`}>
          {room.full ? 'Full' : 'Join'}
        </button>
      </div>
    </li>
  )
}

// The lobby: today's plays, the open rooms, a new one, and playing alone
// when every room is full.
function Lobby({ game, value, onValue }) {
  const { me, lobby, connected } = game
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (work) => {
    setBusy(true)
    setError('')
    try {
      await work()
    } catch (problem) {
      setError(problem.message)
    } finally {
      setBusy(false)
    }
  }

  const roomsFull = lobby.length >= CRASH_RULES.maxRooms
  const everyRoomFull = roomsFull && lobby.every((room) => room.full)
  const soloBlocked = me ? blockedFor(me, value.bet, 1) : null

  return (
    <CrashPage
      subtitle="The multiplier climbs and dips like a stock chart until it crashes. Cash out before it does: alone, or in a room of up to four."
      aside={
        me && (
          <p className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-semibold text-white/85 tabular-nums">
            {playsLine(me.used)} · bets up to {me.maxBet}
          </p>
        )
      }
    >
      <Notice text={game.notice} onClose={game.clearNotice} />
      {!connected && <p className="text-center text-sm text-white/60">Connecting…</p>}
      {me && me.dailyPp < 1 && <p className={`${CARD} text-center text-white/80`}>Write a review to play: your daily PP, and so your bets, come from your reviews.</p>}

      <section aria-labelledby="crash-rooms" className={`${CARD} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="crash-rooms" className={HEADING}>
            Rooms
          </h2>
          <button type="button" onClick={() => run(game.create)} disabled={busy || !connected || roomsFull} className={`${GOLD_BUTTON} min-h-10`}>
            New room
          </button>
        </div>
        {roomsFull && <p className="-mt-2 text-sm text-white/55">{CRASH_RULES.maxRooms} rooms is the most at once: join one, or wait for one to close.</p>}
        {lobby.length === 0 ? (
          <p className="text-center text-sm text-white/55">No rooms yet. Start one: you can play on your own in it, or wait for others.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lobby.map((room) => (
              <RoomCard key={room.id} room={room} busy={busy} disabled={!connected} onJoin={() => run(() => game.join(room.id))} />
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="text-center text-sm text-red-300">
            {error}
          </p>
        )}
      </section>

      {everyRoomFull && me && me.left.solo > 0 && (
        <section aria-labelledby="crash-alone" className={`${CARD} flex flex-col gap-4`}>
          <h2 id="crash-alone" className={HEADING}>
            Play alone
          </h2>
          <p className="-mt-2 text-sm text-white/60">Every room is full. Play a round on your own instead (a solo round).</p>
          <BetControls value={value} maxBet={me.maxBet} onChange={onValue} />
          <button
            type="button"
            onClick={() => run(() => game.solo(value.bet, autoOf(value)))}
            disabled={busy || !connected || Boolean(soloBlocked)}
            className={`${GOLD_BUTTON} min-h-12 text-lg`}
          >
            Play alone ({me.left.solo}/{CRASH_RULES.soloPerDay})
          </button>
          {soloBlocked && <p className="text-center text-sm text-white/60">{soloBlocked}</p>}
        </section>
      )}

      <HowItWorks />
      {import.meta.env.DEV && <DevReset />}
    </CrashPage>
  )
}

// In a room: the game screen, filling what's under the nav bar without
// scrolling, on a phone too. The chart on top; under it, the cash-out
// button while you're riding, or the next round's bet, Ready, and playing
// alone.
function RoomScreen({ game, myId, value, onValue }) {
  const frame = useGameFrame()
  const { room, round, me, live } = game
  const displayRef = useRef({ m: 1 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const mine = room.players.find((player) => player.userId === myId)
  const liveRound = round && (round.status === 'starting' || round.status === 'playing') ? round : null
  const riding = liveRound?.players.find((player) => player.userId === myId)
  const stillIn = riding && riding.cashedAt === null
  const size = room.private ? 1 : room.players.length
  const blocked = blockedFor(me, value.bet, size)
  const bonus = !room.private && room.players.length >= CRASH_RULES.bonusPlayers

  const run = async (work) => {
    setBusy(true)
    setError('')
    try {
      await work()
    } catch (problem) {
      setError(problem.message)
    } finally {
      setBusy(false)
    }
  }

  // A new bet after readying un-readies (the server does it too).
  const changeBet = (next) => {
    onValue(next)
    if (mine?.ready) game.setBet(next.bet, autoOf(next)).catch((problem) => setError(problem.message))
  }

  const cashOut = () => run(game.cashOut)
  const cashOutRef = useRef(cashOut)
  useEffect(() => {
    cashOutRef.current = cashOut
  })
  // Space cashes out, unless you're typing.
  useEffect(() => {
    if (!stillIn || round?.status !== 'playing') return
    const onKey = (event) => {
      if (event.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)) return
      event.preventDefault()
      cashOutRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stillIn, round?.status])

  let panel
  if (liveRound && stillIn) {
    panel =
      liveRound.status === 'playing' ? (
        <CashOutButton bet={riding.bet} displayRef={displayRef} onCashOut={cashOut} busy={busy} />
      ) : (
        <p className="py-4 text-center font-['Bebas_Neue'] text-3xl tracking-wide text-white">Bets are in. Get ready…</p>
      )
  } else if (liveRound && riding) {
    panel = (
      <p className="py-3 text-center text-white">
        You cashed out at <strong className="text-[#B8FFE0]">{riding.cashedAt.toFixed(2)}x</strong>: <strong className="text-[#FFD76A]">{riding.payout}</strong> back.
        Watching the rest…
      </p>
    )
  } else if (liveRound) {
    panel = <p className="py-3 text-center text-white/75">A round is on. You&apos;re in the next one.</p>
  } else {
    panel = (
      <>
        {room.last && <RoundSummary summary={room.last} myId={myId} />}
        {!room.private && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <ul className="flex gap-2">
              {room.players.map((player) => (
                <li key={player.userId} className="relative" title={`${player.user?.username}: bet ${player.bet}${player.ready ? ', ready' : ''}`}>
                  <span className={player.ready ? '' : 'opacity-60'}>
                    <MemberAvatar user={player.user} size="sm" />
                  </span>
                  {player.ready && (
                    <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-[#1FD18B] text-[10px] font-bold text-black" aria-label="Ready">
                      ✓
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className={`text-sm font-semibold ${bonus ? 'text-[#FFD76A]' : 'text-white/70'}`}>
              {bonus
                ? `${CRASH_RULES.bonusPlayers}/${CRASH_RULES.bonusPlayers} players: a bonus round`
                : `${room.players.length}/${CRASH_RULES.bonusPlayers} players: ${CRASH_RULES.bonusPlayers - room.players.length} more for a bonus round`}
            </p>
          </div>
        )}
        <BetControls value={value} maxBet={me?.maxBet ?? 1} onChange={changeBet} disabled={busy} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => run(() => game.ready(!mine?.ready, value.bet, autoOf(value)))}
            disabled={busy || (!mine?.ready && Boolean(blocked))}
            className={`${mine?.ready ? QUIET_BUTTON : GOLD_BUTTON} min-h-12 flex-1 text-lg`}
          >
            {mine?.ready ? 'Ready ✓ (cancel)' : room.private ? 'Play again' : room.players.length === 1 ? 'Ready: start' : 'Ready'}
          </button>
          {!room.private && me && me.left.solo > 0 && (
            <button type="button" onClick={() => run(() => game.solo(value.bet, autoOf(value)))} disabled={busy || Boolean(blockedFor(me, value.bet, 1))} className={`${QUIET_BUTTON} min-h-12`}>
              Play alone ({me.left.solo}/{CRASH_RULES.soloPerDay})
            </button>
          )}
        </div>
        {!mine?.ready && blocked && <p className="text-center text-sm text-white/65">{blocked}</p>}
        {mine?.ready && room.players.length > 1 && <p className="text-center text-sm text-white/60">Waiting for everyone to be ready…</p>}
      </>
    )
  }

  return (
    <>
      <FrameBackdrop top={frame.top} to={CRASH_BACKDROP} className="z-39" />
      <div className="fixed inset-x-0 z-40 flex flex-col overflow-hidden bg-[#04140F]" style={{ top: frame.top, height: frame.height }}>
        <header className="flex shrink-0 items-center gap-2 px-3 py-1.5">
          <button
            type="button"
            onClick={() => run(game.leave)}
            disabled={busy || Boolean(stillIn)}
            title={stillIn ? 'Cash out, or ride it out, first' : undefined}
            className="cursor-pointer px-1 text-sm text-white/65 hover:text-white disabled:cursor-default disabled:opacity-40"
          >
            ← {room.private ? 'Lobby' : 'Leave'}
          </button>
          <h1 className="hidden font-['Bebas_Neue'] text-2xl leading-none tracking-wide text-white sm:block">
            <CrashTitle />
          </h1>
          <p className="min-w-0 flex-1 truncate text-center text-xs text-white/70 sm:text-sm">
            {!game.connected ? <span className="text-red-300">Reconnecting…</span> : room.private ? 'Playing alone' : bonus ? 'Bonus room' : 'Room'}
          </p>
          {me && <span className="shrink-0 text-xs font-semibold text-white/80 tabular-nums sm:text-sm">{playsLine(me.used)}</span>}
        </header>
        {(game.notice || error) && (
          <div className="shrink-0 px-3 pb-1">
            <Notice
              text={error || game.notice}
              onClose={() => {
                setError('')
                game.clearNotice()
              }}
            />
          </div>
        )}
        <div className="min-h-40 flex-1 px-2 sm:px-4">
          <CrashStage round={round} live={live} myId={myId} displayRef={displayRef} idle={room.private ? 'Ready when you are' : 'Waiting for everyone to be ready'} />
        </div>
        <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-2 px-3 pt-2 pb-3">
          {panel}
          {import.meta.env.DEV && !liveRound && <DevReset />}
        </div>
      </div>
    </>
  )
}

// /games/crash: the lobby, or the room you're in. App.jsx sends logged-out
// visitors to log in first.
export default function Crash() {
  const game = useCrash()
  const myId = String(getCurrentUserId())
  const [value, setValue] = useState(savedBet)
  useEffect(() => saveBet(value), [value])

  return game.room ? <RoomScreen game={game} myId={myId} value={value} onValue={setValue} /> : <Lobby game={game} value={value} onValue={setValue} />
}
