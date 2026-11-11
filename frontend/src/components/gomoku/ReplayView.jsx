import Board from './Board'
import ReplayControls from './ReplayControls'
import useGomokuReplay from '../../hooks/useGomokuReplay'

// Watching a finished game again (online games, and games vs Clanker): the
// board as it was after each move, every stone landing with its player's
// shockwave, sound and buzz, and the controls under it. Only while it's
// open.
//   moves             in the order they were played: [{ x, y, seat }]
//   pieceFor(seat)    { id, invert }, as in the game
//   waveFor(seat)     that player's shockwave
//   names             the players' names, by seat
//   winLine           the five that won, lit up at the end
//   boardClassName    the board's size on the page
export default function ReplayView({ size, moves, pieceFor, boardId, gridId, winLine = [], waveFor, names, onClose, boardClassName }) {
  const replay = useGomokuReplay(moves, waveFor)
  return (
    <>
      <div className={boardClassName}>
        <Board
          size={size}
          moves={replay.shown}
          pieceFor={pieceFor}
          boardId={boardId}
          gridId={gridId}
          canPlay={false}
          winLine={replay.step >= replay.total ? winLine : []}
          impact={replay.impact}
          label="The replay"
        />
      </div>
      <ReplayControls replay={replay} names={names} onClose={onClose} />
    </>
  )
}
