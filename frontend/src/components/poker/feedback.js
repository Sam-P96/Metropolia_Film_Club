import { haptic, playNoise, playVoice, wakeAudio } from '../slots/feedback'
import { DEAL_GAP } from './style'

// Kino Poker's sounds and haptics. Sounds are synthesised with Web Audio (no
// audio files), through the same engine and master volume as the Slot
// Machine (components/slots/feedback.js), muted with the table's own mute
// button; the choice is remembered on this device. Haptics buzz on a
// phone (one light tick per buzz on an iPhone) and aren't muted.

// ---- Sound settings: the effects' sounds, to tune by ear ----
// Pitches in Hz, times in milliseconds, volumes as peaks (for scale: the
// Slot Machine's win jingle is 0.09 a note).
const SOUND_FX = {
  // A card leaving the deck: a papery flick.
  deal: { hz: 2600, toHz: 1500, ms: 45, volume: 0.05 },
  // A card turning over: a soft snap.
  flip: { hz: 1800, toHz: 3800, ms: 30, volume: 0.04 },
  // Cards thrown back to the middle: a swish.
  discard: { hz: 2400, toHz: 700, ms: 190, volume: 0.04 },
  // Shuffling the thrown-away cards back in: a riffle of flicks.
  riffle: { count: 14, spreadMs: 520, volume: 0.035 },
  // Chips going in: clinks, more for a bigger bet (at most `max`).
  chips: { lowHz: 2700, highHz: 4300, ms: 60, gapMs: 38, volume: 0.03, max: 8 },
  // A check: two knuckle raps on the felt.
  check: { fromHz: 170, toHz: 85, ms: 70, gapMs: 120, volume: 0.13 },
  // Folding: a soft slide.
  fold: { hz: 1300, toHz: 380, ms: 230, volume: 0.035 },
  // Your turn: two rising notes.
  turn: { notesHz: [660, 990], stepMs: 110, ms: 160, volume: 0.05 },
  // The last seconds of your turn: a tick each second.
  tick: { hz: 1250, urgentHz: 1650, ms: 18, volume: 0.022 },
  // You win: chips pouring in and a bright arpeggio. Someone else: just
  // the chips, quieter.
  win: { notesHz: [523.3, 659.3, 784, 1046.5], stepMs: 85, ms: 260, volume: 0.06, chips: 12, othersVolume: 0.6 },
  // An emoji, a bot speaking.
  emoji: { fromHz: 380, toHz: 950, ms: 70, volume: 0.05 },
  speech: { fromHz: 1150, toHz: 1500, ms: 32, volume: 0.014 },
  // Tapping one of your cards in the draw: up a little picked, down
  // unpicked.
  select: { onHz: 1500, offHz: 1050, ms: 22, volume: 0.03 },
  // Your best hand lighting up: a shimmer swelling in, at most once per
  // `gapMs`.
  ignite: { notesHz: [392, 587.3, 784], detuneCents: 8, swellMs: 900, ringMs: 1300, volume: 0.016, air: 0.02, gapMs: 1500 },
  // Its lightning: a crackle (a few quick bursts of noise) and a faint zap.
  crackle: { bursts: [1, 3], hz: 3400, ms: 40, gapMs: 28, volume: 0.03, zap: { fromHz: 2600, toHz: 320, ms: 90, volume: 0.01 } },
}

const MUTE_KEY = 'poker-muted'

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

// The sound, ready to play, or null when muted (or sound isn't allowed).
const ready = () => (muted ? null : wakeAudio())
const between = (low, high) => low + Math.random() * (high - low)

// Quiet calls in a burst (a showdown's cards all turning at once) make one sound.
const last = {}
const throttled = (key, ms) => {
  const now = performance.now()
  if (now - (last[key] ?? -Infinity) < ms) return true
  last[key] = now
  return false
}

function flick(c, at, volume = SOUND_FX.deal.volume) {
  const { hz, toHz, ms } = SOUND_FX.deal
  playNoise(c, { at, ms, fromHz: hz * between(0.9, 1.1), toHz, q: 1.2, volume: volume * between(0.75, 1), attackMs: 2 })
}

function clinks(c, at, count, volume = SOUND_FX.chips.volume) {
  const { lowHz, highHz, ms, gapMs } = SOUND_FX.chips
  for (let i = 0; i < count; i++) {
    const start = at + (i * gapMs * between(0.7, 1.3)) / 1000
    const hz = between(lowHz, highHz)
    playVoice(c, { at: start, ms, type: 'triangle', fromHz: hz, toHz: hz * 0.98, volume: volume * between(0.6, 1), attackMs: 1 })
    playNoise(c, { at: start, ms: 14, type: 'highpass', fromHz: 5200, volume: volume * 0.5, attackMs: 1 })
  }
}

export const FX = {
  // `count` cards dealt round the table, one every DEAL_GAP seconds, from
  // `delayMs` from now.
  deal(count, delayMs = 0) {
    const c = ready()
    if (!c) return
    for (let i = 0; i < count; i++) flick(c, c.currentTime + delayMs / 1000 + i * DEAL_GAP)
  },

  flip() {
    const c = ready()
    if (!c || throttled('flip', 60)) return
    const { hz, toHz, ms, volume } = SOUND_FX.flip
    playNoise(c, { at: c.currentTime, ms, fromHz: hz, toHz, q: 0.9, volume, attackMs: 1 })
    playVoice(c, { at: c.currentTime, ms: ms * 1.4, type: 'triangle', fromHz: 900, toHz: 1400, volume: volume * 0.4, attackMs: 1 })
  },

  // Someone throwing away `count` cards, then the replacements coming out.
  draw(count) {
    const c = ready()
    if (!c) return
    const { hz, toHz, ms, volume } = SOUND_FX.discard
    playNoise(c, { at: c.currentTime, ms, fromHz: hz, toHz, q: 0.8, volume, attackMs: ms * 0.3 })
    FX.deal(count, 420)
  },

  reshuffle() {
    const c = ready()
    if (!c) return
    const { count, spreadMs, volume } = SOUND_FX.riffle
    for (let i = 0; i < count; i++) flick(c, c.currentTime + ((i / count) * spreadMs) / 1000, volume)
  },

  // Chips going in: a few clinks for a small bet, more for a big one.
  chips(amount = 1, { allIn = false } = {}) {
    const c = ready()
    if (!c) return
    const { max } = SOUND_FX.chips
    const count = allIn ? max + 4 : Math.max(2, Math.min(max, Math.round(Math.log2(amount + 1))))
    clinks(c, c.currentTime, count)
    if (allIn) playVoice(c, { at: c.currentTime, ms: 500, fromHz: 70, toHz: 55, volume: 0.08, attackMs: 30 })
  },

  check() {
    const c = ready()
    if (!c) return
    const { fromHz, toHz, ms, gapMs, volume } = SOUND_FX.check
    for (const offset of [0, gapMs]) {
      const at = c.currentTime + offset / 1000
      playVoice(c, { at, ms, fromHz, toHz, volume, attackMs: 1 })
      playNoise(c, { at, ms: 25, type: 'lowpass', fromHz: 900, toHz: 400, volume: volume * 0.4, attackMs: 1 })
    }
  },

  // Keeping all five: one rap.
  standPat() {
    const c = ready()
    if (!c) return
    const { fromHz, toHz, ms, volume } = SOUND_FX.check
    playVoice(c, { at: c.currentTime, ms, fromHz, toHz, volume, attackMs: 1 })
  },

  fold() {
    const c = ready()
    if (!c) return
    const { hz, toHz, ms, volume } = SOUND_FX.fold
    playNoise(c, { at: c.currentTime, ms, fromHz: hz, toHz, q: 0.7, volume, attackMs: ms * 0.4 })
  },

  turn() {
    const c = ready()
    if (!c) return
    const { notesHz, stepMs, ms, volume } = SOUND_FX.turn
    notesHz.forEach((hz, i) => playVoice(c, { at: c.currentTime + (i * stepMs) / 1000, ms, type: 'triangle', fromHz: hz, volume, attackMs: 4 }))
  },

  tick(urgent = false) {
    const c = ready()
    if (!c) return
    const { hz, urgentHz, ms, volume } = SOUND_FX.tick
    playVoice(c, { at: c.currentTime, ms, type: 'square', fromHz: urgent ? urgentHz : hz, volume: urgent ? volume * 1.4 : volume, attackMs: 1 })
  },

  // A pot won: by you (`mine`) with the arpeggio, or by someone else.
  win(mine = false) {
    const c = ready()
    if (!c) return
    const { notesHz, stepMs, ms, volume, chips, othersVolume } = SOUND_FX.win
    clinks(c, c.currentTime + 0.25, chips, SOUND_FX.chips.volume * (mine ? 1 : othersVolume))
    if (!mine) return
    notesHz.forEach((hz, i) => {
      const at = c.currentTime + (i * stepMs) / 1000
      playVoice(c, { at, ms, type: 'triangle', fromHz: hz, volume, attackMs: 4 })
      playVoice(c, { at, ms: ms * 0.6, type: 'sine', fromHz: hz * 2, volume: volume * 0.25, attackMs: 4 })
    })
  },

  emoji() {
    const c = ready()
    if (!c) return
    const { fromHz, toHz, ms, volume } = SOUND_FX.emoji
    playVoice(c, { at: c.currentTime, ms, fromHz, toHz, volume, attackMs: 3 })
  },

  speech() {
    const c = ready()
    if (!c) return
    const { fromHz, toHz, ms, volume } = SOUND_FX.speech
    playVoice(c, { at: c.currentTime, ms, fromHz, toHz, volume, attackMs: 3 })
  },

  select(picked) {
    const c = ready()
    if (!c) return
    const { onHz, offHz, ms, volume } = SOUND_FX.select
    playVoice(c, { at: c.currentTime, ms, type: 'triangle', fromHz: picked ? onHz : offHz, volume, attackMs: 1 })
  },

  // Your best hand lighting up.
  ignite() {
    const c = ready()
    const { notesHz, detuneCents, swellMs, ringMs, volume, air, gapMs } = SOUND_FX.ignite
    if (!c || throttled('ignite', gapMs)) return
    const at = c.currentTime
    for (const hz of notesHz) {
      for (const detune of [-detuneCents, detuneCents]) playVoice(c, { at, ms: swellMs + ringMs, fromHz: hz, volume, attackMs: swellMs, detune })
    }
    playNoise(c, { at, ms: swellMs + 300, type: 'highpass', fromHz: 1200, toHz: 7000, q: 0.6, volume: air, attackMs: swellMs })
  },

  // One lightning strike round a glowing card, of `bolts` bolts (1 or 2):
  // two crackle a little longer.
  crackle(bolts = 1) {
    const c = ready()
    if (!c) return
    const { bursts, hz, ms, gapMs, volume, zap } = SOUND_FX.crackle
    const count = Math.round(between(bursts[0], bursts[1])) + (bolts > 1 ? 2 : 0)
    for (let i = 0; i < count; i++) {
      const at = c.currentTime + (i * gapMs * between(0.6, 1.4)) / 1000
      playNoise(c, { at, ms: ms * between(0.6, 1.2), fromHz: hz * between(0.8, 1.2), toHz: hz * 0.6, q: 1.6, volume: volume * between(0.5, 1), attackMs: 1 })
    }
    playVoice(c, { at: c.currentTime, ms: zap.ms, type: 'sawtooth', fromHz: zap.fromHz, toHz: zap.toHz, volume: zap.volume, attackMs: 1 })
  },
}

// ---- Haptics ----

// Patterns are [on, off, on, ...] in milliseconds.
export const HAPTIC = {
  press: 10, // a button
  card: 14, // tapping one of your cards
  turn: [30, 70, 30], // your turn
  win: [60, 90, 60, 90, 140], // you won the pot
}

export { haptic }
