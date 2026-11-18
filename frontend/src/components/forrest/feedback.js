import { playNoise, playVoice, wakeAudio } from '../slots/feedback'

// Forrest Bounce's sounds, played from the run's cues (shared/forrest/
// engine.js cue()): jumps, landings, fruit, hearts, shurikens and a new
// stage. Synthesised with Web Audio (no audio files), through the Slot
// Machine's engine and master volume (components/slots/feedback.js), and
// muted with the game's sound button; the choice is remembered on this
// device.

// ---- Sound settings, to tune by ear ----
// Pitches in Hz, times in milliseconds, volumes as peaks (for scale: the
// Slot Machine's win jingle is 0.09 a note). Soft, round waves (sine and
// triangle) and nothing above about 1 600 Hz, so it's bright but never
// shrill.
const SOUND = {
  // The perched buddy hopping off the branch: a quick bouncy rise, with a
  // breath of air.
  jump: { fromHz: 300, toHz: 640, ms: 120, volume: 0.06, air: { fromHz: 900, toHz: 2000, ms: 140, volume: 0.018 } },
  // A double jump in mid-air: a higher hop and the flip's whoosh.
  doubleJump: { fromHz: 440, toHz: 900, ms: 120, volume: 0.05, air: { fromHz: 1100, toHz: 2400, ms: 170, volume: 0.025 } },
  // The seesaw flinging the other buddy up: a springy boing, up then
  // settling a little.
  launch: { upFromHz: 170, upToHz: 560, upMs: 150, settleToHz: 430, settleMs: 140, volume: 0.07, sparkle: 0.3 },
  // Landing on the seesaw: a woody thunk, a knock and a low body.
  land: { thunk: { fromHz: 150, toHz: 70, ms: 130, volume: 0.17 }, knock: { fromHz: 1200, toHz: 320, ms: 70, volume: 0.07 }, wood: { fromHz: 240, toHz: 180, ms: 70, volume: 0.04 } },
  // Landing on the branch: softer, with a rustle of leaves.
  perch: { thump: { fromHz: 200, toHz: 120, ms: 90, volume: 0.09 }, leaves: { hz: 2400, q: 0.6, ms: 170, volume: 0.022 } },
  // A fruit: a bling of two quick notes, brighter for the rarer fruit
  // (`tiers`, one pair a tier), with a soft note an octave down for body.
  // The x100 fruit (the last tier) plays a whole sparkling run instead.
  fruit: {
    tiers: [
      [784, 1046.5], // G5 C6: the commonest
      [880, 1174.7], // A5 D6
      [987.8, 1318.5], // B5 E6
      [1046.5, 1568], // C6 G6
    ],
    jackpot: [523.3, 659.3, 784, 1046.5, 1318.5], // C5 E5 G5 C6 E6
    stepMs: 70,
    ms: 220,
    volume: 0.05,
    body: 0.35,
    // Several fruit at once are spread out a little, not stacked.
    spreadMs: 45,
  },
  // A heart: a warm rising chime. With the hearts already full, just two
  // softer notes.
  heart: { notesHz: [523.3, 659.3, 784], fullNotesHz: [523.3, 659.3], stepMs: 75, ms: 240, volume: 0.05, fullVolume: 0.03 },
  // A shuriken: a short metal ring, a buzz and a thud. Saved by a heart,
  // a heart lost after it (two notes down); the run over, a sad slide
  // down after it.
  hit: {
    ring: { hz: 2200, q: 5, ms: 90, volume: 0.035 },
    buzz: { fromHz: 210, toHz: 90, ms: 170, volume: 0.025 },
    thud: { fromHz: 160, toHz: 50, ms: 230, volume: 0.22 },
    saved: { notesHz: [784, 523.3], delayMs: 140, stepMs: 110, ms: 200, volume: 0.035 },
    over: { fromHz: 392, toHz: 147, delayMs: 160, ms: 650, volume: 0.05 },
  },
  // A new stage: the wind through the new trees, then a short fanfare.
  stage: {
    wind: { fromHz: 300, toHz: 1800, ms: 800, volume: 0.05, attackMs: 300 },
    notesHz: [392, 523.3, 659.3, 784], // G4 C5 E5 G5
    delayMs: 120,
    stepMs: 100,
    ms: 260,
    lastMs: 520,
    volume: 0.05,
  },
}

const MUTE_KEY = 'forrest-muted'

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

// Notes one after another from `at` (seconds), `stepMs` apart.
function notes(context, at, notesHz, { stepMs, ms, volume, type = 'sine', lastMs = ms, body = 0 }) {
  notesHz.forEach((hz, i) => {
    const start = at + (i * stepMs) / 1000
    const length = i === notesHz.length - 1 ? lastMs : ms
    playVoice(context, { at: start, ms: length, type, fromHz: hz, volume, attackMs: 3 })
    if (body) playVoice(context, { at: start, ms: length, type: 'triangle', fromHz: hz / 2, volume: volume * body, attackMs: 3 })
  })
}

// A hop up, with its breath of air: a jump, or (higher) a double jump.
function hop(context, at, { fromHz, toHz, ms, volume, air }) {
  playVoice(context, { at, ms, type: 'triangle', fromHz, toHz, volume, attackMs: 3 })
  playNoise(context, { at, ms: air.ms, fromHz: air.fromHz, toHz: air.toHz, q: 0.7, volume: air.volume, attackMs: 10 })
}

// Each cue's sound, at `at` (seconds, on the audio clock).
const SOUNDS = {
  jump(context, at) {
    hop(context, at, SOUND.jump)
  },
  doubleJump(context, at) {
    hop(context, at, SOUND.doubleJump)
  },
  launch(context, at) {
    const { upFromHz, upToHz, upMs, settleToHz, settleMs, volume, sparkle } = SOUND.launch
    playVoice(context, { at, ms: upMs, type: 'sine', fromHz: upFromHz, toHz: upToHz, volume, attackMs: 4 })
    playVoice(context, { at, ms: upMs, type: 'triangle', fromHz: upFromHz * 2, toHz: upToHz * 2, volume: volume * sparkle, attackMs: 4 })
    playVoice(context, { at: at + (upMs * 0.85) / 1000, ms: settleMs, type: 'sine', fromHz: upToHz, toHz: settleToHz, volume: volume * 0.7, attackMs: 4 })
  },
  land(context, at) {
    const { thunk, knock, wood } = SOUND.land
    playVoice(context, { at, ms: thunk.ms, type: 'sine', fromHz: thunk.fromHz, toHz: thunk.toHz, volume: thunk.volume, attackMs: 2 })
    playNoise(context, { at, ms: knock.ms, type: 'lowpass', fromHz: knock.fromHz, toHz: knock.toHz, volume: knock.volume, attackMs: 1 })
    playVoice(context, { at, ms: wood.ms, type: 'triangle', fromHz: wood.fromHz, toHz: wood.toHz, volume: wood.volume, attackMs: 2 })
  },
  perch(context, at) {
    const { thump, leaves } = SOUND.perch
    playVoice(context, { at, ms: thump.ms, type: 'sine', fromHz: thump.fromHz, toHz: thump.toHz, volume: thump.volume, attackMs: 2 })
    playNoise(context, { at, ms: leaves.ms, fromHz: leaves.hz, toHz: leaves.hz * 0.8, q: leaves.q, volume: leaves.volume, attackMs: 15 })
  },
  fruit(context, at, { tier }) {
    const { tiers, jackpot, stepMs, ms, volume, body } = SOUND.fruit
    const run = tier >= tiers.length ? jackpot : tiers[tier]
    notes(context, at, run, { stepMs, ms, volume, body })
  },
  heart(context, at, { full }) {
    const { notesHz, fullNotesHz, stepMs, ms, volume, fullVolume } = SOUND.heart
    notes(context, at, full ? fullNotesHz : notesHz, { stepMs, ms, volume: full ? fullVolume : volume, type: 'triangle', body: 0.4 })
  },
  hit(context, at, { saved }) {
    const { ring, buzz, thud } = SOUND.hit
    playNoise(context, { at, ms: ring.ms, fromHz: ring.hz, toHz: ring.hz * 0.9, q: ring.q, volume: ring.volume, attackMs: 1 })
    playVoice(context, { at, ms: buzz.ms, type: 'square', fromHz: buzz.fromHz, toHz: buzz.toHz, volume: buzz.volume, attackMs: 2 })
    playVoice(context, { at, ms: thud.ms, type: 'sine', fromHz: thud.fromHz, toHz: thud.toHz, volume: thud.volume, attackMs: 2 })
    if (saved) {
      const after = SOUND.hit.saved
      notes(context, at + after.delayMs / 1000, after.notesHz, { stepMs: after.stepMs, ms: after.ms, volume: after.volume, type: 'triangle' })
    } else {
      const over = SOUND.hit.over
      playVoice(context, { at: at + over.delayMs / 1000, ms: over.ms, type: 'triangle', fromHz: over.fromHz, toHz: over.toHz, volume: over.volume, attackMs: 20 })
    }
  },
  stage(context, at) {
    const { wind, notesHz, delayMs, stepMs, ms, lastMs, volume } = SOUND.stage
    playNoise(context, { at, ms: wind.ms, type: 'lowpass', fromHz: wind.fromHz, toHz: wind.toHz, q: 0.6, volume: wind.volume, attackMs: wind.attackMs })
    notes(context, at + delayMs / 1000, notesHz, { stepMs, ms, lastMs, volume, type: 'triangle', body: 0.3 })
  },
}

// Plays a step's worth of cues (taken from the run as the page draws it,
// components/forrest/ForrestStage.jsx). Fruit caught together are spread
// out a little, so they're each heard.
export function playCues(cues) {
  if (muted || cues.length === 0) return
  const context = wakeAudio()
  if (!context) return
  const at = context.currentTime + 0.005
  let fruitAt = at
  for (const cue of cues) {
    const play = SOUNDS[cue.type]
    if (!play) continue
    if (cue.type === 'fruit') {
      play(context, fruitAt, cue)
      fruitAt += SOUND.fruit.spreadMs / 1000
    } else play(context, at, cue)
  }
}
