import { useCallback, useState } from 'react'
import PoolPlay from './PoolPlay'
import { QUIET_BUTTON } from '../steal/style'
import { MAX_SPEED, TABLE, freeSpotNear, rackBalls, simulate } from '../../../../shared/pool/physics.js'

// A table to try things on (the shop's Test button): no turns, no rules,
// no score, nothing sent anywhere. Shoot as you like with `cue` and
// `ignition` (shared/pool cues.js and ignitions.js ids). The cue ball comes
// back to you if it drops; Rack again starts over.
export default function PracticeTable({ cue, ignition }) {
  const [balls, setBalls] = useState(() => rackBalls())
  const [hand, setHand] = useState('kitchen')
  const [shot, setShot] = useState(null)
  const [count, setCount] = useState(0)

  const shoot = ({ angle, power, cue: spot }) => {
    if (shot) return
    const before = balls.map((ball) => (ball.id === 0 && spot ? { ...ball, x: spot.x, y: spot.y, on: true } : { ...ball }))
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const speed = MAX_SPEED * power
    let after = simulate(before, { dx, dy, speed }).balls
    const scratched = !after.find((ball) => ball.id === 0).on
    if (scratched) {
      const back = freeSpotNear(after, TABLE.HEAD_X, TABLE.H / 2, { ignore: 0 })
      after = after.map((ball) => (ball.id === 0 ? { ...ball, x: back.x, y: back.y, on: true } : ball))
    }
    const next = count + 1
    setCount(next)
    setShot({ key: next, before, dx, dy, speed, ignition })
    setBalls(after)
    setHand(scratched ? 'table' : null)
  }

  const done = useCallback((key) => setShot((now) => (now?.key === key ? null : now)), [])
  const rack = () => {
    setBalls(rackBalls())
    setHand('kitchen')
    setShot(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <PoolPlay balls={balls} hand={shot ? null : hand} shot={shot} onShotDone={done} canAim={!shot} busy={false} onShoot={shoot} myCue={cue} />
      <button type="button" onClick={rack} disabled={Boolean(shot)} className={`${QUIET_BUTTON} min-h-10 self-center`}>
        Rack again
      </button>
    </div>
  )
}
