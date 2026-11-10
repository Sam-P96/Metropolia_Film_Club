import { useState } from 'react'
import { isMuted, setMuted, wakeAudio } from './feedback'

// The game's sound on or off (components/gomoku/feedback.js), remembered on
// this device. Buzzing stays on either way.
export default function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted)

  const toggle = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
    if (!next) wakeAudio()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-center text-sm text-white/80 transition-colors hover:bg-white/10"
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
      {muted ? 'Sound off' : 'Sound on'}
    </button>
  )
}
