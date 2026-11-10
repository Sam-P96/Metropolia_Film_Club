import { useRef, useState } from 'react'

import Board from '../components/gomoku/Board'
import GomokuPage from '../components/gomoku/GomokuChrome'
import PlayersBar from '../components/gomoku/PlayersBar'
import SoundToggle from '../components/gomoku/SoundToggle'
import { GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import useApi from '../hooks/useApi'
import { getGomokuShop } from '../services/gomoku'
import { DEFAULTS, pieceAgainst } from '../../../shared/gomoku/catalogue.js'
import { DEFAULT_SIZE, boardOf, isFull, pointName, seatToMove, winningLine } from '../../../shared/gomoku/rules.js'

const BACK = { to: '/games/gomoku', label: 'Infinite Gomoku' }
const NAMES = ['Player 1', 'Player 2']
const FRESH = { moves: [], winner: null, winLine: [], draw: false }

// Play Local: two people on one device, taking turns, For Fun, on the
// 15 x 15 board. All in the browser: nothing is sent to the server or kept.
// Player 1 moves first with your piece, and Player 2 plays the opposite
// (catalogue.js pieceAgainst), on your board and grid, both with your
// shockwave.
export default function GomokuLocal() {
  const shop = useApi(() => getGomokuShop(), [])
  const look = shop.data?.equipped ?? DEFAULTS
  const size = DEFAULT_SIZE

  const [game, setGame] = useState(FRESH)
  const [selected, setSelected] = useState(null)
  const [impact, setImpact] = useState(null)
  const impacts = useRef(0)

  const pieces = [{ id: look.piece, invert: false }, pieceAgainst(look.piece, look.piece)]
  const over = game.winner !== null || game.draw
  const current = seatToMove(game.moves.length)

  const start = () => {
    setGame(FRESH)
    setSelected(null)
    setImpact(null)
  }

  const place = () => {
    if (!selected || over) return
    const { x, y } = selected
    const moves = [...game.moves, { x, y, seat: current }]
    const board = boardOf(size, moves)
    const line = winningLine(board, size, x, y)
    setGame({ moves, winner: line ? current : null, winLine: line ?? [], draw: !line && isFull(board) })
    setSelected(null)
    impacts.current += 1
    setImpact({ x, y, wave: look.shockwave, key: impacts.current, confirmed: true })
  }

  let status
  if (game.draw) status = 'The board is full: a draw.'
  else if (game.winner !== null) status = `${NAMES[game.winner]} wins with five in a row!`
  else if (selected) status = `${NAMES[current]}: ${pointName(size, selected.x, selected.y)}. Press Place piece, or pick another point.`
  else status = `${NAMES[current]}'s turn. Tap a point to pick it.`

  const result = game.draw
    ? { title: 'Draw', detail: 'The board filled up with no five in a row.', tone: 'draw' }
    : game.winner !== null
      ? { title: `${NAMES[game.winner]} wins!`, detail: 'Five in a row.', tone: 'win' }
      : null

  return (
    <GomokuPage back={BACK} subtitle="Play Local: two players on this device, taking turns. Player 1 moves first." aside={<SoundToggle />}>
      <PlayersBar
        players={NAMES.map((name, seat) => ({ name, user: null, piece: pieces[seat], first: seat === 0 }))}
        current={current}
        winner={game.winner}
        over={over}
      />

      <Board
        size={size}
        moves={game.moves}
        pieceFor={(seat) => pieces[seat]}
        boardId={look.board}
        gridId={look.grid}
        ghost={pieces[current]}
        selected={selected}
        onSelect={(x, y) => !over && setSelected({ x, y })}
        canPlay={!over}
        winLine={game.winLine}
        impact={impact}
        result={result}
        label="The board, 15 by 15"
      />

      <p className={`-mt-2 min-h-6 text-center text-lg font-semibold ${game.winner !== null ? 'text-brand-gold' : 'text-white'}`} aria-live="polite">
        {status}
      </p>

      {over ? (
        <button type="button" onClick={start} className={`${GOLD_BUTTON} min-h-14 w-full text-center text-lg sm:mx-auto sm:w-80`}>
          Play again
        </button>
      ) : (
        <>
          <button type="button" onClick={place} disabled={!selected} className={`${GOLD_BUTTON} min-h-14 w-full text-center text-lg sm:mx-auto sm:w-80`}>
            Place piece
          </button>
          <button type="button" onClick={start} disabled={!game.moves.length} className={`${QUIET_BUTTON} self-center text-center`}>
            Start over
          </button>
        </>
      )}
    </GomokuPage>
  )
}
