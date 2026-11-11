import { useEffect, useRef, useState } from 'react'

import Board from '../components/gomoku/Board'
import GomokuPage from '../components/gomoku/GomokuChrome'
import PlayersBar from '../components/gomoku/PlayersBar'
import ReplayView from '../components/gomoku/ReplayView'
import SoundToggle from '../components/gomoku/SoundToggle'
import { wakeAudio } from '../components/gomoku/feedback'
import { GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import useApi from '../hooks/useApi'
import useClanker from '../hooks/useClanker'
import { getGomokuShop } from '../services/gomoku'
import { getUser } from '../services/users'
import { getCurrentUser, getCurrentUserId } from '../utils/currentUser'
import { DEFAULTS, itemsOfKind, pieceAgainst } from '../../../shared/gomoku/catalogue.js'
import { CLANKER_NAME } from '../../../shared/gomoku/clanker.js'
import { DEFAULT_SIZE, boardOf, isFull, pointName, seatToMove, winningLine } from '../../../shared/gomoku/rules.js'

const BACK = { to: '/games/gomoku', label: 'Infinite Gomoku' }

// The board: the page's full width, but a fifth smaller on a computer.
const BOARD_SIZE = 'mx-auto w-full lg:w-4/5'

// Clanker always moves first, as in Kino Farkle.
const CLANKER_SEAT = 0
const MY_SEAT = 1

// Clanker takes at least this long over a move, so it doesn't land on top
// of yours.
const THINK_MS = 650

const FRESH = { moves: [], winner: null, winLine: [], draw: false }

const pickFrom = (list) => list[Math.floor(Math.random() * list.length)]

// Clanker's look for one game: any piece and any shockwave in the shop.
const clankerLook = () => ({ piece: pickFrom(itemsOfKind('piece')).id, shockwave: pickFrom(itemsOfKind('shockwave')).id })

// Where a game ends up after `moves`, the last one at (x, y) by `seat`.
function after(moves, x, y, seat) {
  const board = boardOf(DEFAULT_SIZE, moves)
  const line = winningLine(board, DEFAULT_SIZE, x, y)
  return { moves, winner: line ? seat : null, winLine: line ?? [], draw: !line && isFull(board) }
}

// vs Clanker, from Play For Fun: you against the computer, on this device,
// for fun only (nothing is at stake, and nothing is sent to the server).
// Clanker moves first, plays hard (shared/gomoku/clanker.js), and fumbles 1
// move in 20. It picks a piece and a shockwave from the shop at random for
// each game; if it's your piece, it shows as the opposite, as online. Once
// it's over, the game can be watched again (in this visit only).
export default function GomokuClanker() {
  const shop = useApi(() => getGomokuShop(), [])
  const profile = useApi(() => getUser(getCurrentUserId()), [])
  const look = shop.data?.equipped ?? DEFAULTS
  const myName = getCurrentUser()?.username ?? 'You'
  const size = DEFAULT_SIZE
  const think = useClanker()

  const [game, setGame] = useState(FRESH)
  const [clanker, setClanker] = useState(clankerLook)
  const [selected, setSelected] = useState(null)
  const [impact, setImpact] = useState(null)
  const [replaying, setReplaying] = useState(false)
  const impacts = useRef(0)

  const pieces = [pieceAgainst(look.piece, clanker.piece), { id: look.piece, invert: false }]
  const pieceFor = (seat) => pieces[seat]
  const waves = [clanker.shockwave, look.shockwave]
  const over = game.winner !== null || game.draw
  const current = seatToMove(game.moves.length)
  const clankersTurn = !over && current === CLANKER_SEAT

  const landed = (x, y, wave, confirmed) => {
    impacts.current += 1
    setImpact({ x, y, wave, key: impacts.current, confirmed })
  }

  // Clanker's turn: it thinks (a moment at least), then plays.
  useEffect(() => {
    if (!clankersTurn) return
    let stopped = false
    const started = Date.now()
    const moves = game.moves
    think(boardOf(DEFAULT_SIZE, moves), DEFAULT_SIZE, CLANKER_SEAT).then(async ([x, y]) => {
      const left = THINK_MS - (Date.now() - started)
      if (left > 0) await new Promise((resolve) => setTimeout(resolve, left))
      if (stopped) return
      setGame(after([...moves, { x, y, seat: CLANKER_SEAT }], x, y, CLANKER_SEAT))
      impacts.current += 1
      setImpact({ x, y, wave: clanker.shockwave, key: impacts.current })
    })
    return () => {
      stopped = true
    }
  }, [clankersTurn, game.moves, think, clanker.shockwave])

  const place = () => {
    if (!selected || over || current !== MY_SEAT) return
    const { x, y } = selected
    setGame(after([...game.moves, { x, y, seat: MY_SEAT }], x, y, MY_SEAT))
    setSelected(null)
    landed(x, y, look.shockwave, true)
  }

  const newGame = () => {
    setGame(FRESH)
    setClanker(clankerLook())
    setSelected(null)
    setImpact(null)
    setReplaying(false)
  }

  const names = [CLANKER_NAME, myName]
  let status
  if (game.draw) status = 'The board is full: a draw.'
  else if (game.winner === MY_SEAT) status = 'You beat Clanker with five in a row!'
  else if (game.winner === CLANKER_SEAT) status = 'Clanker wins with five in a row.'
  else if (clankersTurn) status = game.moves.length === 0 ? 'Clanker moves first…' : 'Clanker is thinking…'
  else if (selected) status = `${pointName(size, selected.x, selected.y)}: press Place piece, or pick another point.`
  else status = 'Your turn. Tap a point to pick it.'

  const result = game.draw
    ? { title: 'Draw', detail: 'The board filled up with no five in a row.', tone: 'draw' }
    : game.winner !== null
      ? { title: `${names[game.winner]} wins!`, detail: 'Five in a row.', tone: 'win' }
      : null

  // You first in the bar, as in every game.
  const side = (seat) => (seat === null ? null : seat === MY_SEAT ? 0 : 1)
  const players = [
    { name: 'You', user: profile.data ?? null, piece: pieces[MY_SEAT], first: false },
    { name: CLANKER_NAME, user: null, piece: pieces[CLANKER_SEAT], first: true },
  ]

  return (
    <GomokuPage back={BACK} subtitle="vs Clanker, for fun. Clanker moves first, and doesn't go easy." aside={<SoundToggle />}>
      <PlayersBar players={players} current={side(current)} winner={side(game.winner)} over={over} />

      {replaying ? (
        <ReplayView
          size={size}
          moves={game.moves}
          pieceFor={pieceFor}
          boardId={look.board}
          gridId={look.grid}
          winLine={game.winLine}
          waveFor={(seat) => waves[seat]}
          names={names}
          onClose={() => setReplaying(false)}
          boardClassName={BOARD_SIZE}
        />
      ) : (
        <div className={BOARD_SIZE}>
          <Board
            size={size}
            moves={game.moves}
            pieceFor={pieceFor}
            boardId={look.board}
            gridId={look.grid}
            ghost={pieces[MY_SEAT]}
            selected={selected}
            onSelect={(x, y) => !over && current === MY_SEAT && setSelected({ x, y })}
            canPlay={!over && current === MY_SEAT}
            winLine={game.winLine}
            impact={impact}
            result={result}
            label="The board, 15 by 15"
          />
        </div>
      )}

      {!replaying && (
        <p className={`-mt-2 min-h-6 text-center text-lg font-semibold ${game.winner === MY_SEAT ? 'text-brand-gold' : 'text-white'}`} aria-live="polite">
          {status}
        </p>
      )}

      {over ? (
        !replaying && (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={newGame} className={`${GOLD_BUTTON} min-h-14 w-full text-center text-lg sm:w-60`}>
              Play again
            </button>
            <button
              type="button"
              onClick={() => {
                // The tap lets the replay make its sounds.
                wakeAudio()
                setReplaying(true)
              }}
              className={`${QUIET_BUTTON} min-h-14 w-full text-center text-lg sm:w-60`}
            >
              ▶ Watch the replay
            </button>
          </div>
        )
      ) : (
        <>
          <button
            type="button"
            onClick={place}
            disabled={!selected || current !== MY_SEAT}
            className={`${GOLD_BUTTON} min-h-14 w-full text-center text-lg sm:mx-auto sm:w-80`}
          >
            Place piece
          </button>
          <button type="button" onClick={newGame} disabled={game.moves.length < 2} className={`${QUIET_BUTTON} self-center text-center`}>
            New game
          </button>
        </>
      )}
    </GomokuPage>
  )
}
