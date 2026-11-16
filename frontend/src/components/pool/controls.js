import { useSyncExternalStore } from 'react'

// How a player shoots at 8 Ball Pool, remembered on this device:
//   'drag'  press on the table and drag back: the cue points away from the
//           pointer, and the further you pull, the harder the shot
//   'dial'  set the angle, then the power, on the panel under the table,
//           and press Shoot
const KEY = 'pool.controls'

function read() {
  try {
    return localStorage.getItem(KEY) === 'dial' ? 'dial' : 'drag'
  } catch {
    return 'drag'
  }
}

let mode = read()
const listeners = new Set()

export function setControls(value) {
  mode = value === 'dial' ? 'dial' : 'drag'
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // A private window: it lasts until the page closes.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const usePoolControls = () => useSyncExternalStore(subscribe, () => mode, () => 'drag')
