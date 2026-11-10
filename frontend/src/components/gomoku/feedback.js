import { haptic, playNoise, playVoice, wakeAudio } from '../slots/feedback'

// Infinite Gomoku's sounds and haptics, through the Slot Machine's (like
// Kino Poker's). Sounds are synthesised with Web Audio, no audio files, and
// muted with the game's sound button; the choice is remembered on this
// device. Haptics buzz whether or not the sound is on.

// ---- Sound settings, to tune by ear ----
// Pitches in Hz, times in milliseconds, volumes as peaks.
const SOUND = {
  // A piece landing: a hard, bright hit. A sharp crack of noise, a crunchy
  // zap sweeping down, a punchy body and a low thump, all at once, then one
  // faint slap of an echo just after (kept short: no long tail).
  land: {
    crack: { hz: 3300, q: 1.1, ms: 55, volume: 0.16 },
    zap: { fromHz: 1500, toHz: 240, ms: 95, volume: 0.05 },
    body: { fromHz: 340, toHz: 110, ms: 140, volume: 0.12 },
    thump: { fromHz: 150, toHz: 46, ms: 190, volume: 0.26 },
    echo: { delayMs: 75, share: 0.22 },
  },
}

const MUTE_KEY = 'gomoku-muted'

let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
})()

export const isMuted = () => muted

export function setMuted(value) {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    // Private mode: it just won't be remembered.
  }
}

// The hit itself, at `at` (seconds, on the audio clock), `scale` times as loud.
function hit(context, at, scale) {
  const { crack, zap, body, thump } = SOUND.land
  playNoise(context, { at, ms: crack.ms, fromHz: crack.hz, toHz: crack.hz * 0.7, q: crack.q, volume: crack.volume * scale, attackMs: 1 })
  playVoice(context, { at, ms: zap.ms, type: 'square', fromHz: zap.fromHz, toHz: zap.toHz, volume: zap.volume * scale, attackMs: 1 })
  playVoice(context, { at, ms: body.ms, type: 'triangle', fromHz: body.fromHz, toHz: body.toHz, volume: body.volume * scale, attackMs: 2 })
  playVoice(context, { at, ms: thump.ms, type: 'sine', fromHz: thump.fromHz, toHz: thump.toHz, volume: thump.volume * scale, attackMs: 2 })
}

// A piece landing (yours, theirs, or one in a replay).
export function playLand() {
  if (muted) return
  const context = wakeAudio()
  if (!context) return
  const at = context.currentTime + 0.005
  hit(context, at, 1)
  hit(context, at + SOUND.land.echo.delayMs / 1000, SOUND.land.echo.share)
}

// ---- Haptics ----
// Patterns are [on, off, on, ...] in milliseconds.
export const HAPTIC = {
  // Tapping a point to pick it: a light tick.
  pick: 8,
  // A piece landing, and its shockwave rolling out across the board and
  // fading away (about as long as the shockwave itself).
  land: [40, 30, 24, 35, 14, 40, 7],
}

// Pressing Place piece: a click, then the landing straight after. One
// pattern, because a new vibration cuts off the one before it.
HAPTIC.confirm = [14, 40, ...HAPTIC.land]

export { haptic, wakeAudio }
