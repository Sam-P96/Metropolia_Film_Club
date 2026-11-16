import PoolTable from './PoolTable'

// The table and how to shoot, for every 8 Ball Pool game (PoolMatch.jsx,
// PoolClanker.jsx): press and hold towards where the shot goes, the power
// building the longer you hold, and let go. A line shows where the cue
// ball goes and the first ball it hits.
//
//   balls, hand, shot, onShotDone, ghost   as PoolTable.jsx
//   canAim     it's your shot and nothing is moving
//   busy       your shot is on its way
//   onShoot({ angle, power, cue })
//   onAim({ angle, power, on, cue })   your aim as it moves (Play Live)
export default function PoolPlay({ balls, hand, shot, onShotDone, ghost, canAim, busy, onShoot, onAim }) {
  return (
    <div className="flex flex-col gap-3">
      <PoolTable
        balls={balls}
        hand={hand}
        shot={shot}
        onShotDone={onShotDone}
        canAim={canAim && !busy}
        onShoot={onShoot}
        onAim={onAim}
        ghost={ghost}
      />
      {canAim && (
        <p className="text-center text-sm text-white/60">
          Press and hold towards where you want the cue ball to go: the longer you hold, the harder you hit, and it won&apos;t go back down. Let go to
          shoot.
          {hand ? ' Drag the cue ball first to put it where you want it.' : ''}
        </p>
      )}
    </div>
  )
}
