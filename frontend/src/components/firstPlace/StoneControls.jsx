import { useLayoutEffect, useRef, useState } from 'react'
import { DEFAULT_INTERVAL, DEFAULT_ORDER, MAX_INTERVAL, MIN_INTERVAL, STONES, STONE_IDS } from '../../../../shared/firstPlace/config.js'

const SMALL_BUTTON =
  'cursor-pointer rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-default disabled:opacity-40'
const DRAG_FROM = 6 // px the pointer moves before a press becomes a drag

const clampInterval = (seconds) => Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, seconds))
const pointerIn = (element, event) => {
  if (!element) return false
  const box = element.getBoundingClientRect()
  return event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom
}

// One stone: its place, its gem and name (tap to turn it on or off), and ‹ ›
// to move it. The whole card can be dragged to a new place.
function StoneCard({ id, position, on, last, dragging, cardRef, onToggle, onMove, drag }) {
  const stone = STONES[id]
  return (
    <div
      ref={cardRef}
      {...drag}
      style={{ '--c': stone.color, ...(on ? { background: `color-mix(in srgb, ${stone.color} 12%, #0b0b12)` } : {}) }}
      className={`relative flex touch-none flex-col overflow-hidden rounded-xl border bg-[#0b0b12] select-none ${
        dragging ? 'z-10 cursor-grabbing shadow-[0_12px_30px_rgba(0,0,0,0.6),0_0_0_1px_var(--c)]' : 'cursor-grab transition-[border-color,box-shadow,background]'
      } ${on ? 'border-(--c) shadow-[inset_0_0_0_1px_var(--c),0_0_18px_-4px_var(--c)]' : 'border-[#26263c]'}`}
    >
      <span className="absolute top-1 left-2 text-[10px] font-bold text-[#5d5a78] tabular-nums">{position + 1}</span>
      <button
        type="button"
        onClick={onToggle}
        disabled={on && last}
        aria-pressed={on}
        title={on && last ? 'Keep at least one stone on' : undefined}
        className={`flex w-full flex-col items-center gap-1.5 px-1 pt-3 pb-2 text-xs font-semibold focus-visible:rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--c) disabled:cursor-not-allowed ${
          on ? 'text-white' : 'text-[#8d8aa8]'
        }`}
      >
        <span
          aria-hidden="true"
          className="h-6.5 w-5.5 transition-[opacity,filter]"
          style={{
            clipPath: 'polygon(50% 0, 100% 30%, 82% 100%, 18% 100%, 0 30%)',
            background: `linear-gradient(160deg, color-mix(in srgb, ${stone.color} 35%, #fff), ${stone.color} 45%, color-mix(in srgb, ${stone.color} 55%, #000))`,
            opacity: on ? 1 : 0.3,
            filter: on ? `drop-shadow(0 0 6px ${stone.color})` : 'saturate(0.4)',
          }}
        />
        {stone.name}
      </button>
      <div className="flex border-t border-[#1f1f31]">
        {[
          [-1, '‹', 'left'],
          [1, '›', 'right'],
        ].map(([step, arrow, way]) => (
          <button
            key={way}
            type="button"
            data-move=""
            onClick={() => onMove(step)}
            disabled={(step < 0 && position === 0) || (step > 0 && position === STONE_IDS.length - 1)}
            aria-label={`Move ${stone.name} ${way}`}
            className="flex-1 cursor-pointer py-1.5 text-sm leading-none text-[#8d8aa8] not-first:border-l not-first:border-[#1f1f31] hover:not-disabled:bg-[#1a1a29] hover:not-disabled:text-white disabled:cursor-default disabled:opacity-20"
          >
            {arrow}
          </button>
        ))}
      </div>
    </div>
  )
}

// The First Place effect's stones and timing, for its editor on the
// profile page and the developer test tool. `value` is the settings
// (shared/firstPlace/config.js) and `onChange` gets new ones; nothing is
// saved here. Stones: tap to turn on or off (one always stays on), drag or
// ‹ › to change where each colour sits in the name. Random, and each
// stone's interval in seconds.
export default function StoneControls({ value, onChange }) {
  const cards = useRef(new Map())
  const drag = useRef(null)
  const justDragged = useRef(false)
  const [dragging, setDragging] = useState(null)
  const [pointer, setPointer] = useState(null)
  const [intervalsOpen, setIntervalsOpen] = useState(false)
  // What's typed in an interval box until it's left, so "0." isn't undone.
  const [typing, setTyping] = useState({})

  const { order, stones } = value
  const onCount = stones.length

  // While dragging, the card follows the pointer from wherever the new
  // order has put it.
  useLayoutEffect(() => {
    const held = drag.current
    if (!dragging || !held || !pointer) return
    const card = cards.current.get(dragging)
    if (!card) return
    card.style.transform = 'none'
    const box = card.getBoundingClientRect()
    card.style.transform = `translate(${pointer.x - held.grabX - box.left}px, ${pointer.y - held.grabY - box.top}px)`
  }, [dragging, pointer, order])

  const setOrder = (next) => onChange({ ...value, order: next })

  const toggle = (id) => {
    if (justDragged.current) return
    const on = stones.includes(id)
    if (on && onCount === 1) return
    onChange({ ...value, stones: on ? stones.filter((stone) => stone !== id) : STONE_IDS.filter((stone) => stone === id || stones.includes(stone)) })
  }

  const move = (id, step) => {
    const from = order.indexOf(id)
    const to = from + step
    if (to < 0 || to >= order.length) return
    const next = [...order]
    ;[next[from], next[to]] = [next[to], next[from]]
    setOrder(next)
  }

  const endDrag = () => {
    const held = drag.current
    drag.current = null
    if (!held?.moved) return
    const card = cards.current.get(held.id)
    if (card) card.style.transform = ''
    setDragging(null)
    setPointer(null)
    // The click that ends a drag isn't a tap on the stone.
    justDragged.current = true
    setTimeout(() => {
      justDragged.current = false
    }, 0)
  }

  const dragHandlers = (id) => ({
    onPointerDown: (event) => {
      if (event.button !== 0 || event.target.closest('[data-move]')) return
      const box = event.currentTarget.getBoundingClientRect()
      drag.current = { id, startX: event.clientX, startY: event.clientY, grabX: event.clientX - box.left, grabY: event.clientY - box.top, moved: false }
    },
    onPointerMove: (event) => {
      const held = drag.current
      if (!held || held.id !== id) return
      if (!held.moved) {
        if (Math.hypot(event.clientX - held.startX, event.clientY - held.startY) < DRAG_FROM) return
        held.moved = true
        // Only now does the card keep the pointer wherever it goes. Taking
        // it on the press would send a plain tap's click to the card, not
        // the stone's button, and the stone would never turn on or off.
        event.currentTarget.setPointerCapture?.(event.pointerId)
        setDragging(id)
      }
      event.preventDefault()
      const over = order.find((other) => other !== id && pointerIn(cards.current.get(other), event))
      if (over) {
        const next = order.filter((stone) => stone !== id)
        next.splice(next.indexOf(over) + (order.indexOf(id) < order.indexOf(over) ? 1 : 0), 0, id)
        setOrder(next)
      }
      setPointer({ x: event.clientX, y: event.clientY })
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  })

  const setSeconds = (id, seconds) => onChange({ ...value, intervals: { ...value.intervals, [id]: seconds } })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold tracking-widest text-white/60 uppercase">Stones · order across the name</span>
          <span className="flex gap-2">
            <button type="button" onClick={() => onChange({ ...value, stones: [...STONE_IDS] })} disabled={onCount === STONE_IDS.length} className={SMALL_BUTTON}>
              All stones
            </button>
            <button type="button" onClick={() => setOrder([...DEFAULT_ORDER])} className={SMALL_BUTTON}>
              Set to default
            </button>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {order.map((id, position) => (
            <StoneCard
              key={id}
              id={id}
              position={position}
              on={stones.includes(id)}
              last={onCount === 1}
              dragging={dragging === id}
              cardRef={(element) => {
                if (element) cards.current.set(id, element)
                else cards.current.delete(id)
              }}
              onToggle={() => toggle(id)}
              onMove={(step) => move(id, step)}
              drag={dragHandlers(id)}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-white/40">Tap a stone to turn it on or off. Drag it (or use ‹ ›) to change where its colour sits in the name.</p>
      </div>

      <div className="border-t border-white/10 pt-4">
        <span className="text-xs font-semibold tracking-widest text-white/60 uppercase">Flare &amp; glow timing</span>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-white">
            <input type="checkbox" checked={value.random} onChange={(event) => onChange({ ...value, random: event.target.checked })} className="size-4.5 accent-brand-gold" />
            Random
          </label>
          <button type="button" onClick={() => setIntervalsOpen(!intervalsOpen)} aria-expanded={intervalsOpen} className={SMALL_BUTTON}>
            Change intervals
          </button>
        </div>
        <p className="mt-2 text-xs text-white/40">
          {value.random
            ? 'Random: flares and glows pulse out of step, each around its own interval.'
            : 'Wave: flares and glows pulse from left to right, each at its own interval.'}
        </p>

        {intervalsOpen && (
          <div className="mt-3 rounded-xl border border-[#26263c] bg-[#0b0b12] p-3.5">
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-2 sm:grid-cols-3">
              {order.map((id) => {
                const stone = STONES[id]
                return (
                  <label key={id} className="flex items-center gap-2 text-sm text-white/80">
                    <i className="size-2.5 flex-none rounded-[3px]" style={{ background: stone.color, boxShadow: `0 0 6px ${stone.color}` }} />
                    <span className="flex-1">{stone.name}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={MIN_INTERVAL}
                      max={MAX_INTERVAL}
                      step="0.1"
                      value={typing[id] ?? value.intervals[id]}
                      onChange={(event) => {
                        const text = event.target.value
                        setTyping({ ...typing, [id]: text })
                        const seconds = parseFloat(text)
                        if (Number.isFinite(seconds) && seconds >= MIN_INTERVAL && seconds <= MAX_INTERVAL) setSeconds(id, seconds)
                      }}
                      onBlur={(event) => {
                        const seconds = parseFloat(event.target.value)
                        setSeconds(id, Number.isFinite(seconds) ? clampInterval(seconds) : value.intervals[id])
                        const rest = { ...typing }
                        delete rest[id]
                        setTyping(rest)
                      }}
                      aria-label={`${stone.name} interval in seconds`}
                      className="w-16 rounded-lg border border-[#2c2c46] bg-[#13131d] px-1.5 py-1 text-right text-sm text-white invalid:border-red-500 focus:outline-2 focus:outline-brand-gold"
                    />
                    <em className="text-xs text-white/40 not-italic">s</em>
                  </label>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-white/40">
                Seconds per pulse ({MIN_INTERVAL}–{MAX_INTERVAL}). Lower is faster.
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTyping({})
                    onChange({ ...value, intervals: Object.fromEntries(STONE_IDS.map((id) => [id, DEFAULT_INTERVAL])) })
                  }}
                  className={SMALL_BUTTON}
                >
                  Set to default
                </button>
                <button type="button" onClick={() => setIntervalsOpen(false)} className={`${SMALL_BUTTON} border-brand-gold/60 bg-brand-gold/20`}>
                  Done
                </button>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
