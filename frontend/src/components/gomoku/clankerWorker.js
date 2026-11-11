import { clankerMove } from '../../../../shared/gomoku/clanker.js'

// Clanker thinking (shared/gomoku/clanker.js), off the page's main thread,
// so the board stays smooth while it works out a move (up to about a
// second). { id, board, size, seat } in, { id, move: [x, y] } out.
self.onmessage = (event) => {
  const { id, board, size, seat } = event.data
  self.postMessage({ id, move: clankerMove(board, size, seat) })
}
