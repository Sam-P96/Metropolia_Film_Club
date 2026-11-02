// The Slot Machine's sounds and haptics, shared by its parts. Sounds are
// little synthesised blips (Web Audio), muted with the mute button; the
// choice is remembered on this device.

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

// One blip: `freq` Hz for `dur` seconds, starting `when` seconds from now.
export function tone(freq, dur, type = 'square', vol = 0.04, when = 0) {
  if (muted) return
  const context = wakeAudio()
  if (!context) return

  const at = context.currentTime + when
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(freq, at)
  gain.gain.setValueAtTime(vol, at)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(at)
  oscillator.stop(at + dur + 0.02)
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
