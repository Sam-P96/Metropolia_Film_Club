// Infinite Gomoku's rules as plain functions: no React, no database, no
// timers. The game pages (local games are played entirely in the browser)
// and the server (backend/games/gomoku/engine.js) both use this file, so
// they always agree on what wins.
//
// "Infinite" is only the name: it's ordinary freestyle Gomoku. Two players
// take turns putting a stone on an empty point of the grid, and the first
// to get five or more in an unbroken line (across, down or diagonally) wins.
// A full board with no five is a draw. Whoever moves first is seat 0.

export const GAME_NAME = 'Infinite Gomoku'

// The board: 15 x 15 points, the standard Gomoku board, and the only one.
// (Games keep their size, so another could be added here one day.)
export const BOARD_SIZES = [15]
export const DEFAULT_SIZE = 15

// Stones in a row to win. Freestyle: six or more in a row wins too.
export const WIN_LENGTH = 5

// A game between members is played for fun (a stake of 0: nothing is
// taken, nothing is won) or for PP: each puts up the stake, at least
// MIN_STAKE and at most what the poorer of the two has (MAX_STAKE, if it's
// ever set, caps it further). The winner takes both stakes, in P-PP.
export const FUN = 0
export const MIN_STAKE = 2
export const MAX_STAKE = null
export const QUICK_STAKES = [2, 10, 50, 100, 500, 1000]

// What winning pays, in P-PP: the whole pot. 100 each -> 200.
export function prizeFor(stake) {
  return stake * 2
}

// 4000 -> "4,000"
export function formatPoints(points) {
  return Number(points).toLocaleString('en-US')
}

// What's wrong with `stake` for a game between two members, or '' if
// nothing is. `max` is what the poorer of the two has. 0 is For Fun, and
// always fine.
export function stakeProblem(stake, max) {
  if (stake === FUN) return ''
  if (!Number.isInteger(stake)) return 'A stake is a whole number of points.'
  if (stake < MIN_STAKE) return `The smallest stake is ${MIN_STAKE}.`
  if (MAX_STAKE !== null && stake > MAX_STAKE) return `Stakes go up to ${formatPoints(MAX_STAKE)}.`
  if (max !== null && max !== undefined) {
    if (max < MIN_STAKE) return `One of you has fewer than ${MIN_STAKE} points, so there's nothing to play for yet.`
    if (stake > max) return `The most you two can play for right now is ${formatPoints(max)}.`
  }
  return ''
}

// A board of `size` x `size` points, as one flat list read row by row:
// null for an empty point, or the seat (0 or 1) whose stone is there.
export function emptyBoard(size) {
  return Array(size * size).fill(null)
}

export const pointIndex = (size, x, y) => y * size + x

export function isOnBoard(size, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size && y < size
}

// The board after `moves` ([{ x, y, seat }], in order).
export function boardOf(size, moves) {
  const board = emptyBoard(size)
  for (const move of moves) board[pointIndex(size, move.x, move.y)] = move.seat
  return board
}

// The four ways a line can run: across, down, and both diagonals.
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

// If the stone at (x, y) is part of WIN_LENGTH or more in a row, the
// points of that row ([[x, y], ...], end to end), else null. Only lines
// through (x, y) are looked at, so call it with the move just made.
export function winningLine(board, size, x, y) {
  const seat = board[pointIndex(size, x, y)]
  if (seat === null || seat === undefined) return null

  for (const [dx, dy] of DIRECTIONS) {
    const line = [[x, y]]
    for (const sign of [-1, 1]) {
      let cx = x + dx * sign
      let cy = y + dy * sign
      while (isOnBoard(size, cx, cy) && board[pointIndex(size, cx, cy)] === seat) {
        if (sign < 0) line.unshift([cx, cy])
        else line.push([cx, cy])
        cx += dx * sign
        cy += dy * sign
      }
    }
    if (line.length >= WIN_LENGTH) return line
  }
  return null
}

export function isFull(board) {
  return board.every((point) => point !== null)
}

// Whose turn it is after `moveCount` moves: seat 0 moves first.
export const seatToMove = (moveCount) => moveCount % 2

// A move's name on the board, like "H8": a letter for the column (I is
// skipped, as on Go boards) and a number for the row, counted from the
// bottom.
const COLUMNS = 'ABCDEFGHJKLMNOP'
export function pointName(size, x, y) {
  return `${COLUMNS[x]}${size - y}`
}
