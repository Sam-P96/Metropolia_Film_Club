import { newRun } from '../../../../shared/forrest/engine.js'

// A run to play, from the server's start ({ id, seed, mult, cost, free }):
// its state, the steps tapped on, and whether a tap is waiting for the
// next step (ForrestStage.jsx plays it).
export function liveRun(run) {
  const s = newRun({ seed: run.seed, mult: run.mult })
  s.cost = run.cost
  s.free = run.free
  return { run, s, taps: [], pending: false, told: false }
}
