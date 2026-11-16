import { useCallback, useEffect, useRef, useState } from 'react'
import AimPanel, { ControlsToggle } from './AimPanel'
import PoolTable from './PoolTable'
import { usePoolControls } from './controls'

// The table and the way to shoot, for every 8 Ball Pool game (PoolMatch.jsx,
// PoolClanker.jsx). With "Hold to power" (the default) or "Drag back" the
// shot is taken on the table; with
// "Angle, then power", on the panel under it, the table showing the cue
// where it's set. The switch between the two is under the table, and the
// device remembers it (controls.js). There's no line showing where a
// ball will go: the cue's all you get.
//
//   balls, hand, shot, onShotDone, ghost   as PoolTable.jsx
//   canAim     it's your shot and nothing is moving
//   busy       your shot is on its way
//   onShoot({ angle, power, cue })
//   onAim({ angle, power, on, cue })   your aim as it moves (Play Live)
export default function PoolPlay({ balls, hand, shot, onShotDone, ghost, canAim, busy, onShoot, onAim }) {
  const mode = usePoolControls()
  const [vertical, setVertical] = useState(false)
  const [dial, setDial] = useState({ angle: 0, power: 0.5 })
  const cueRef = useRef(null)

  // The cue ball, while it's in hand, goes back to where it lies whenever
  // the table changes.
  useEffect(() => {
    cueRef.current = null
  }, [balls, hand])

  const cueSpot = () => {
    if (!hand) return null
    if (cueRef.current) return cueRef.current
    const cueBall = balls.find((ball) => ball.id === 0)
    return cueBall ? { x: cueBall.x, y: cueBall.y } : null
  }

  // The dial's aim, for anyone watching.
  const aimRef = useRef(onAim)
  useEffect(() => {
    aimRef.current = onAim
  })
  useEffect(() => {
    if (mode === 'dial' && canAim) aimRef.current?.({ angle: dial.angle, power: dial.power, on: true, cue: null })
  }, [mode, canAim, dial])

  const onCue = useCallback(
    (spot) => {
      cueRef.current = spot
    },
    []
  )

  const shootDial = () => {
    if (!canAim || busy) return
    onShoot({ angle: dial.angle, power: dial.power, cue: cueSpot() })
  }

  return (
    <div className="flex flex-col gap-4">
      <PoolTable
        balls={balls}
        hand={hand}
        shot={shot}
        onShotDone={onShotDone}
        canAim={canAim && !busy}
        mode={mode}
        dial={dial}
        onShoot={onShoot}
        onAim={onAim}
        onCue={onCue}
        ghost={ghost}
        onLayout={setVertical}
      />
      <div className="flex flex-col items-center gap-2">
        <ControlsToggle />
        {mode === 'hold' && canAim && (
          <p className="text-center text-sm text-white/60">
            Press and hold towards where you want the cue ball to go: the longer you hold, the harder you hit, and it won&apos;t go back down. Let
            go to shoot.
            {hand ? ' Drag the cue ball first to put it where you want it.' : ''}
          </p>
        )}
        {mode === 'dial' && canAim && hand && (
          <p className="text-center text-sm text-white/60">Drag the cue ball on the table to put it where you want it.</p>
        )}
        {mode === 'drag' && canAim && (
          <p className="text-center text-sm text-white/60">
            Press anywhere on the table and drag back: the cue points the other way, and the further you pull, the harder you hit.
            {hand ? ' Drag the cue ball first to put it where you want it.' : ''}
          </p>
        )}
      </div>
      {mode === 'dial' && (
        <AimPanel
          angle={dial.angle}
          power={dial.power}
          vertical={vertical}
          onAngle={(angle) => setDial((now) => ({ ...now, angle }))}
          onPower={(power) => setDial((now) => ({ ...now, power }))}
          onShoot={shootDial}
          disabled={!canAim}
          busy={busy}
        />
      )}
    </div>
  )
}
