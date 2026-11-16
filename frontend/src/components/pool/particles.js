import { useSyncExternalStore } from 'react'

// Particle effects at 8 Ball Pool on or off: the sparks (or the shooter's
// Ignition) when balls collide. On to start with. Remembered on this
// device; every table on the page follows it at once. The balls, the cues
// and everything else stay as they are.
const KEY = 'pool.particles'

function read() {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

let on = read()
const listeners = new Set()

export const particlesOn = () => on

export function setParticles(value) {
  on = value
  try {
    localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    // Storage is off (a private window): it lasts until the page closes.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useParticles = () => useSyncExternalStore(subscribe, particlesOn, () => true)
