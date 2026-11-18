import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import AllInOffer from '../components/crash/AllInOffer'
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
import useCountdown from '../hooks/useCountdown'
import useGameFrame from '../hooks/useGameFrame'
import { devResetCrashDay } from '../services/crash'
import { getCurrentUserId } from '../utils/currentUser'
import { CRASH_RULES, autoTarget, blockedFor, isProtected, playsLeft, playsLine, roundsFor } from '../../../shared/crash/rules.js'

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
            .then(() => setSaid("Today's rounds are back to none played."))
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
          You can bet up to a quarter of your daily PP. How many rounds you can play a day (from 12:00) goes by how many players a round starts with: 3
          alone, 6 with 2 players, 12 with 3, 24 with 4 and 25 with 5 or more. They all count together, so once you&apos;ve played 3 alone you can keep
          playing with others.
        </p>
        <p>
          A round of 5 or more players is protected: everyone who loses gets half of what they lost back (whole points, rounded down), crashed or cashed
          out under 1x.
        </p>
        <p>
          Rooms take up to {CRASH_RULES.roomSize} players. When everyone in a room is ready, the round starts. Otherwise the first one ready starts a{' '}
          {CRASH_RULES.readyMs / 1000} second countdown, and the round starts with whoever&apos;s ready when it ends: the rest watch, and play the next one.
        </p>
      </div>
    </details>
  )
}

// Rounds a day by the size of the round, and how many of each are left for
// them: the more players, the more rounds, and 5 or more are protected.
function RoundsPerDay({ used }) {
  return (
    <section aria-labelledby="crash-rounds" className={`${CARD} flex flex-col gap-3`}>
      <h2 id="crash-rounds" className={HEADING}>
        Rounds a day
      </h2>
      <p className="-mt-1 text-sm text-white/60">The more players in a round, the more you can play. 5 or more get half of every loss back.</p>
      <ul className="grid grid-cols-5 gap-2">
        {CRASH_RULES.roundsPerDay.map((rounds, index) => {
          const players = index + 1
          // The last box is 5 or more.
          const full = isProtected(players)
          const left = playsLeft(used, players)
          return (
            <li
              key={players}
              className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center ${
                full ? 'border-[#FFD76A]/70 bg-[#FFD76A]/10 shadow-[0_0_14px_rgba(255,215,106,0.25)]' : 'border-white/10 bg-white/5'
              } ${left < 1 ? 'opacity-50' : ''}`}
            >
              <span className="flex min-h-[2lh] items-end text-xs text-white/65 sm:min-h-0">
                {players === 1 ? 'Alone' : full ? `${players}+ players` : `${players} players`}
              </span>
              <span className={`font-['Bebas_Neue'] text-3xl leading-none tabular-nums ${full ? 'text-[#FFD76A]' : 'text-white'}`}>{rounds}</span>
              <span className="text-[11px] text-white/55 tabular-nums">{left} left</span>
              {full && <span className="text-[11px] font-semibold text-[#FFD76A]">½ losses back</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Pictures shown for a room before the rest are a "+N".
const ROOM_FACES = 12

// One open room in the lobby: names too while it's small.
function RoomCard({ room, onJoin, busy, disabled }) {
  const big = room.players.length > 4
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <ul className={`flex flex-wrap items-center ${big ? 'gap-1.5' : 'gap-3'}`}>
        {room.players.length > ROOM_FACES && <li className="order-last text-sm font-semibold text-white/60">+{room.players.length - ROOM_FACES}</li>}
        {room.players.slice(0, ROOM_FACES).map((player) => (
          <li key={player.userId} className="flex items-center gap-2" title={player.user?.username}>
            <span className="relative">
              <MemberAvatar user={player.user} size="sm" />
              {player.ready && (
                <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-[#1FD18B] text-[10px] font-bold text-black" aria-label="Ready">
                  ✓
                </span>
              )}
            </span>
            {!big && <span className="max-w-28 truncate text-sm text-white">{player.user?.username}</span>}
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
      subtitle={`The multiplier climbs and dips like a stock chart until it crashes. Cash out before it does: alone, or in a room of up to ${CRASH_RULES.roomSize}.`}
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
      {me && <RoundsPerDay used={me.used} />}

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

      {me?.allIn && (
        <section aria-label="An offer" className={CARD}>
          <AllInOffer me={me} busy={busy || !connected} onPlay={() => run(game.allIn)} />
        </section>
      )}

      {everyRoomFull && me && me.left.alone > 0 && (
        <section aria-labelledby="crash-alone" className={`${CARD} flex flex-col gap-4`}>
          <h2 id="crash-alone" className={HEADING}>
            Play alone
          </h2>
          <p className="-mt-2 text-sm text-white/60">Every room is full. Play a round on your own instead.</p>
          <BetControls value={value} maxBet={me.maxBet} onChange={onValue} />
          <button
            type="button"
            onClick={() => run(() => game.solo(value.bet, autoOf(value)))}
            disabled={busy || !connected || Boolean(soloBlocked)}
            className={`${GOLD_BUTTON} min-h-12 text-lg`}
          >
            Play alone ({me.left.alone}/{roundsFor(1)})
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
  const full = !room.private && isProtected(size)
  const countdown = useCountdown(room.countdownEndsAt)
  const startsIn = countdown === null ? null : Math.max(1, Math.ceil(countdown / 1000))
  // Ready ones first, then a "+N" past ROOM_FACES.
  const faces = [...room.players].sort((a, b) => Number(b.ready) - Number(a.ready))

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
            <ul className="flex flex-wrap items-center justify-center gap-1.5">
              {faces.slice(0, ROOM_FACES).map((player) => (
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
              {faces.length > ROOM_FACES && <li className="text-sm font-semibold text-white/60">+{faces.length - ROOM_FACES}</li>}
            </ul>
            <p className={`text-sm font-semibold ${full ? 'text-[#FFD76A]' : 'text-white/70'}`}>
              {full
                ? `${size}/${CRASH_RULES.roomSize} players: protected, half of every loss back`
                : `${size}/${CRASH_RULES.roomSize} players: ${roundsFor(size)} rounds a day. ${CRASH_RULES.protectedPlayers - size} more for ${roundsFor(CRASH_RULES.protectedPlayers)} and half of every loss back`}
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
          {!room.private && me && me.left.alone > 0 && (
            <button type="button" onClick={() => run(() => game.solo(value.bet, autoOf(value)))} disabled={busy || Boolean(blockedFor(me, value.bet, 1))} className={`${QUIET_BUTTON} min-h-12`}>
              Play alone ({me.left.alone}/{roundsFor(1)})
            </button>
          )}
        </div>
        {!mine?.ready && blocked && <p className="text-center text-sm text-white/65">{blocked}</p>}
        {me?.allIn && !mine?.ready && <AllInOffer me={me} busy={busy} compact onPlay={() => run(game.allIn)} />}
        {room.players.length > 1 &&
          (startsIn !== null ? (
            <p className="text-center text-sm font-semibold text-[#FFD76A] tabular-nums">
              {mine?.ready ? `Starting in ${startsIn}s with whoever's ready (or as soon as everyone is)` : `Round starts in ${startsIn}s: ready up to play`}
            </p>
          ) : (
            mine?.ready && <p className="text-center text-sm text-white/60">Waiting for everyone to be ready…</p>
          ))}
      </>
    )
  }

  return (
    <>
      <FrameBackdrop top={frame.top} to={CRASH_BACKDROP} className="z-39" />
      {/* Fits the screen when it can; on a short phone it scrolls, from a
          finger anywhere on it, the chart included. */}
      <div className="fixed inset-x-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-[#04140F]" style={{ top: frame.top, height: frame.height }}>
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
            {!game.connected ? (
              <span className="text-red-300">Reconnecting…</span>
            ) : room.private ? (
              (liveRound ?? room.last)?.kind === 'allIn' ? (
                <span className="font-semibold text-[#FFD76A]">All in</span>
              ) : (
                'Playing alone'
              )
            ) : full ? (
              'Protected room'
            ) : (
              'Room'
            )}
          </p>
          {me && <span className="shrink-0 text-xs font-semibold text-white/80 tabular-nums sm:text-sm">{playsLine(me.used, size)}</span>}
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
        <div className="min-h-48 flex-1 px-2 sm:px-4">
          <CrashStage round={round} live={live} myId={myId} displayRef={displayRef} idle={room.private ? 'Ready when you are' : startsIn !== null ? `Starting in ${startsIn}s` : 'Waiting for everyone to be ready'} />
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
