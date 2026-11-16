import { setClassic, useClassicStones } from './classicPieces'

// Classic stones on or off (classicPieces.js): every piece as a plain black
// or white stone, shockwaves and all else as they are. Remembered on this
// device. Sits beside the sound toggle on the game pages.
export default function ClassicToggle() {
  const classic = useClassicStones()

  return (
    <button
      type="button"
      onClick={() => setClassic(!classic)}
      aria-pressed={classic}
      title="Show every piece as a plain black or white stone"
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-center text-sm transition-colors ${
        classic ? 'border-white/40 bg-white/15 text-white' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
      }`}
    >
      <span aria-hidden="true" className="flex items-center gap-0.5">
        <span className="inline-block size-3 rounded-full bg-[radial-gradient(circle_at_34%_30%,#6e6c7a,#0a0a0d_72%)]" />
        <span className="inline-block size-3 rounded-full bg-[radial-gradient(circle_at_34%_30%,#fff,#d2cedd_78%)]" />
      </span>
      {classic ? 'Classic stones on' : 'Classic stones off'}
    </button>
  )
}
