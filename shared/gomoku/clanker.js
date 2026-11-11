// Clanker, Infinite Gomoku's computer player (vs Clanker, Play For Fun only:
// frontend/src/pages/GomokuClanker.jsx). Plain functions, no React, so the
// tests can play it too (backend/tests/gomoku.test.js).
//
// It plays to win: it takes a five when it has one, blocks yours when you
// have one, and otherwise looks four moves ahead (its move, yours, its,
// yours) over the most promising points, judging each position by every
// five-point stretch of the board. But 1 move in 20 it fumbles: it plays a
// plausible point that isn't its best, which can be a win it misses or a
// threat it leaves open.

export const CLANKER_NAME = 'Clanker'
export const FUMBLE_CHANCE = 0.05

// How many moves ahead it looks, and how many points it considers at the
// top and further down.
const DEPTH = 4
const ROOT_WIDTH = 12
const WIDTH = 8

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

const WIN = 1e9

// What a five-point stretch (a window) is worth to a side with this many
// of its stones in it and none of the other side's: one stone is nothing
// much, four is one move from five.
const LINE = [0, 1, 18, 300, 6000, WIN]

// Every window on a board of `size`, as lists of point indexes, and the
// windows each point is in. Worked out once per size.
const SHAPES = new Map()
function shapeOf(size) {
  if (!SHAPES.has(size)) {
    const windows = []
    const through = Array.from({ length: size * size }, () => [])
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        for (const [dx, dy] of DIRECTIONS) {
          const ex = x + dx * 4
          const ey = y + dy * 4
          if (ex < 0 || ey < 0 || ex >= size || ey >= size) continue
          const points = [0, 1, 2, 3, 4].map((i) => (y + dy * i) * size + (x + dx * i))
          for (const point of points) through[point].push(windows.length)
          windows.push(points)
        }
      }
    }
    SHAPES.set(size, { windows, through })
  }
  return SHAPES.get(size)
}

// How good it would be for `who` to play the empty point `index`: every
// window through it that the other side has no stone in, by how many of
// `who`'s stones it would then hold.
function pointScore(board, shape, index, who) {
  let total = 0
  for (const w of shape.through[index]) {
    let mine = 0
    let blocked = false
    for (const point of shape.windows[w]) {
      const stone = board[point]
      if (stone === who) mine += 1
      else if (stone !== null) {
        blocked = true
        break
      }
    }
    if (!blocked) total += LINE[Math.min(5, mine + 1)]
  }
  return total
}

// Whether the stone at `index` makes five or more in a row.
function makesFive(board, size, index) {
  const who = board[index]
  const x = index % size
  const y = Math.floor(index / size)
  for (const [dx, dy] of DIRECTIONS) {
    let run = 1
    for (const sign of [-1, 1]) {
      let cx = x + dx * sign
      let cy = y + dy * sign
      while (cx >= 0 && cy >= 0 && cx < size && cy < size && board[cy * size + cx] === who) {
        run += 1
        cx += dx * sign
        cy += dy * sign
      }
    }
    if (run >= 5) return true
  }
  return false
}

// The position from the point of view of `who`, whose move it is: their
// windows count for a little more than the other side's, since they get
// to use them first.
function evaluate(board, shape, who) {
  let total = 0
  for (const points of shape.windows) {
    let mine = 0
    let theirs = 0
    for (const point of points) {
      const stone = board[point]
      if (stone === who) mine += 1
      else if (stone !== null) theirs += 1
    }
    if (mine && !theirs) total += LINE[mine] * 1.2
    else if (theirs && !mine) total -= LINE[theirs]
  }
  return total
}

// The empty points within two of a stone, the most promising first (good
// for `who`, or good for the other side and so worth taking from them), at
// most `width` of them.
function candidates(board, size, shape, who, width) {
  const near = new Set()
  for (let index = 0; index < board.length; index++) {
    if (board[index] === null) continue
    const x = index % size
    const y = Math.floor(index / size)
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
        if (board[ny * size + nx] === null) near.add(ny * size + nx)
      }
    }
  }
  const other = 1 - who
  return [...near]
    .map((index) => ({ index, score: pointScore(board, shape, index, who) + 0.9 * pointScore(board, shape, index, other) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, width)
    .map((entry) => entry.index)
}

// How good the position is for `who`, to move, looking `depth` moves on
// (negamax with alpha-beta pruning). Quicker wins score higher.
function search(board, size, shape, depth, alpha, beta, who) {
  const moves = candidates(board, size, shape, who, WIDTH)
  if (moves.length === 0) return 0
  let best = -Infinity
  for (const index of moves) {
    board[index] = who
    let score
    if (makesFive(board, size, index)) score = WIN + depth
    else if (depth <= 1) score = -evaluate(board, shape, 1 - who)
    else score = -search(board, size, shape, depth - 1, -beta, -alpha, 1 - who)
    board[index] = null
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

// Clanker's move on `board` (a flat list, row by row: null, 0 or 1, as in
// rules.js), playing as `seat`. Returns [x, y]. `random()` (0 to 1) decides
// fumbles and breaks ties: Math.random unless a test passes its own.
export function clankerMove(board, size, seat, { random = Math.random } = {}) {
  const work = [...board]
  const shape = shapeOf(size)
  const point = (index) => [index % size, Math.floor(index / size)]
  const other = 1 - seat

  // The first move: the middle, or next to the only stone down.
  const stones = work.filter((stone) => stone !== null).length
  const middle = Math.floor(size / 2) * size + Math.floor(size / 2)
  if (stones === 0) return point(middle)

  const ranked = candidates(work, size, shape, seat, ROOT_WIDTH)
  if (ranked.length === 0) {
    const empty = work.findIndex((stone) => stone === null)
    return point(empty)
  }

  // 1 move in 20: a fumble. Somewhere plausible, but not the best.
  if (ranked.length > 1 && random() < FUMBLE_CHANCE) {
    const pool = ranked.slice(1, 8)
    return point(pool[Math.floor(random() * pool.length)])
  }

  // Five in a row now, if it's there.
  for (const index of ranked) {
    work[index] = seat
    const five = makesFive(work, size, index)
    work[index] = null
    if (five) return point(index)
  }
  // Their five next move, blocked.
  for (const index of candidates(work, size, shape, other, ROOT_WIDTH)) {
    work[index] = other
    const five = makesFive(work, size, index)
    work[index] = null
    if (five) return point(index)
  }

  // Otherwise the best of the most promising points, looking ahead.
  let best = null
  let bestScore = -Infinity
  for (const index of ranked) {
    work[index] = seat
    // A hair of randomness between moves that are as good as each other.
    const score = -search(work, size, shape, DEPTH - 1, -Infinity, Infinity, other) + random()
    work[index] = null
    if (score > bestScore) {
      bestScore = score
      best = index
    }
  }
  return point(best)
}
