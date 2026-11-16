import { useSyncExternalStore } from 'react'

// "Classic stones": every piece on the board (and in the players bar) shown
// as a plain black or white stone, black for whoever moved first, so a game
// stays easy to read whatever pieces the players wear. Shockwaves, boards
// and grids stay as they are. Remembered on this device; every board on the
// page follows it at once.
const KEY = 'gomoku.classicStones'

function read() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let classic = read()
const listeners = new Set()

export const isClassic = () => classic

export function setClassic(value) {
  classic = value
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

export const useClassicStones = () => useSyncExternalStore(subscribe, isClassic, () => false)

// The classic stone for whoever moved first (black) or second (white).
export const classicStone = (first) => ({ id: first ? 'piece.black' : 'piece.white', invert: false })
