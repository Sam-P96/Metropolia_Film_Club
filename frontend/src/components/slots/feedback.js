// The Slot Machine's sounds and haptics, shared by its parts. Sounds are
// synthesised with Web Audio (no audio files), muted with the mute button;
// the choice is remembered on this device.

// ---- Sound settings: the effects' sounds, to tune by ear ----
// Pitches in Hz, times in milliseconds, volumes as peaks (for scale: each
// note of the win jingle is 0.09, the jackpot's 0.1).
const SOUND_FX = {
  // Everything plays through one master volume and a compressor, so several
  // effects at once can't clip. threshold: where it starts squeezing (dB);
  // ratio: how hard.
  master: { volume: 0.9, threshold: -14, ratio: 6 },

  // FIREWORKS: a rising whoosh as they launch, then for each burst a few
  // crackly pops and high sparkles.
  fireworks: {
    // Noise swept upwards through a filter, swelling as it rises.
    whoosh: { fromHz: 300, toHz: 3600, ms: 420, volume: 0.07 },
    // Pops after each burst: how many, how soon after it, spread over how
    // long, their pitch and length.
    pops: { count: 4, delayMs: 60, spreadMs: 450, hz: 1800, ms: 30, volume: 0.1 },
    // Sparkles: short high pings, a random pitch between low and high.
    sparkles: { count: 5, lowHz: 2600, highHz: 5200, ms: 110, spreadMs: 700, volume: 0.025 },
    // Bursts after this many in one go stay silent, so a big win isn't a din.
    maxBursts: 6,
  },

  // LIGHTNING: each strike is a crack (noise through a band-pass filter) and
  // a zap (a sawtooth sweeping down); a low rumble follows the first.
  lightning: {
    crack: { hz: 2800, q: 1.4, ms: 110, volume: 0.13 },
    zap: { fromHz: 1900, toHz: 110, ms: 170, volume: 0.05 },
    rumble: { hz: 52, ms: 1100, delayMs: 90, volume: 0.12 },
    // Strikes after the first, as a share of its volume, and how many can
    // sound at the same moment (more are skipped).
    repeatVolume: 0.45,
    maxAtOnce: 3,
  },

  // CRITICAL HIT!: a hard hit (a falling thump and a smack of noise), then a
  // bright chord rising note by note, as the word appears.
  critical: {
    hit: { fromHz: 95, toHz: 42, ms: 240, volume: 0.22 },
    smack: { ms: 70, volume: 0.12 },
    // The chord's notes, the gap between them, how far each slides up (1.06
    // is about a semitone), how long they ring, and their volume.
    chord: { notesHz: [880, 1108.7, 1318.5, 1760], stepMs: 45, rise: 1.06, ms: 520, volume: 0.06 },
  },

  // INFINITY: a big shimmering chord that swells in and rings out, with high
  // sparkles on top, as the word appears.
  infinity: {
    // The chord's notes, each played twice slightly out of tune (detune, in
    // cents) for a shimmering sound; how long it swells, how long it rings.
    chord: { notesHz: [261.6, 329.6, 392, 523.3, 659.3, 784], detuneCents: 7, swellMs: 450, ringMs: 2600, volume: 0.022 },
    // A quick wobble in its volume: how fast, and how deep (0 to 1).
    shimmer: { hz: 7, depth: 0.35 },
    sparkle: { notesHz: [1568, 2093, 2637, 3136], stepMs: 90, ms: 400, volume: 0.02 },
  },
}

const MUTE_KEY = 'slots-muted'

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

// ---- Sound ----

let audio = null
let master = null
let noise = null

// Browsers only let a page make sound after a tap, so the first one wakes it.
export function wakeAudio() {
  if (!audio) {
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      return null
    }
  }
  if (audio.state === 'suspended') audio.resume().catch(() => {})
  return audio
}

// Where every sound goes: the master volume, through the compressor.
function output(context) {
  if (!master) {
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = SOUND_FX.master.threshold
    compressor.knee.value = 10
    compressor.ratio.value = SOUND_FX.master.ratio
    compressor.attack.value = 0.003
    compressor.release.value = 0.25
    master = context.createGain()
    master.gain.value = SOUND_FX.master.volume
    master.connect(compressor).connect(context.destination)
  }
  return master
}

// The sound, ready to play, or null when muted (or sound isn't allowed).
function ready() {
  return muted ? null : wakeAudio()
}

// Two seconds of white noise, made once, for the whooshes and cracks.
function noiseBuffer(context) {
  if (!noise) {
    noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noise
}

// A rise to `volume` over `attackMs`, then a fade to silence by `ms`.
function envelope(param, at, { ms, volume, attackMs = 4 }) {
  param.setValueAtTime(0.0001, at)
  param.exponentialRampToValueAtTime(volume, at + attackMs / 1000)
  param.exponentialRampToValueAtTime(0.0001, at + ms / 1000)
}

// Noise through a filter swept from `fromHz` to `toHz`.
function playNoise(context, { at, ms, type = 'bandpass', fromHz, toHz = fromHz, q = 1, volume, attackMs = 4 }) {
  const source = context.createBufferSource()
  source.buffer = noiseBuffer(context)
  const filter = context.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(fromHz, at)
  filter.frequency.exponentialRampToValueAtTime(toHz, at + ms / 1000)
  const gain = context.createGain()
  envelope(gain.gain, at, { ms, volume, attackMs })
  source.connect(filter).connect(gain).connect(output(context))
  // From a random point in the noise, early enough for all of it to fit.
  source.start(at, Math.random() * Math.max(0, source.buffer.duration - ms / 1000 - 0.1))
  source.stop(at + ms / 1000 + 0.05)
}

// One note sliding from `fromHz` to `toHz`, into `to` (the master unless said).
function playVoice(context, { at, ms, type = 'sine', fromHz, toHz = fromHz, volume, attackMs = 4, detune = 0, to = null }) {
  const oscillator = context.createOscillator()
  oscillator.type = type
  oscillator.detune.value = detune
  oscillator.frequency.setValueAtTime(fromHz, at)
  if (toHz !== fromHz) oscillator.frequency.exponentialRampToValueAtTime(toHz, at + ms / 1000)
  const gain = context.createGain()
  envelope(gain.gain, at, { ms, volume, attackMs })
  oscillator.connect(gain).connect(to ?? output(context))
  oscillator.start(at)
  oscillator.stop(at + ms / 1000 + 0.05)
}

// One blip: `freq` Hz for `dur` seconds, starting `when` seconds from now.
export function tone(freq, dur, type = 'square', vol = 0.04, when = 0) {
  const context = ready()
  if (!context) return

  const at = context.currentTime + when
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(freq, at)
  gain.gain.setValueAtTime(vol, at)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  oscillator.connect(gain).connect(output(context))
  oscillator.start(at)
  oscillator.stop(at + dur + 0.02)
}

const between = (low, high) => low + Math.random() * (high - low)

// When the lightning strikes now sounding end, to keep to maxAtOnce.
let strikesSounding = []

// The effects' sounds (settings at the top of this file).
const fx = {
  // The fireworks launching: the whoosh.
  fireworksLaunch() {
    const c = ready()
    if (!c) return
    const { whoosh } = SOUND_FX.fireworks
    playNoise(c, { at: c.currentTime, ms: whoosh.ms, fromHz: whoosh.fromHz, toHz: whoosh.toHz, q: 0.9, volume: whoosh.volume, attackMs: whoosh.ms * 0.7 })
  },

  // Burst number `index` of a spin's fireworks: its pops and sparkles.
  fireworkBurst(index = 0) {
    const c = ready()
    const { pops, sparkles, maxBursts } = SOUND_FX.fireworks
    if (!c || index >= maxBursts) return
    const now = c.currentTime
    for (let i = 0; i < pops.count; i++) {
      const at = now + (pops.delayMs + Math.random() * pops.spreadMs) / 1000
      const volume = pops.volume * between(0.6, 1)
      playNoise(c, { at, ms: pops.ms, type: 'highpass', fromHz: pops.hz, q: 0.7, volume, attackMs: 1 })
      playVoice(c, { at, ms: pops.ms * 1.5, fromHz: 150, toHz: 60, volume: volume * 0.5, attackMs: 1 })
    }
    for (let i = 0; i < sparkles.count; i++) {
      const at = now + (pops.delayMs + Math.random() * sparkles.spreadMs) / 1000
      const hz = between(sparkles.lowHz, sparkles.highHz)
      playVoice(c, { at, ms: sparkles.ms, fromHz: hz, toHz: hz * 1.08, volume: sparkles.volume * between(0.5, 1), attackMs: 2 })
    }
  },

  // One lightning strike; the `first` is the loudest, with a rumble after.
  lightningStrike(first = true) {
    const c = ready()
    if (!c) return
    const { crack, zap, rumble, repeatVolume, maxAtOnce } = SOUND_FX.lightning
    const at = c.currentTime
    strikesSounding = strikesSounding.filter((end) => end > at)
    if (strikesSounding.length >= maxAtOnce) return
    strikesSounding.push(at + Math.max(crack.ms, zap.ms) / 1000)

    const scale = first ? 1 : repeatVolume
    playNoise(c, { at, ms: crack.ms, fromHz: crack.hz, toHz: crack.hz * 0.6, q: crack.q, volume: crack.volume * scale, attackMs: 1 })
    playVoice(c, { at, ms: zap.ms, type: 'sawtooth', fromHz: zap.fromHz, toHz: zap.toHz, volume: zap.volume * scale, attackMs: 1 })
    if (first) {
      const start = at + rumble.delayMs / 1000
      playNoise(c, { at: start, ms: rumble.ms, type: 'lowpass', fromHz: 180, toHz: 60, q: 0.8, volume: rumble.volume, attackMs: 60 })
      playVoice(c, { at: start, ms: rumble.ms, fromHz: rumble.hz, toHz: rumble.hz * 0.8, volume: rumble.volume * 0.6, attackMs: 40 })
    }
  },

  // The CRITICAL HIT! stinger.
  critical() {
    const c = ready()
    if (!c) return
    const { hit, smack, chord } = SOUND_FX.critical
    const at = c.currentTime
    playVoice(c, { at, ms: hit.ms, fromHz: hit.fromHz, toHz: hit.toHz, volume: hit.volume, attackMs: 2 })
    playNoise(c, { at, ms: smack.ms, type: 'lowpass', fromHz: 1400, toHz: 400, volume: smack.volume, attackMs: 1 })
    chord.notesHz.forEach((hz, i) => {
      const start = at + 0.06 + (i * chord.stepMs) / 1000
      playVoice(c, { at: start, ms: chord.ms, type: 'triangle', fromHz: hz, toHz: hz * chord.rise, volume: chord.volume, attackMs: 5 })
      playVoice(c, { at: start, ms: chord.ms * 0.6, type: 'square', fromHz: hz * 2, toHz: hz * 2 * chord.rise, volume: chord.volume * 0.15, attackMs: 5 })
    })
  },

  // The INFINITY chord.
  infinity() {
    const c = ready()
    if (!c) return
    const { chord, shimmer, sparkle } = SOUND_FX.infinity
    const at = c.currentTime
    const total = chord.swellMs + chord.ringMs

    // The chord goes through its own volume, wobbled by a slow oscillator.
    const bus = c.createGain()
    bus.gain.value = 1 - shimmer.depth / 2
    const wobble = c.createOscillator()
    const depth = c.createGain()
    wobble.frequency.value = shimmer.hz
    depth.gain.value = shimmer.depth / 2
    wobble.connect(depth).connect(bus.gain)
    bus.connect(output(c))
    wobble.start(at)
    wobble.stop(at + total / 1000 + 0.1)

    for (const hz of chord.notesHz) {
      for (const detune of [-chord.detuneCents, chord.detuneCents]) {
        playVoice(c, { at, ms: total, fromHz: hz, volume: chord.volume, attackMs: chord.swellMs, detune, to: bus })
      }
    }
    sparkle.notesHz.forEach((hz, i) => {
      playVoice(c, { at: at + (chord.swellMs * 0.6 + i * sparkle.stepMs) / 1000, ms: sparkle.ms, fromHz: hz, volume: sparkle.volume, attackMs: 3 })
    })
  },
}

export const SOUNDS = {
  step: (up) => tone(up ? 700 : 500, 0.04),
  notch: () => tone(1800, 0.015, 'square', 0.025),
  thud: () => tone(110, 0.08, 'triangle', 0.12),
  pull: () => tone(90, 0.18, 'sawtooth', 0.07),
  stop: () => tone(420, 0.04, 'square', 0.05),
  tick: () => tone(700 + Math.random() * 500, 0.015, 'square', 0.02),
  land: () => tone(130, 0.14, 'triangle', 0.16),
  credits: () => {
    tone(880, 0.08, 'triangle', 0.08)
    tone(1320, 0.1, 'triangle', 0.08, 0.07)
  },
  win: () => [0, 0.09, 0.18, 0.3].forEach((when, i) => tone([660, 880, 1100, 1320][i], 0.16, 'triangle', 0.09, when)),
  jackpot: () => [0, 0.1, 0.2, 0.3, 0.42, 0.54, 0.7].forEach((when, i) => tone([523, 659, 784, 1047, 784, 1047, 1319][i], 0.22, 'triangle', 0.1, when)),
  ...fx,
  // Played by the words themselves as each appears (components/slots/EffectText.jsx).
  word: (text) => (text === 'CRITICAL HIT!' ? fx.critical() : text === 'INFINITY' ? fx.infinity() : undefined),
}

// ---- Haptics ----

// Patterns are [on, off, on, ...] in milliseconds.
export const HAPTIC = {
  press: 10, // any button
  grab: 8, // a finger touches the lever
  bottom: 35, // the lever hits the bottom of its travel
  snapUp: [15, 70, 15], // the lever flicks back to the top stop
  win: [120, 280, 120, 280, 120], // a win: 3 slow buzzes
  bigWin: Array.from({ length: 23 }, () => 40), // a big win (and the jackpot): 12 fast ones
}

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

// iPhones have no Vibration API, but Safari 18 gives one light tick when a
// switch checkbox is toggled, so a pattern becomes a tick per "on".
let iosSwitch = null
function iosTick() {
  if (!iosSwitch) {
    iosSwitch = document.createElement('label')
    iosSwitch.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
    iosSwitch.innerHTML = '<input type="checkbox" switch tabindex="-1" aria-hidden="true">'
    document.body.appendChild(iosSwitch)
  }
  iosSwitch.click()
}

export function haptic(pattern) {
  const steps = Array.isArray(pattern) ? pattern : [pattern]
  if (canVibrate) {
    try {
      navigator.vibrate(steps)
    } catch {
      // Not allowed right now (no tap yet): nothing to do.
    }
    return
  }

  let at = 0
  steps.forEach((ms, i) => {
    if (i % 2 === 0) setTimeout(iosTick, at)
    at += ms
  })
}
