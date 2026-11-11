import { useCallback, useEffect, useRef } from 'react'
import { clankerMove } from '../../../shared/gomoku/clanker.js'

// Clanker, for vs Clanker (pages/GomokuClanker.jsx): `think(board, size,
// seat)` resolves to its move, [x, y]. It thinks in a worker
// (components/gomoku/clankerWorker.js), so the page doesn't freeze; where
// workers aren't available, it thinks on the page instead.
export default function useClanker() {
  const worker = useRef(null)
  const waiting = useRef(new Map())
  const asked = useRef(0)

  useEffect(() => {
    let made = null
    try {
      made = new Worker(new URL('../components/gomoku/clankerWorker.js', import.meta.url), { type: 'module' })
      made.onmessage = (event) => {
        const resolve = waiting.current.get(event.data.id)
        waiting.current.delete(event.data.id)
        resolve?.(event.data.move)
      }
      worker.current = made
    } catch {
      worker.current = null
    }
    const pending = waiting.current
    return () => {
      made?.terminate()
      worker.current = null
      pending.clear()
    }
  }, [])

  return useCallback((board, size, seat) => {
    if (!worker.current) return new Promise((resolve) => setTimeout(() => resolve(clankerMove(board, size, seat)), 0))
    asked.current += 1
    const id = asked.current
    return new Promise((resolve) => {
      waiting.current.set(id, resolve)
      worker.current.postMessage({ id, board, size, seat })
    })
  }, [])
}
