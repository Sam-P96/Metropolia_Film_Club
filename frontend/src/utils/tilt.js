// Whether this page may read the phone's tilt, for Box Office Scratch's VIP
// stars (hooks/useStarMotion.js). iPhones and iPads only send
// deviceorientation events once the member has said yes, and the page can
// only ask from inside a tap, so askTiltPermission is called from the VIP
// Buy tap and, coming back to a VIP card, from the first scratch. Other
// browsers don't ask: they just send the events if there's a sensor.
//   'unknown'  not asked yet (or the ask didn't count as a tap): ask again
//              on the next one
//   'asking'   the question is on screen
//   'granted'  listen for the events
//   'denied'   they said no: the stars float instead
const asksFirst = typeof window !== 'undefined' && typeof window.DeviceOrientationEvent?.requestPermission === 'function'

let state = asksFirst ? 'unknown' : 'granted'
const listeners = new Set()

function setState(next) {
  state = next
  for (const listener of listeners) listener()
}

// Call straight from a tap's handler, before anything is awaited: once the
// handler has returned, it no longer counts as the member's tap. Does
// nothing if there's nothing to ask, or with reduced motion on (the stars
// don't move then anyway).
export function askTiltPermission() {
  if (state !== 'unknown') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  let answer
  try {
    answer = window.DeviceOrientationEvent.requestPermission()
  } catch {
    return
  }
  setState('asking')
  Promise.resolve(answer).then(
    (result) => setState(result === 'granted' ? 'granted' : 'denied'),
    // Refused without asking (it didn't count as a tap): try the next one.
    () => setState('unknown')
  )
}

// For useSyncExternalStore.
export const tiltPermission = () => state
export const serverTiltPermission = () => 'unknown'
export function subscribeTiltPermission(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
