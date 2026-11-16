import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'

import FriendList from '../components/farkle/FriendList'
import ChallengeCard, { Terms } from '../components/gomoku/ChallengeCard'
import ChallengeForm from '../components/gomoku/ChallengeForm'
import PoolPage, { BallIcon, CARD, HEADING } from '../components/pool/PoolChrome'
import { POOL_CHALLENGES, POOL_FORM, poolPath } from '../components/pool/PoolChallenge'
import ShockwavePicker from '../components/pool/ShockwavePicker'
import { endingOf } from '../components/pool/words'
import { GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import CoinIcon from '../components/wallet/CoinIcon'
import MemberAvatar from '../components/profile/MemberAvatar'
import ResonanceIcon from '../components/resonance/ResonanceIcon'
import { getPoolFriends, getPoolLobby } from '../services/pool'
import { formatPoints } from '../../../shared/pool/rules.js'

const EASE = [0.22, 1, 0.36, 1]
const opponentOf = (match) => match.players[1 - match.mySeat]

function Reveal({ show, id, children }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key={id}
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// The rules, short.
function HowToPlay() {
  return (
    <div className={`${CARD} flex flex-col gap-2 text-left text-sm text-white/80`}>
      <h2 className={HEADING}>How to play</h2>
      <p>
        Whoever breaks puts the cue ball anywhere behind the line, then hits the rack. The table stays open until someone pots a ball cleanly after the
        break: that player takes that group, solids <BallIcon id={3} size={14} /> or stripes <BallIcon id={11} size={14} />, and the other player takes the
        rest.
      </p>
      <p>Pot one of your own and you shoot again. Clear your group, then sink the 8 ball to win. Sink the 8 too soon, or on a foul, and you lose.</p>
      <p>
        Fouls hand the cue ball to the other player, to put anywhere: pocketing the cue ball, missing every ball, or hitting the wrong ball first (theirs,
        or the 8 before your group is cleared).
      </p>
      <p>
        To shoot, press and hold towards where you want the cue ball to go: the longer you hold, the harder you hit, and the power never
        drops. Let go to shoot. A line shows where the cue ball goes, and the first ball it hits.
      </p>
      <p>Against a member, each of you has three days for every shot, or the game goes to the other player.</p>
    </div>
  )
}

// One game being played, as a row linking to it. Watching: both players.
function GameRow({ match }) {
  const watching = match.mySeat < 0
  const yourTurn = !watching && match.current === match.mySeat
  const them = watching ? null : opponentOf(match)
  return (
    <Link
      to={poolPath(match._id)}
      className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-3 text-center transition-colors hover:bg-white/10 ${
        yourTurn ? 'border-[#ff4d8d]/70 bg-[#ff4d8d]/10' : 'border-white/10 bg-white/5'
      }`}
    >
      {watching ? (
        <span className="flex items-center gap-2">
          <MemberAvatar user={match.players[0]} size="sm" />
          <span className="text-sm text-white/60">vs</span>
          <MemberAvatar user={match.players[1]} size="sm" />
        </span>
      ) : (
        <MemberAvatar user={them} />
      )}
      <span className="font-semibold text-white">
        {watching ? (
          `${match.players[0].username} vs ${match.players[1].username}`
        ) : (
          <>
            vs {them.username}
            <ResonanceIcon userId={them._id} className="ml-1" />
          </>
        )}
      </span>
      <span className="text-sm text-white/60">
        Shot {match.shots + 1} · <Terms match={match} />
      </span>
      {watching ? (
        <span className="rounded-full bg-[#a35bff]/25 px-3 py-1 text-sm font-semibold text-[#d9b8ff]">Watch and bet</span>
      ) : (
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${yourTurn ? 'bg-[#ff4d8d] text-white' : 'bg-white/10 text-white/70'}`}>
          {yourTurn ? 'Your shot' : 'Their shot'}
        </span>
      )}
    </Link>
  )
}

// A finished game or closed challenge, in a line.
function RecentRow({ match }) {
  const them = opponentOf(match)
  const names = match.players.map((player, seat) => (seat === match.mySeat ? 'You' : player.username))
  let outcome
  if (match.status === 'declined') outcome = 'Challenge declined'
  else if (match.status === 'expired') outcome = 'Challenge expired'
  else if (match.status === 'withdrawn') outcome = 'Challenge withdrawn'
  else if (match.winner === match.mySeat) {
    outcome = match.forFun ? (
      <span className="text-brand-gold">Won, for fun</span>
    ) : (
      <span className="inline-flex items-center gap-1 text-brand-gold">
        Won <CoinIcon kind="ppp" size={14} /> {formatPoints(match.prize)} P-PP
      </span>
    )
  } else outcome = <span className="text-white/60">{match.forFun ? 'Lost, for fun' : `Lost ${formatPoints(match.stake)}`}</span>

  const row = 'flex flex-col items-center gap-0.5 py-2.5 text-center'
  const text = (
    <>
      <span className="text-white">
        vs {them.username}
        <ResonanceIcon userId={them._id} className="ml-1" />
      </span>
      {match.status === 'over' && <span className="text-sm text-white/50">{endingOf(match, names)}</span>}
      <span className="text-sm">{outcome}</span>
    </>
  )
  return match.status === 'over' ? (
    <Link to={poolPath(match._id)} className={`${row} rounded-lg transition-colors hover:bg-white/5`}>
      {text}
    </Link>
  ) : (
    <div className={`${row} text-white/60`}>{text}</div>
  )
}

// Challenging a member, For Fun or For PP: find them by name, or pick a
// friend from the list beside it.
function Online({ forFun, reloads, onSent }) {
  const [picked, setPicked] = useState(null)
  const box = useRef(null)
  const choose = (friend) => {
    setPicked({ friend, at: Date.now() })
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    box.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className="grid items-start gap-6 pt-1 md:grid-cols-2">
      <section ref={box} className={`${CARD} scroll-mt-24`}>
        <h2 className={`${HEADING} mb-1`}>{forFun ? 'Play a member for fun' : 'Play a member for PP'}</h2>
        <p className="mb-4 text-sm text-white/60">
          {forFun ? 'Nothing at stake: just the game.' : 'You both put up the stake, PP or P-PP, and the winner takes both, in P-PP.'}
        </p>
        <ChallengeForm
          key={`${forFun}-${picked?.at ?? 'search'}`}
          forFun={forFun}
          initialOpponent={picked?.friend ?? null}
          game={POOL_FORM}
          onSent={() => {
            setPicked(null)
            onSent()
          }}
        />
      </section>
      <FriendList className={CARD} onChallenge={choose} reloads={reloads} load={getPoolFriends} gamePath={poolPath} needsPoints={!forFun} />
    </div>
  )
}

// 8 Ball Pool's page, from the Games page: Play For Fun (then vs Clanker,
// Easy or Hard, or vs Player) or Play For PP (vs Player only), your
// shockwave, how to play, every challenge and game, and
// the games members they follow are playing, to watch and bet on. App.jsx
// sends logged-out visitors to log in first.
export default function PoolLobby() {
  const [lobby, setLobby] = useState(null)
  const [error, setError] = useState('')
  const [reloads, setReloads] = useState(0)
  const [mode, setMode] = useState(null)
  const [online, setOnline] = useState(false)
  const [waves, setWaves] = useState(false)
  const [rules, setRules] = useState(false)

  useEffect(() => {
    let stopped = false
    getPoolLobby()
      .then((data) => !stopped && setLobby(data))
      .catch((loadError) => !stopped && setError(loadError.message))
    return () => {
      stopped = true
    }
  }, [reloads])

  const reload = () => setReloads((count) => count + 1)
  const choose = (next) => {
    setMode(mode === next ? null : next)
    setOnline(false)
  }
  const option = 'min-h-14 py-2 text-center text-lg'
  const label = (title, line) => (
    <span className="flex flex-col items-center leading-tight">
      <span>{title}</span>
      <small className="text-sm leading-tight font-medium opacity-80">{line}</small>
    </span>
  )
  const empty = lobby && !lobby.incoming.length && !lobby.games.length && !lobby.outgoing.length && !lobby.recent.length && !lobby.watch.length

  return (
    <PoolPage subtitle="Pot your group, then the 8. Play Clanker, or any member online, for fun or for PP.">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => choose('fun')} aria-expanded={mode === 'fun'} className={`${mode === 'fun' ? GOLD_BUTTON : QUIET_BUTTON} min-h-13 flex-1 text-center text-lg`}>
          Play For Fun
        </button>
        <button type="button" onClick={() => choose('pp')} aria-expanded={mode === 'pp'} className={`${mode === 'pp' ? GOLD_BUTTON : QUIET_BUTTON} min-h-13 flex-1 text-center text-lg`}>
          Play For PP
        </button>
      </div>
      <div className="-mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
        <button
          type="button"
          onClick={() => setRules(!rules)}
          aria-expanded={rules}
          className="cursor-pointer text-sm text-white/60 underline underline-offset-4 hover:text-white"
        >
          How to play
        </button>
        <button
          type="button"
          onClick={() => setWaves(!waves)}
          aria-expanded={waves}
          className="cursor-pointer text-sm text-white/60 underline underline-offset-4 hover:text-white"
        >
          Your shockwave
        </button>
      </div>

      <Reveal show={rules} id="rules">
        <HowToPlay />
      </Reveal>

      <Reveal show={waves} id="waves">
        <ShockwavePicker />
      </Reveal>

      <Reveal show={mode !== null} id="mode">
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {mode === 'fun' ? (
              <Link to="/games/pool/clanker" className={`${QUIET_BUTTON} ${option}`}>
                {label('vs Clanker', 'Easy or Hard, on this device')}
              </Link>
            ) : (
              <button type="button" disabled className={`${QUIET_BUTTON} ${option}`}>
                {label('vs Clanker', 'For fun only')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOnline(!online)}
              aria-expanded={online || mode === 'pp'}
              className={`${online || mode === 'pp' ? GOLD_BUTTON : QUIET_BUTTON} ${option}`}
            >
              {label('vs Player', mode === 'pp' ? 'Bet PP and P-PP on it' : 'Challenge a member')}
            </button>
          </div>
          <Reveal show={online || mode === 'pp'} id={`online-${mode}`}>
            <Online forFun={mode === 'fun'} reloads={reloads} onSent={reload} />
          </Reveal>
        </div>
      </Reveal>

      {error && <p className="text-red-300">Couldn&apos;t load your games: {error}</p>}

      {lobby?.incoming.length > 0 && (
        <section aria-labelledby="pool-incoming" className="flex flex-col gap-4">
          <h2 id="pool-incoming" className={HEADING}>
            Waiting on you
          </h2>
          {lobby.incoming.map((match) => (
            <div key={match._id} className={`${CARD} border-[#ff4d8d]/60`}>
              <ChallengeCard match={match} onChange={reload} game={POOL_CHALLENGES} />
            </div>
          ))}
        </section>
      )}

      {lobby?.games.length > 0 && (
        <section aria-labelledby="pool-games" className={`${CARD} flex flex-col gap-3`}>
          <h2 id="pool-games" className={HEADING}>
            Your games
          </h2>
          {lobby.games.map((match) => (
            <GameRow key={match._id} match={match} />
          ))}
        </section>
      )}

      {lobby?.watch.length > 0 && (
        <section aria-labelledby="pool-watch" className={`${CARD} flex flex-col gap-3`}>
          <h2 id="pool-watch" className={HEADING}>
            Being played now
          </h2>
          <p className="-mt-1 text-sm text-white/60">Members you follow are playing. Watch live, and bet on who wins.</p>
          {lobby.watch.map((match) => (
            <GameRow key={match._id} match={match} />
          ))}
        </section>
      )}

      {lobby?.outgoing.length > 0 && (
        <section aria-labelledby="pool-sent" className="flex flex-col gap-4">
          <h2 id="pool-sent" className={HEADING}>
            Sent
          </h2>
          {lobby.outgoing.map((match) => (
            <div key={match._id} className={CARD}>
              <ChallengeCard match={match} onChange={reload} game={POOL_CHALLENGES} />
            </div>
          ))}
        </section>
      )}

      {lobby?.recent.length > 0 && (
        <section aria-labelledby="pool-recent" className={CARD}>
          <h2 id="pool-recent" className={`${HEADING} mb-2`}>
            Finished
          </h2>
          <div className="divide-y divide-white/10">
            {lobby.recent.map((match) => (
              <RecentRow key={match._id} match={match} />
            ))}
          </div>
        </section>
      )}

      {empty && <p className="text-center text-sm text-white/50">No games yet. Play Clanker, or challenge a member.</p>}
    </PoolPage>
  )
}
