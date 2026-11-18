import { useEffect, useState } from 'react'

// A game's sound on or off, remembered on this device. `sound` is the
// game's sound module (isMuted, setMuted and wakeAudio: components/crash/
// feedback.js, components/forrest/feedback.js). `className`: its look, to
// sit with the game's other controls.
//
// Browsers only let a page make sound after a tap or a key, so while it's
// on screen, the first tap or key anywhere wakes the sound (if it's on).
export default function SoundToggle({ sound, className = '' }) {
  const [muted, setMutedState] = useState(sound.isMuted)

  useEffect(() => {
    const wake = () => {
      if (!sound.isMuted()) sound.wakeAudio()
    }
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)
    return () => {
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [sound])

  const toggle = () => {
    const next = !muted
    sound.setMuted(next)
    setMutedState(next)
    if (!next) sound.wakeAudio()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap ${className}`}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
      {muted ? 'Sound off' : 'Sound on'}
    </button>
  )
}
