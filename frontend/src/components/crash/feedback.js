import { playNoise, playVoice, soundOutput, wakeAudio } from '../slots/feedback'

// Box Office Crash's sounds: a note that rises with the stock while a round
// plays, and a crash. Synthesised with Web Audio (no audio files), through
// the Slot Machine's engine and master volume (components/slots/
// feedback.js), and muted with the room's sound button; the choice is
// remembered on this device.

// ---- Sound settings, to tune by ear ----
// Pitches in Hz, times in milliseconds, volumes as peaks (for scale: the
// Slot Machine's win jingle is 0.09 a note).
const SOUND = {
  // While a round plays: a soft held note that follows the stock, up as it
  // rises and down as it falls. At 1x it's `baseHz`; every time the
  // multiplier doubles it climbs `octavesPerDouble` of an octave, so the
  // 25x cap is two octaves up, 880 Hz. It never goes past `maxHz` (880 Hz,
  // the A a singer reaches comfortably), however high the stock: bright,
  // never piercing. A triangle with a sine an octave below, under a
  // lowpass, so it stays round rather than buzzy. It pulses, faster as the
  // stock climbs: that carries the excitement, instead of more pitch.
  rise: {
    baseHz: 220,
    octavesPerDouble: 0.43,
    minHz: 140,
    maxHz: 880,
    glideMs: 90,
    fadeInMs: 250,
    fadeOutMs: 120,
    volume: 0.035,
    sub: 0.6, // the note an octave down, as a share of the main one
    lowpassHz: 1800,
    pulse: { fromHz: 2.5, perX: 0.5, maxHz: 9, depth: 0.35 },
  },
  // The crash: the note falls away from wherever it was, under a low boom
  // of noise, a crunch and a deep thump. All low and mid: nothing sharp.
  crash: {
    fall: { toHz: 70, ms: 650, volume: 0.06 },
    boom: { fromHz: 1600, toHz: 90, ms: 900, volume: 0.2 },
    crunch: { hz: 900, q: 0.8, ms: 180, volume: 0.07 },
    thump: { fromHz: 130, toHz: 38, ms: 450, volume: 0.28 },
  },
}

const MUTE_KEY = 'crash-muted'

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

export { wakeAudio }

// The held note's pitch for multiplier `m`, kept between minHz and maxHz.
function pitchFor(m) {
  const { baseHz, octavesPerDouble, minHz, maxHz } = SOUND.rise
  return Math.min(maxHz, Math.max(minHz, baseHz * Math.pow(Math.max(m, 0.01), octavesPerDouble)))
}

// How fast the held note pulses at `m`: quicker as the stock climbs.
function pulseFor(m) {
  const { fromHz, perX, maxHz } = SOUND.rise.pulse
  return Math.min(maxHz, fromHz + perX * Math.max(0, m - 1))
}

// The held note starting, fading in, at `m`'s pitch. Returns what glide()
// and fade() need to move and end it.
function startNote(context, m) {
  const { rise } = SOUND
  const at = context.currentTime
  const hz = pitchFor(m)

  // The note's volume: faded in now, out at the end.
  const level = context.createGain()
  level.gain.setValueAtTime(0.0001, at)
  level.gain.exponentialRampToValueAtTime(rise.volume, at + rise.fadeInMs / 1000)

  // The pulse: a slow wobble of the volume around a steady middle.
  const pulse = context.createGain()
  pulse.gain.value = 1 - rise.pulse.depth / 2
  const wobble = context.createOscillator()
  wobble.frequency.value = pulseFor(m)
  const depth = context.createGain()
  depth.gain.value = rise.pulse.depth / 2
  wobble.connect(depth).connect(pulse.gain)

  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = rise.lowpassHz

  const main = context.createOscillator()
  main.type = 'triangle'
  main.frequency.value = hz
  const sub = context.createOscillator()
  sub.type = 'sine'
  sub.frequency.value = hz / 2
  const subLevel = context.createGain()
  subLevel.gain.value = rise.sub

  main.connect(filter)
  sub.connect(subLevel).connect(filter)
  filter.connect(pulse).connect(level).connect(soundOutput(context))
  for (const oscillator of [main, sub, wobble]) oscillator.start(at)

  return { context, main, sub, wobble, level, hz }
}

// The held note sliding to `m`'s pitch (and pulse), smoothly.
function glide(note, m) {
  const hz = pitchFor(m)
  if (Math.abs(hz - note.hz) < 0.5) return
  note.hz = hz
  const at = note.context.currentTime
  const ease = SOUND.rise.glideMs / 1000 / 3
  note.main.frequency.setTargetAtTime(hz, at, ease)
  note.sub.frequency.setTargetAtTime(hz / 2, at, ease)
  note.wobble.frequency.setTargetAtTime(pulseFor(m), at, ease)
}

// The held note fading out from wherever it is, then stopping. Never by
// reading its volume first: some browsers report the starting 1 (full
// volume) instead, which would make the fade a loud blip.
function fade(note) {
  const at = note.context.currentTime
  const end = at + SOUND.rise.fadeOutMs / 1000
  const gain = note.level.gain
  if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(at)
  else gain.cancelScheduledValues(at)
  gain.setTargetAtTime(0.0001, at, SOUND.rise.fadeOutMs / 1000 / 4)
  for (const oscillator of [note.main, note.sub, note.wobble]) oscillator.stop(end + 0.05)
}

// The crash itself, the note falling from `fromHz`.
function crashSound(context, fromHz) {
  const at = context.currentTime + 0.005
  const { fall, boom, crunch, thump } = SOUND.crash
  playVoice(context, { at, ms: fall.ms, type: 'triangle', fromHz, toHz: fall.toHz, volume: fall.volume, attackMs: 3 })
  playNoise(context, { at, ms: boom.ms, type: 'lowpass', fromHz: boom.fromHz, toHz: boom.toHz, q: 0.7, volume: boom.volume, attackMs: 2 })
  playNoise(context, { at, ms: crunch.ms, fromHz: crunch.hz, toHz: crunch.hz * 0.6, q: crunch.q, volume: crunch.volume, attackMs: 1 })
  playVoice(context, { at: at + 0.02, ms: thump.ms, type: 'sine', fromHz: thump.fromHz, toHz: thump.toHz, volume: thump.volume, attackMs: 2 })
}

// One per game screen (components/crash/CrashStage.jsx): frame() on every
// frame it draws, with the round as it shows it, and stop() when it closes
// or the tab is hidden. The held note plays while the round does, follows
// the multiplier, and ends with it; a crash is heard once, and only for a
// round heard playing (not one that had already crashed when you came in).
export function createCrashSound() {
  let note = null
  let heardPlaying = null
  let heardCrash = null

  const stop = () => {
    if (note) fade(note)
    note = null
  }

  const frame = ({ roundId, playing, crashed, m }) => {
    if (playing) heardPlaying = roundId

    if (crashed && heardPlaying === roundId && heardCrash !== roundId) {
      heardCrash = roundId
      const fromHz = note?.hz ?? pitchFor(m)
      stop()
      const context = muted ? null : wakeAudio()
      if (context) crashSound(context, fromHz)
      return
    }

    if (!playing || muted) return stop()
    if (note) return glide(note, m)
    // Before the first tap the browser keeps the sound paused: the note
    // waits, and comes in as soon as it's allowed.
    const context = wakeAudio()
    if (context) note = startNote(context, m)
  }

  return { frame, stop }
}
