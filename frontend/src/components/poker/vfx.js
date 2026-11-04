// Whether your best hand glows, with its lightning (CardAura.jsx): the VFX
// button at the table. On to start with, and remembered on this device.
const KEY = 'poker-vfx'

export function vfxOn() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setVfx(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Private mode: it just won't be remembered.
  }
}
