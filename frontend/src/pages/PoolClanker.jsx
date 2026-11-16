import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import PoolPage, { CARD, HEADING } from '../components/pool/PoolChrome'
import PoolPlay from '../components/pool/PoolPlay'
import ScoreBar from '../components/pool/ScoreBar'
import { endingOf, lastShotText, turnText } from '../components/pool/words'
import { GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import { beforeShot } from '../hooks/usePoolGame'
import { CLANKER_PICTURE } from '../components/clankerPicture'
import { getCurrentUser } from '../utils/currentUser'
import { ShotError, newGame, playShot, resign } from '../../../shared/pool/rules.js'
import { clankerShot } from '../../../shared/pool/clanker.js'
import { itemsOfKind } from '../../../shared/gomoku/catalogue.js'
import { getPoolLook } from '../services/pool'
import { CLANKER_NAME } from '../../../shared/gomoku/clanker.js'

const BACK = { to: '/games/pool', label: '8 Ball Pool' }
const YOU = 0
const CLANKER = 1

// How long Clanker looks at the table before it lines up, and how long it
// takes over drawing the cue back.
const LOOK_MS = 700
const DRAW_MS = 900
// How long it takes to slide the cue ball into place, when it's in hand.
const PLACE_MS = 550

const LEVELS = {
  easy: { name: 'Easy', line: 'Clanker aims roughly and misses plenty.' },
  hard: { name: 'Hard', line: 'Clanker picks its shots and rarely misses.' },
}

// One shot of the game, ready for the table to play out.
// `wave`: the shooter's shockwave, set off where the cue ball first hits a ball.
const shotOf = (game, wave) => ({ key: game.shots, before: game.lastShot.before, dx: game.lastShot.dx, dy: game.lastShot.dy, speed: game.lastShot.speed, wave })

// Clanker's shockwave for a game: any of Infinite Gomoku's, at random.
const clankerWave = () => {
  const waves = itemsOfKind('shockwave')
  return waves[Math.floor(Math.random() * waves.length)].id
}

// Picking how hard Clanker plays.
function LevelPicker({ onPick }) {
  return (
    <section className={`${CARD} flex flex-col items-center gap-4`}>
      <h2 className={HEADING}>How hard?</h2>
      <p className="text-sm text-white/60">For fun: nothing is at stake. You break.</p>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        {Object.entries(LEVELS).map(([id, level]) => (
          <button key={id} type="button" onClick={() => onPick(id)} className={`${id === 'easy' ? QUIET_BUTTON : GOLD_BUTTON} min-h-16 py-2 text-center`}>
            <span className="flex flex-col items-center leading-tight">
              <span className="text-lg">{level.name}</span>
              <small className="text-sm font-medium opacity-80">{level.line}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

// vs Clanker, from 8 Ball Pool's page: you against the computer, Easy or
// Hard (shared/pool/clanker.js), on this device, for fun only (nothing is
// sent to the server). You break. Clanker lines its cue up where you can
// see it, then shoots.
export default function PoolClanker() {
  const me = getCurrentUser()
  const [level, setLevel] = useState(null)
  const [game, setGame] = useState(null)
  const [shot, setShot] = useState(null)
  const [ghost, setGhost] = useState(null)
  const [error, setError] = useState('')
  const timers = useRef([])
  // The shockwaves: yours (picked on 8 Ball Pool's page), and Clanker's.
  const [waves, setWaves] = useState({ mine: null, clanker: null })

  useEffect(() => {
    let stopped = false
    getPoolLook()
      .then((look) => !stopped && setWaves((now) => ({ ...now, mine: look.shockwave })))
      .catch(() => {})
    return () => {
      stopped = true
    }
  }, [])

  const clear = () => {
    for (const timer of timers.current) clearTimeout(timer)
    timers.current = []
  }
  useEffect(() => clear, [])

  const start = (picked) => {
    clear()
    setLevel(picked)
    setGame(newGame())
    setWaves((now) => ({ ...now, clanker: clankerWave() }))
    setShot(null)
    setGhost(null)
    setError('')
  }

  const play = (seat, move) => {
    const next = playShot(game, seat, move)
    setGame(next)
    setShot(shotOf(next, seat === YOU ? waves.mine : waves.clanker))
    setGhost(null)
  }

  const shoot = ({ angle, power, cue }) => {
    if (!game || shot || game.status !== 'active' || game.current !== YOU) return
    setError('')
    try {
      play(YOU, { dx: Math.cos(angle), dy: Math.sin(angle), power, cue })
    } catch (shotError) {
      if (shotError instanceof ShotError) setError(shotError.message)
      else throw shotError
    }
  }

  const shotDone = useCallback((key) => setShot((now) => (now?.key === key ? null : now)), [])

  // Clanker's turn: it looks, lines up (you see its cue come back), shoots.
  const clankerTurn = game?.status === 'active' && game.current === CLANKER && !shot
  useEffect(() => {
    if (!clankerTurn) return
    const looked = setTimeout(() => {
      const move = clankerShot(game, CLANKER, level)
      const angle = Math.atan2(move.dy, move.dx)
      const later = (ms, then) => timers.current.push(setTimeout(then, ms))

      // With the cue ball in hand, it slides it to where it wants it first.
      let start = 0
      if (move.cue) {
        const from = game.balls.find((ball) => ball.id === 0)
        const steps = 14
        for (let i = 0; i <= steps; i += 1) {
          const k = i / steps
          const ease = k * k * (3 - 2 * k)
          const cue = { x: from.x + (move.cue.x - from.x) * ease, y: from.y + (move.cue.y - from.y) * ease }
          later((PLACE_MS * i) / steps, () => setGhost({ angle: Number.NaN, power: 0, cue }))
        }
        start = PLACE_MS + 150
      }

      // Then lines up, and draws the cue back.
      const steps = 12
      for (let i = 0; i <= steps; i += 1) {
        later(start + (DRAW_MS * i) / steps, () => setGhost({ angle, power: (move.power * i) / steps, cue: move.cue }))
      }
      later(start + DRAW_MS + 120, () => {
        const next = playShot(game, CLANKER, move)
        setGame(next)
        setShot(shotOf(next, waves.clanker))
        setGhost(null)
      })
    }, LOOK_MS)
    timers.current.push(looked)
    return clear
  }, [clankerTurn, game, level, waves.clanker])

  if (!level || !game) {
    return (
      <PoolPage back={BACK} subtitle="You against Clanker, the club's computer.">
        <LevelPicker onPick={start} />
      </PoolPage>
    )
  }

  const names = ['You', CLANKER_NAME]
  const shown = shot ? beforeShot(game) : game
  const players = [
    { seat: YOU, name: me?.username ?? 'You', user: me ? { _id: me._id, username: me.username, avatarUrl: me.avatarUrl ?? null } : null },
    { seat: CLANKER, name: CLANKER_NAME, user: { _id: null, username: CLANKER_NAME, avatarUrl: CLANKER_PICTURE } },
  ]
  const over = shown.status === 'over'
  const canAim = game.status === 'active' && game.current === YOU && !shot
  const said = lastShotText(shown, names, YOU)
  const youWon = over && shown.winner === YOU

  return (
    <PoolPage
      back={BACK}
      wide
      subtitle={`You vs. Clanker, on ${LEVELS[level].name}. For fun.`}
      aside={
        <button type="button" onClick={() => start(level === 'easy' ? 'hard' : 'easy')} className="cursor-pointer text-sm text-white/60 underline underline-offset-4 hover:text-white">
          Start again on {level === 'easy' ? 'Hard' : 'Easy'}
        </button>
      }
    >
      <ScoreBar players={players} game={shown} />

      {over && (
        <div className={`${CARD} ${youWon ? 'border-brand-gold/70' : ''} animate-slide-in motion-reduce:animate-none`} role="status">
          <p className="font-['Bebas_Neue'] text-4xl tracking-wide text-white">{youWon ? 'You win!' : 'Clanker wins'}</p>
          <p className="text-white/70">{endingOf(shown, names, YOU)}.</p>
        </div>
      )}

      <PoolPlay balls={game.balls} hand={shot ? null : game.hand} shot={shot} onShotDone={shotDone} ghost={ghost} canAim={canAim} busy={false} onShoot={shoot} />

      <div className="-mt-1 flex min-h-12 flex-col items-center gap-1 text-center" aria-live="polite">
        {said && <p className="text-sm text-white/70">{said}</p>}
        {!over && <p className="text-lg font-semibold text-white">{turnText(shown, names, YOU)}</p>}
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-red-300">
          {error}
        </p>
      )}

      {over ? (
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => start(level)} className={`${GOLD_BUTTON} min-h-12 text-center`}>
            Play again
          </button>
          <Link to="/games/pool" className={`${QUIET_BUTTON} min-h-12 text-center`}>
            Back to 8 Ball Pool
          </Link>
        </div>
      ) : (
        <button
          type="button"
          disabled={Boolean(shot)}
          onClick={() => {
            clear()
            setGame(resign(game, YOU))
            setGhost(null)
          }}
          className={`${QUIET_BUTTON} self-center text-center`}
        >
          Give up
        </button>
      )}
    </PoolPage>
  )
}
