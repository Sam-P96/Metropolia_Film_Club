import { setParticles, useParticles } from './particles'

// Particle effects on or off (particles.js): the sparks or Ignition when
// balls collide. Remembered on this device. In the header of the game
// pages.
export default function ParticlesToggle() {
  const on = useParticles()

  return (
    <button
      type="button"
      onClick={() => setParticles(!on)}
      aria-pressed={on}
      title="The sparks, or Ignitions, when balls collide"
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-center text-sm transition-colors ${
        on ? 'border-[#ff4d8d]/50 bg-[#ff4d8d]/15 text-white' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
      }`}
    >
      <span aria-hidden="true" className={on ? 'text-[#ffb3d1]' : 'text-white/40'}>
        ✦
      </span>
      {on ? 'Particles on' : 'Particles off'}
    </button>
  )
}
