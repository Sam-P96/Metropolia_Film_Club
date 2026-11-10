import { useRef, useState } from 'react'

import Board from '../components/gomoku/Board'
import GomokuPage, { CARD, HEADING } from '../components/gomoku/GomokuChrome'
import PlayersBar from '../components/gomoku/PlayersBar'
import { GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import useApi from '../hooks/useApi'
import { getGomokuShop } from '../services/gomoku'
import { boardName } from '../utils/gomoku'
import { DEFAULTS, pieceAgainst } from '../../../shared/gomoku/catalogue.js'
import { BOARD_SIZES, DEFAULT_SIZE, boardOf, isFull, pointName, seatToMove, winningLine } from '../../../shared/gomoku/rules.js'

const BACK = { to: '/games/gomoku', label: 'Infinite Gomoku' }
const NAMES = ['Player 1', 'Player 2']

const choice = (on) =>
  `cursor-pointer rounded-xl border px-4 py-2 font-semibold transition-colors ${
    on ? 'border-brand-gold bg-brand-gold text-ink' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
  }`

// Play Local: two people on one device, taking turns, For Fun. All in the
// browser: nothing is sent to the server or kept. Player 1 moves first with
// your piece, and Player 2 plays the opposite (catalogue.js pieceAgainst),
// on your board and grid, both with your shockwave.
export default function GomokuLocal() {
  const shop = useApi(() => getGomokuShop(), [])
  const look = shop.data?.equipped ?? DEFAULTS

  const [size, setSize] = useState(DEFAULT_SIZE)
  const [game, setGame] = useState(null)
  const [selected, setSelected] = useState(null)
  const [impact, setImpact] = useState(null)
  const impacts = useRef(0)

  const pieces = [{ id: look.piece, invert: false }, pieceAgainst(look.piece, look.piece)]
  const pieceFor = (seat) => pieces[seat]

  const start = () => {
    setGame({ size, moves: [], winner: null, winLine: [], draw: false })
    setSelected(null)
    setImpact(null)
  }

  if (!game) {
    return (
      <GomokuPage back={BACK} subtitle="Play Local: two players on this device, taking turns.">
        <section className={`${CARD} flex flex-col gap-4`}>
          <h2 className={HEADING}>New game</h2>
          <fieldset>
            <legend className="mb-2 text-xs uppercase tracking-widest text-white/60">Board</legend>
            <div className="flex flex-wrap gap-2">
              {BOARD_SIZES.map((option) => (
                <button key={option} type="button" aria-pressed={size === option} onClick={() => setSize(option)} className={choice(size === option)}>
                  {boardName(option)}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="text-sm text-white/60">Player 1 moves first. Pass the device over after each move. For fun: nothing is at stake.</p>
          <button type="button" onClick={start} className={`${GOLD_BUTTON} min-h-14 text-lg`}>
            Start
          </button>
        </section>
      </GomokuPage>
    )
  }

  const over = game.winner !== null || game.draw
  const current = seatToMove(game.moves.length)

  const place = () => {
    if (!selected || over) return
    const { x, y } = selected
    const moves = [...game.moves, { x, y, seat: current }]
    const board = boardOf(game.size, moves)
    const line = winningLine(board, game.size, x, y)
    setGame({ ...game, moves, winner: line ? current : null, winLine: line ?? [], draw: !line && isFull(board) })
    setSelected(null)
    impacts.current += 1
    setImpact({ x, y, wave: look.shockwave, key: impacts.current })
  }

  let status
  if (game.draw) status = 'The board is full: a draw.'
  else if (game.winner !== null) status = `${NAMES[game.winner]} wins with five in a row!`
  else if (selected) status = `${NAMES[current]}: ${pointName(game.size, selected.x, selected.y)}. Press Place piece, or pick another point.`
  else status = `${NAMES[current]}'s turn. Tap a point to pick it.`

  return (
    <GomokuPage back={BACK} subtitle={`Play Local on a ${boardName(game.size)} board.`}>
      <PlayersBar
        players={NAMES.map((name, seat) => ({ name, user: null, piece: pieces[seat], first: seat === 0 }))}
        current={current}
        winner={game.winner}
        over={over}
      />

      <Board
        size={game.size}
        moves={game.moves}
        pieceFor={pieceFor}
        boardId={look.board}
        gridId={look.grid}
        ghost={pieces[current]}
        selected={selected}
        onSelect={(x, y) => !over && setSelected({ x, y })}
        canPlay={!over}
        winLine={game.winLine}
        impact={impact}
        label={`The board, ${game.size} by ${game.size}`}
      />

      <p className={`-mt-2 min-h-6 text-center text-lg font-semibold ${game.winner !== null ? 'text-brand-gold' : 'text-white'}`} aria-live="polite">
        {status}
      </p>

      {over ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={start} className={`${GOLD_BUTTON} min-h-14 text-lg sm:w-60`}>
            Play again
          </button>
          <button type="button" onClick={() => setGame(null)} className={`${QUIET_BUTTON} min-h-14 text-lg sm:w-60`}>
            Change board
          </button>
        </div>
      ) : (
        <>
          <button type="button" onClick={place} disabled={!selected} className={`${GOLD_BUTTON} min-h-14 w-full text-lg sm:mx-auto sm:w-80`}>
            Place piece
          </button>
          <button type="button" onClick={start} className={`${QUIET_BUTTON} self-center`}>
            Start over
          </button>
        </>
      )}
    </GomokuPage>
  )
}
