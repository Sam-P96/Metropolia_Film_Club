import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Piece from './Piece'
import { ShockwaveLayer } from './shockwave'
import { HAPTIC, haptic, playLand, wakeAudio } from './feedback'
import { DEFAULTS, gomokuItem } from '../../../../shared/gomoku/catalogue.js'
import { pointIndex, pointName } from '../../../../shared/gomoku/rules.js'

// How far the shockwave jolts the stones around where one lands, in points.
const JOLT_REACH = 3

// Each point's own breath for an Infinity Stone on it (Piece.jsx Gem): a
// pace and a start that look random but are always the same for the same
// point, so neighbours don't pulse together and a stone keeps its rhythm.
function breathAt(x, y) {
  const noise = (seed) => {
    const value = Math.sin(seed) * 43758.5453
    return value - Math.floor(value)
  }
  return {
    '--gmk-delay': `${(-noise(x * 12.9898 + y * 78.233) * 3).toFixed(2)}s`,
    '--gmk-length': `${(2.2 + noise(x * 39.3468 + y * 11.135) * 1.2).toFixed(2)}s`,
  }
}

const lookOf = (id, kind) => (gomokuItem(id) ?? gomokuItem(DEFAULTS[kind])).look

// The grid's lines, drawn through the middle of each point. The rainbow
// grid gets its own gradient (`gradientId`).
function Grid({ size, gridId, gradientId }) {
  const look = lookOf(gridId, 'grid')
  const rainbow = gridId === 'grid.rainbow'
  const ends = [0.5, size - 0.5]
  const lines = Array.from({ length: size }, (_, i) => i + 0.5)

  return (
    <svg
      className={`gmk-grid ${look.cls}`}
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={rainbow ? { stroke: `url(#${gradientId})`, fill: `url(#${gradientId})` } : undefined}
    >
      {rainbow && (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={size} y2={size}>
            {['#ff2a4d', '#ff9a00', '#ffe23a', '#39ff6a', '#2ab7ff', '#a35bff', '#ff3dd8'].map((color, i, all) => (
              <stop key={color} offset={`${(i / (all.length - 1)) * 100}%`} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
      )}
      {lines.map((at, i) => {
        const edge = i === 0 || i === size - 1 ? 'gmk-edge' : undefined
        return (
          <g key={at}>
            <line x1={ends[0]} y1={at} x2={ends[1]} y2={at} className={edge} />
            <line x1={at} y1={ends[0]} x2={at} y2={ends[1]} className={edge} />
          </g>
        )
      })}
    </svg>
  )
}

// A board with its grid and nothing on it, `px` wide: the shop's boards
// and grids.
export function BoardSwatch({ boardId, gridId, size = 5, px = 72 }) {
  const gradientId = `gmk-rainbow-${useId().replace(/:/g, '')}`
  return (
    <div className={`gmk-board ${lookOf(boardId, 'board').cls}`} style={{ width: px, borderRadius: 10 }} aria-hidden="true">
      <Grid size={size} gridId={gridId} gradientId={gradientId} />
    </div>
  )
}

// Over the board once the game is over: who won (or that it's a draw), in
// big letters, and how. "See the board" shrinks it to a strip along the
// top, still saying who won, and tapping that brings it back.
function ResultBanner({ title, detail, tone = 'win' }) {
  const [small, setSmall] = useState(false)
  const gold = tone === 'win'

  if (small) {
    return (
      <button
        type="button"
        onClick={() => setSmall(false)}
        className="absolute inset-x-0 top-2 z-[6] mx-auto flex w-fit max-w-[92%] cursor-pointer items-center justify-center gap-2 rounded-full border border-brand-gold/70 bg-ink/85 px-4 py-1.5 text-center text-sm font-bold text-brand-gold shadow-lg shadow-black/50 backdrop-blur-sm"
      >
        {gold && <span aria-hidden="true">👑</span>}
        <span className="truncate">{title}</span>
      </button>
    )
  }

  return (
    <div className="absolute inset-0 z-[6] flex animate-page-in items-center justify-center bg-ink/55 p-4 backdrop-blur-[2px] motion-reduce:animate-none">
      <div className="flex max-w-full flex-col items-center gap-2 rounded-2xl border border-brand-gold/60 bg-ink/85 px-6 py-5 text-center shadow-2xl shadow-black/60">
        {gold && (
          <span className="text-4xl" aria-hidden="true">
            👑
          </span>
        )}
        <p className={`font-['Cinzel'] text-3xl leading-tight break-words sm:text-4xl ${gold ? 'text-brand-gold drop-shadow-[0_0_14px_rgba(250,188,63,0.55)]' : 'text-white'}`}>
          {title}
        </p>
        {detail && <p className="text-white/80">{detail}</p>}
        <button type="button" onClick={() => setSmall(true)} className="mt-1 cursor-pointer text-sm text-white/60 underline underline-offset-4 hover:text-white">
          See the board
        </button>
      </div>
    </div>
  )
}

// The board: its grid, the stones, the point you've picked (a ghost of
// your piece, waiting for the confirm button under the board) and the
// shockwaves. It draws; the page decides.
//   size              points per side
//   moves             [{ x, y, seat }], in order
//   pieceFor(seat)    { id, invert }: how that seat's stones look to you
//   boardId, gridId   your board and grid (each player sees their own)
//   ghost             { id, invert }: your piece, for the point you picked
//   selected          { x, y } or null; onSelect(x, y) picks a point
//   canPlay           whether you can pick a point now
//   winLine           [[x, y], ...]: the five that won, lit up
//   impact            { x, y, wave, key, confirmed }: a stone landing at
//                     (x, y) with shockwave `wave` (an item id). A new `key`
//                     sets it off, with its sound and a buzz as it lands
//                     and rolls out (`confirmed`: just placed here, so a
//                     click first).
//   markLast          whether to dot the newest stone (not once a game's
//                     replay is deleted: its moves are then in no order)
//   result            { title, detail, tone }: once it's over, who won,
//                     over the board (tone 'win', or 'draw')
//   label             what the board is, for screen readers
export default function Board({ size, moves, pieceFor, boardId, gridId, ghost, selected, onSelect, canPlay, winLine = [], impact, result, markLast = true, label }) {
  const boardRef = useRef(null)
  const canvasRef = useRef(null)
  const layerRef = useRef(null)
  const gradientId = `gmk-rainbow-${useId().replace(/:/g, '')}`
  const [cell, setCell] = useState(24)

  // One point's width, for the pieces' size and the shockwave's reach.
  useLayoutEffect(() => {
    const board = boardRef.current
    const observer = new ResizeObserver(([entry]) => setCell(entry.contentRect.width / size))
    observer.observe(board)
    return () => observer.disconnect()
  }, [size])

  useEffect(() => {
    const layer = new ShockwaveLayer(canvasRef.current)
    layerRef.current = layer
    return () => layer.stop()
  }, [])

  // A stone landing: its shockwave, from the middle of its point.
  useEffect(() => {
    if (!impact || !layerRef.current || !boardRef.current) return
    const width = boardRef.current.getBoundingClientRect().width / size
    layerRef.current.play({ x: (impact.x + 0.5) * width, y: (impact.y + 0.5) * width, cell: width, look: lookOf(impact.wave, 'shockwave') })
    haptic(impact.confirmed ? HAPTIC.confirm : HAPTIC.land)
    playLand()
    // Only a new impact sets one off, not the board drawing again.
  }, [impact?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const stones = useMemo(() => {
    const at = new Map()
    moves.forEach((move, i) => at.set(pointIndex(size, move.x, move.y), { ...move, number: i + 1 }))
    return at
  }, [moves, size])
  const winning = useMemo(() => new Set(winLine.map(([x, y]) => pointIndex(size, x, y))), [winLine, size])
  const last = moves.at(-1)

  // Arrow keys move the picked point; the board is one stop for Tab.
  const cursor = selected ?? last ?? { x: Math.floor(size / 2), y: Math.floor(size / 2) }
  const handleKey = (event) => {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
    if (!step || !canPlay) return
    event.preventDefault()
    const x = Math.min(size - 1, Math.max(0, cursor.x + step[0]))
    const y = Math.min(size - 1, Math.max(0, cursor.y + step[1]))
    onSelect?.(x, y)
    boardRef.current?.querySelector(`[data-point="${x},${y}"]`)?.focus()
  }

  const boardLook = lookOf(boardId, 'board')
  const points = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const stone = stones.get(pointIndex(size, x, y))
      const picked = !stone && selected?.x === x && selected?.y === y
      const open = canPlay && !stone
      let piece = null

      if (stone) {
        const look = pieceFor(stone.seat)
        const classes = []
        let key = `${x},${y}`
        let style
        if (winning.has(pointIndex(size, x, y))) classes.push('gmk-win')
        if (markLast && last && stone.number === moves.length && !winning.size) classes.push('gmk-last')
        if (impact && impact.x === x && impact.y === y) {
          classes.push('gmk-land')
          key += `:${impact.key}`
        } else if (impact) {
          const dx = x - impact.x
          const dy = y - impact.y
          const distance = Math.hypot(dx, dy)
          if (distance <= JOLT_REACH) {
            const push = cell * 0.14 * (1 - (distance - 1) / JOLT_REACH)
            classes.push('gmk-jolt')
            key += `:${impact.key}`
            style = { '--jx': `${(dx / distance) * push}px`, '--jy': `${(dy / distance) * push}px`, '--d': `${Math.round(distance * 30)}ms` }
          }
        }
        piece = <Piece key={key} id={look.id} invert={look.invert} className={classes.join(' ')} style={style} />
      } else if (picked && ghost) {
        piece = <Piece id={ghost.id} invert={ghost.invert} className="gmk-ghost" />
      }

      const whose = stone ? (stone.seat === 0 ? 'first player' : 'second player') : picked ? 'picked' : 'empty'
      points.push(
        <button
          key={`${x},${y}`}
          type="button"
          data-point={`${x},${y}`}
          data-open={open}
          tabIndex={cursor.x === x && cursor.y === y ? 0 : -1}
          aria-label={`${pointName(size, x, y)}, ${whose}`}
          aria-pressed={picked || undefined}
          onClick={() => {
            if (!open) return
            // A tap lets the page make sound from here on.
            wakeAudio()
            haptic(HAPTIC.pick)
            onSelect?.(x, y)
          }}
          className="gmk-point"
          style={stone ? breathAt(x, y) : undefined}
        >
          {piece}
        </button>
      )
    }
  }

  return (
    <div
      ref={boardRef}
      className={`gmk-board ${boardLook.cls}`}
      style={{ '--cell': `${cell}px` }}
      role="group"
      aria-label={label}
      onKeyDown={handleKey}
    >
      <Grid size={size} gridId={gridId} gradientId={gradientId} />
      <div className="gmk-points" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)`, color: boardLook.ink }}>
        {points}
      </div>
      <canvas ref={canvasRef} className="gmk-fx" aria-hidden="true" />
      {result && <ResultBanner key={result.title} {...result} />}
    </div>
  )
}
