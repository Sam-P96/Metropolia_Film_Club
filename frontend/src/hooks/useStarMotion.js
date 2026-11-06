import { useEffect, useState, useSyncExternalStore } from 'react'
import { useReducedMotion, useSpring } from 'motion/react'
import { serverTiltPermission, subscribeTiltPermission, tiltPermission } from '../utils/tilt'

// How the tilt moves the stars: this many degrees of tilt moves them all the
// way, which is this many pixels and this much turn.
const FULL_TILT = 25
const SHIFT_PX = 3
const TURN_DEG = 4

// Which way the stars go: -1 sends them the way the phone is tipped, with
// the wiggle. (+1, how it was, sent them the opposite way.)
const DIRECTION = -1

// Springs between readings, so the stars glide and never jitter.
const SPRING = { stiffness: 140, damping: 20, mass: 0.6 }

// How fast "level" catches up with the way the phone is being held, a share
// per reading: a tilt shows, then the stars ease back to the middle, so
// however someone holds their phone, the stars sit centred.
const RECENTRE = 0.015

// Readings closer than this to the last one (degrees) aren't worth moving
// for: a phone lying still keeps sending them.
const NOISE = 0.15

// With no reading by now, there's no sensor (a computer, or a phone that
// says it has one and doesn't): the stars float instead.
const NO_SENSOR_MS = 1500

// The phone's tilt turned to match the screen: [across, down] in degrees,
// for a phone held upright or on its side.
function screenTilt({ beta, gamma }) {
  const angle = (((window.screen?.orientation?.angle ?? window.orientation ?? 0) % 360) + 360) % 360
  if (angle === 90) return [beta, -gamma]
  if (angle === 180) return [-gamma, -beta]
  if (angle === 270) return [-beta, gamma]
  return [gamma, beta]
}

const clamp = (n) => Math.max(-1, Math.min(1, n))

// How a VIP card's revealed stars move: { mode, x, y, rotate }.
//   'tilt'   x, y (pixels) and rotate (degrees) follow the phone's tilt,
//            smoothed by springs. Every star uses these, each a little
//            more or less (components/scratch/TileFace.jsx).
//   'float'  no tilt to follow (a computer, no sensor, or permission
//            refused or not asked yet): the stars float gently on their own
//            slow loop instead
//   'still'  reduced motion, not a VIP card, or the first moment while it
//            checks for a sensor
// The sensor is listened to only while `enabled`. Its readings arrive far
// more often than the screen redraws, so each one is only stored, and the
// stars are moved at most once a frame (requestAnimationFrame); the springs
// run on Motion's own frame loop, never through React. Both the listener
// and any frame waiting are cleared away when the card goes.
export default function useStarMotion(enabled) {
  const reduce = useReducedMotion()
  const permission = useSyncExternalStore(subscribeTiltPermission, tiltPermission, serverTiltPermission)
  const [sensor, setSensor] = useState('unknown')
  const x = useSpring(0, SPRING)
  const y = useSpring(0, SPRING)
  const rotate = useSpring(0, SPRING)

  const live = enabled && !reduce
  const hasApi = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
  const listening = live && hasApi && permission === 'granted' && sensor !== 'none'

  useEffect(() => {
    if (!listening) return undefined

    let frame = 0
    let latest = null
    let centre = null
    let last = null
    let heard = false
    const quiet = setTimeout(() => {
      if (!heard) setSensor('none')
    }, NO_SENSOR_MS)

    const step = () => {
      frame = 0
      const [across, down] = screenTilt(latest)
      if (last && Math.abs(across - last[0]) < NOISE && Math.abs(down - last[1]) < NOISE) return
      last = [across, down]

      if (!centre) centre = [across, down]
      centre = [centre[0] + (across - centre[0]) * RECENTRE, centre[1] + (down - centre[1]) * RECENTRE]

      const sideways = clamp((across - centre[0]) / FULL_TILT)
      const forwards = clamp((down - centre[1]) / FULL_TILT)
      x.set(DIRECTION * sideways * SHIFT_PX)
      y.set(DIRECTION * forwards * SHIFT_PX)
      rotate.set(DIRECTION * sideways * TURN_DEG)
    }

    const onOrientation = (event) => {
      // Computers without a sensor send one event with nothing in it.
      if (event.beta === null || event.gamma === null || event.beta === undefined) return
      latest = event
      if (!heard) {
        heard = true
        setSensor('live')
      }
      if (!frame) frame = requestAnimationFrame(step)
    }

    window.addEventListener('deviceorientation', onOrientation)
    return () => {
      window.removeEventListener('deviceorientation', onOrientation)
      cancelAnimationFrame(frame)
      clearTimeout(quiet)
    }
  }, [listening, x, y, rotate])

  let mode = 'still'
  if (live) {
    if (listening && sensor === 'live') mode = 'tilt'
    else if (!listening || sensor === 'none') mode = 'float'
    // Otherwise it's listening and hasn't heard yet: still, for a moment.
  }

  return { mode, x, y, rotate }
}
