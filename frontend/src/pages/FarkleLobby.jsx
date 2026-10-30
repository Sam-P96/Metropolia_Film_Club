import '@fontsource/cinzel'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import ChallengeCard from '../components/farkle/ChallengeCard'
import ChallengeForm from '../components/farkle/ChallengeForm'
import CoinIcon from '../components/wallet/CoinIcon'
import { getLobby } from '../services/farkle'
import { BOT_MODE, BOT_NAME, formatPoints } from '../../../shared/farkle/rules.js'

const CARD = 'rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
const HEADING = "font-['Cinzel'] text-xl text-brand-gold"

const opponentOf = (match) => match.players[1 - match.mySeat]

// One game between members, as a row linking to it.
function GameRow({ match }) {
  const yourTurn = match.current === match.mySeat

  return (
    <Link
      to={`/games/farkle/${match._id}`}
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border px-4 py-3 transition-colors hover:bg-white/10 ${
        yourTurn ? 'border-brand-gold/60 bg-brand-gold/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <span className="min-w-0">
        <span className="font-semibold text-white">vs {opponentOf(match).username}</span>
        <span className="block text-sm text-white/60 tabular-nums">
          {formatPoints(match.scores[match.mySeat])} to {formatPoints(match.scores[1 - match.mySeat])} · first to{' '}
          {formatPoints(match.target)} · winner takes {formatPoints(match.prize)} P-PP
        </span>
      </span>
      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${yourTurn ? 'bg-brand-gold text-ink' : 'bg-white/10 text-white/70'}`}>
        {yourTurn ? 'Your turn' : 'Their turn'}
      </span>
    </Link>
  )
}

// One finished game or closed challenge, in a line. Finished games link to
// their page, to look back at the end of them.
function RecentRow({ match }) {
  const youWon = match.winner === match.mySeat

  let outcome
  if (match.status === 'declined') outcome = 'Challenge declined'
  else if (match.status === 'expired') outcome = 'Challenge expired'
  else if (match.status === 'withdrawn') outcome = 'Challenge withdrawn'
  else if (youWon) {
    outcome = (
      <span className="inline-flex items-center gap-1 text-brand-gold">
        Won <CoinIcon kind="ppp" size={14} /> {formatPoints(match.prize)} P-PP
      </span>
    )
  } else outcome = <span className="text-white/60">Lost {formatPoints(match.stake)}</span>

  const row = 'flex flex-wrap items-center justify-between gap-x-4 py-2'
  const text = (
    <>
      <span className="text-white">vs {opponentOf(match).username}</span>
      <span className="text-sm">{outcome}</span>
    </>
  )

  return match.status === 'over' ? (
    <Link to={`/games/farkle/${match._id}`} className={`${row} rounded-lg transition-colors hover:bg-white/5`}>
      {text}
    </Link>
  ) : (
    <div className={`${row} text-white/60`}>{text}</div>
  )
}

// The Farkle lobby, from the Games page: play the bot, challenge a member,
// answer challenges, and every game you have going. App.jsx sends
// logged-out visitors to log in first.
export default function FarkleLobby() {
  const [lobby, setLobby] = useState(null)
  const [error, setError] = useState('')
  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    let stopped = false
    getLobby()
      .then((data) => {
        if (!stopped) setLobby(data)
      })
      .catch((loadError) => {
        if (!stopped) setError(loadError.message)
      })
    return () => {
      stopped = true
    }
  }, [reloads])

  const reload = () => setReloads((count) => count + 1)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header>
        <Link to="/games" className="text-sm text-white/60 hover:text-white">
          ← Games
        </Link>
        <h1 className="mt-2 font-['Cinzel'] text-4xl text-white">
          Kino <span className="text-brand-gold">Farkle</span>
        </h1>
        <p className="mt-1 text-white/60">Push your luck, for points.</p>
      </header>

      {error && <p className="text-red-300">Couldn't load your games: {error}</p>}

      {lobby?.incoming.length > 0 && (
        <section aria-labelledby="incoming-heading" className="flex flex-col gap-4">
          <h2 id="incoming-heading" className={HEADING}>
            Waiting on you
          </h2>
          {lobby.incoming.map((match) => (
            <div key={match._id} className={`${CARD} border-brand-gold/60`}>
              <ChallengeCard match={match} onChange={reload} />
            </div>
          ))}
        </section>
      )}

      {/* items-start: each card only as tall as itself, so the challenge
          form growing with search results leaves the other card alone. */}
      <div className="grid items-start gap-6 md:grid-cols-2">
        <section className={`${CARD} flex flex-col gap-3`}>
          <h2 className={HEADING}>{BOT_MODE}</h2>
          <p className="text-white/70">
            Any time, 2 to 500 points. Win and you get your stake back plus half again, in P-PP. {BOT_NAME} always rolls first.
          </p>
          <Link
            to="/games/farkle/bot"
            className="mt-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110"
          >
            {lobby?.bot
              ? `Carry on: ${formatPoints(lobby.bot.scores[lobby.bot.mySeat])} to ${formatPoints(lobby.bot.scores[1 - lobby.bot.mySeat])}`
              : `Play ${BOT_MODE}`}
          </Link>
        </section>

        <section className={CARD}>
          <h2 className={`${HEADING} mb-3`}>Challenge a member</h2>
          <ChallengeForm onSent={reload} />
        </section>
      </div>

      {lobby?.games.length > 0 && (
        <section aria-labelledby="games-heading" className={`${CARD} flex flex-col gap-3`}>
          <h2 id="games-heading" className={HEADING}>
            Your games
          </h2>
          {lobby.games.map((match) => (
            <GameRow key={match._id} match={match} />
          ))}
        </section>
      )}

      {lobby?.outgoing.length > 0 && (
        <section aria-labelledby="sent-heading" className="flex flex-col gap-4">
          <h2 id="sent-heading" className={HEADING}>
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
        <section aria-labelledby="recent-heading" className={CARD}>
          <h2 id="recent-heading" className={`${HEADING} mb-2`}>
            Finished
          </h2>
          <div className="divide-y divide-white/10">
            {lobby.recent.map((match) => (
              <RecentRow key={match._id} match={match} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
