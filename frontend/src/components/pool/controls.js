import { useSyncExternalStore } from 'react'

// How a player shoots at 8 Ball Pool, remembered on this device:
//   'hold'  (the default) press and hold towards where the shot goes: the
//           longer you hold, the harder it is, and the power never drops.
//           Let go to shoot
//   'drag'  press on the table and drag back: the cue points away from the
//           pointer, and the further you pull, the harder the shot
//   'dial'  set the angle, then the power, on the panel under the table,
//           and press Shoot
const KEY = 'pool.controls'
export const MODES = ['hold', 'drag', 'dial']
const valid = (value) => (MODES.includes(value) ? value : 'hold')

function read() {
  try {
    return valid(localStorage.getItem(KEY))
  } catch {
    return 'hold'
  }
}

let mode = read()
const listeners = new Set()

export function setControls(value) {
  mode = valid(value)
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

export const usePoolControls = () => useSyncExternalStore(subscribe, () => mode, () => 'hold')
