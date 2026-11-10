import { useEffect, useRef, useState } from 'react'

// How long each move stays before the next lands: the game at 4× speed.
const STEP_MS = 900 / 4

// Watching a finished game again (components/gomoku/ReplayControls.jsx):
// the moves one at a time, each landing with its player's shockwave, its
// sound and a buzz, as in the game, or stepped and scrubbed by hand.
// `moves` are in the order they were played; `waveFor(seat)` is that
// player's shockwave. Nothing here changes the game.
//
// { step, total, shown, impact, playing, play, pause, goTo, back,
// forward }: `shown` is the moves up to `step`.
export default function useGomokuReplay(moves, waveFor) {
  const total = moves.length
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [impact, setImpact] = useState(null)
  const impacts = useRef(0)

  // Moves to `to`. Stepping forward one lands that move; jumping (the
  // slider) or going back just shows the board as it was.
  const goTo = (to, { animate = false } = {}) => {
    const next = Math.min(total, Math.max(0, to))
    setStep(next)
    if (animate && next > 0) {
      const move = moves[next - 1]
      impacts.current += 1
      setImpact({ x: move.x, y: move.y, wave: waveFor(move.seat), key: impacts.current })
    } else {
      setImpact(null)
    }
  }

  // Playing: the next move lands after a moment, until the last.
  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(
      () => {
        const next = step + 1
        if (next > total) {
          setPlaying(false)
          return
        }
        goTo(next, { animate: true })
        if (next === total) setPlaying(false)
      },
      step === 0 ? 350 : STEP_MS
    )
    return () => clearTimeout(timer)
  })

  return {
    step,
    total,
    shown: moves.slice(0, step),
    impact,
    playing,
    play: () => {
      // From the end, Play starts it again.
      if (step >= total) goTo(0)
      setPlaying(true)
    },
    pause: () => setPlaying(false),
    goTo: (to) => {
      setPlaying(false)
      goTo(to)
    },
    back: () => {
      setPlaying(false)
      goTo(step - 1)
    },
    forward: () => {
      setPlaying(false)
      goTo(step + 1, { animate: true })
    },
  }
}
