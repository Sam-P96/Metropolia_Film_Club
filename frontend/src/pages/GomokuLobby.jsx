import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'

import FriendList from '../components/farkle/FriendList'
import ChallengeCard, { Terms } from '../components/gomoku/ChallengeCard'
import ChallengeForm from '../components/gomoku/ChallengeForm'
import GomokuPage, { CARD, HEADING } from '../components/gomoku/GomokuChrome'
import HowToPlay from '../components/gomoku/HowToPlay'
import { PieceSwatch } from '../components/gomoku/Piece'
import { GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import CoinIcon from '../components/wallet/CoinIcon'
import MemberAvatar from '../components/profile/MemberAvatar'
import ResonanceIcon from '../components/resonance/ResonanceIcon'
import { getGomokuFriends, getGomokuLobby } from '../services/gomoku'
import { endingOf } from '../utils/gomoku'
import { formatPoints } from '../../../shared/gomoku/rules.js'

const EASE = [0.22, 1, 0.36, 1]
const opponentOf = (match) => match.players[1 - match.mySeat]
const gomokuPath = (id) => `/games/gomoku/${id}`

// Opens and closes smoothly, like Steal and Defend's How to play.
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

// One game being played, as a row linking to it.
function GameRow({ match }) {
  const yourTurn = match.current === match.mySeat
  const them = opponentOf(match)
  return (
    <Link
      to={gomokuPath(match._id)}
      className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-3 text-center transition-colors hover:bg-white/10 ${
        yourTurn ? 'border-brand-gold/60 bg-brand-gold/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <MemberAvatar user={them} />
      <span className="font-semibold text-white">
        vs {them.username}
        <ResonanceIcon userId={them._id} className="ml-1" />
      </span>
      <span className="text-sm text-white/60">
        Move {match.moveCount + 1} · <Terms match={match} />
      </span>
      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${yourTurn ? 'bg-brand-gold text-ink' : 'bg-white/10 text-white/70'}`}>
        {yourTurn ? 'Your turn' : 'Their turn'}
      </span>
    </Link>
  )
}

// A finished game or closed challenge, in a line.
function RecentRow({ match }) {
  const them = opponentOf(match)
  let outcome
  if (match.status === 'declined') outcome = 'Challenge declined'
  else if (match.status === 'expired') outcome = 'Challenge expired'
  else if (match.status === 'withdrawn') outcome = 'Challenge withdrawn'
  else if (match.endedBy === 'draw') outcome = 'Draw'
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
      {match.status === 'over' && <span className="text-sm text-white/50">{endingOf(match, them.username)}</span>}
      <span className="text-sm">{outcome}</span>
    </>
  )
  return match.status === 'over' ? (
    <Link to={gomokuPath(match._id)} className={`${row} rounded-lg transition-colors hover:bg-white/5`}>
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
          {forFun ? 'Nothing at stake: just the game.' : 'You both put up the stake, and the winner takes both, in P-PP.'}
        </p>
        <ChallengeForm
          key={`${forFun}-${picked?.at ?? 'search'}`}
          forFun={forFun}
          initialOpponent={picked?.friend ?? null}
          onSent={() => {
            setPicked(null)
            onSent()
          }}
        />
      </section>
      <FriendList className={CARD} onChallenge={choose} reloads={reloads} load={getGomokuFriends} gamePath={gomokuPath} needsPoints={!forFun} />
    </div>
  )
}

// Infinite Gomoku's page, from the Games page: Play For Fun (on this
// device, or online against a member), Play For PP (against a member), the
// Shop, how to play, and every challenge and game. App.jsx sends
// logged-out visitors to log in first.
export default function GomokuLobby() {
  const [lobby, setLobby] = useState(null)
  const [error, setError] = useState('')
  const [reloads, setReloads] = useState(0)
  const [mode, setMode] = useState(null)
  const [online, setOnline] = useState(false)
  const [rules, setRules] = useState(false)

  useEffect(() => {
    let stopped = false
    getGomokuLobby()
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

  return (
    <GomokuPage
      subtitle="Five in a row wins. Play a friend on this device, or any member online, for fun or for PP."
      aside={
        import.meta.env.DEV && (
          <Link
            to="/games/gomoku/dev"
            className="rounded-lg border border-sky-400/50 bg-sky-950/40 px-3 py-1.5 text-sm font-semibold text-sky-200 hover:border-sky-300 hover:text-white"
          >
            Developer tool →
          </Link>
        )
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => choose('fun')} aria-expanded={mode === 'fun'} className={`${mode === 'fun' ? GOLD_BUTTON : QUIET_BUTTON} min-h-13 flex-1 text-center text-lg`}>
          Play For Fun
        </button>
        <button type="button" onClick={() => choose('pp')} aria-expanded={mode === 'pp'} className={`${mode === 'pp' ? GOLD_BUTTON : QUIET_BUTTON} min-h-13 flex-1 text-center text-lg`}>
          Play For PP
        </button>
        <Link to="/games/gomoku/shop" className={`${QUIET_BUTTON} min-h-13 flex-1 text-center text-lg`}>
          {lobby?.myLook && <PieceSwatch id={lobby.myLook.piece} size={26} />}
          Shop
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setRules(!rules)}
        aria-expanded={rules}
        className="-mt-2 cursor-pointer self-center text-sm text-white/60 underline underline-offset-4 hover:text-white"
      >
        How to play
      </button>

      <Reveal show={rules} id="rules">
        <HowToPlay />
      </Reveal>

      <Reveal show={mode === 'fun'} id="fun">
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/games/gomoku/local" className={`${GOLD_BUTTON} min-h-14 flex-col gap-0 text-center text-lg`}>
              Play Local
              <small className="text-sm font-medium opacity-80">Two players, this device</small>
            </Link>
            <button type="button" onClick={() => setOnline(!online)} aria-expanded={online} className={`${online ? GOLD_BUTTON : QUIET_BUTTON} min-h-14 flex-col gap-0 text-center text-lg`}>
              Play Online
              <small className="text-sm font-medium opacity-80">Challenge a member</small>
            </button>
          </div>
          <Reveal show={online} id="online">
            <Online forFun reloads={reloads} onSent={reload} />
          </Reveal>
        </div>
      </Reveal>

      <Reveal show={mode === 'pp'} id="pp">
        <Online forFun={false} reloads={reloads} onSent={reload} />
      </Reveal>

      {error && <p className="text-red-300">Couldn&apos;t load your games: {error}</p>}

      {lobby?.incoming.length > 0 && (
        <section aria-labelledby="gomoku-incoming" className="flex flex-col gap-4">
          <h2 id="gomoku-incoming" className={HEADING}>
            Waiting on you
          </h2>
          {lobby.incoming.map((match) => (
            <div key={match._id} className={`${CARD} border-brand-gold/60`}>
              <ChallengeCard match={match} onChange={reload} />
            </div>
          ))}
        </section>
      )}

      {lobby?.games.length > 0 && (
        <section aria-labelledby="gomoku-games" className={`${CARD} flex flex-col gap-3`}>
          <h2 id="gomoku-games" className={HEADING}>
            Your games
          </h2>
          {lobby.games.map((match) => (
            <GameRow key={match._id} match={match} />
          ))}
        </section>
      )}

      {lobby?.outgoing.length > 0 && (
        <section aria-labelledby="gomoku-sent" className="flex flex-col gap-4">
          <h2 id="gomoku-sent" className={HEADING}>
            Sent
          </h2>
          {lobby.outgoing.map((match) => (
            <div key={match._id} className={CARD}>
              <ChallengeCard match={match} onChange={reload} />
            </div>
          ))}
        </section>
      )}

      {lobby?.recent.length > 0 && (
        <section aria-labelledby="gomoku-recent" className={CARD}>
          <h2 id="gomoku-recent" className={`${HEADING} mb-2`}>
            Finished
          </h2>
          <div className="divide-y divide-white/10">
            {lobby.recent.map((match) => (
              <RecentRow key={match._id} match={match} />
            ))}
          </div>
        </section>
      )}

      {lobby && !lobby.incoming.length && !lobby.games.length && !lobby.outgoing.length && !lobby.recent.length && (
        <p className="text-center text-sm text-white/50">No games yet. Pick Play For Fun or Play For PP to start one.</p>
      )}
    </GomokuPage>
  )
}
