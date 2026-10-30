import { useEffect, useState } from 'react'

// Which of a die's 9 spots have a pip, for each face. The spots go
// 1 2 3 / 4 5 6 / 7 8 9, top left to bottom right.
const PIPS = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

const SPOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// large: on the table. small: set aside. tiny: in the scoring guide.
// The padding is fixed per size, never a %: a % padding is measured
// against the box around the die, not the die, and squeezes the pips away.
const SIZES = {
  large: 'size-16 rounded-xl p-2.5 sm:size-18 sm:p-3',
  small: 'size-8 rounded-md p-1',
  tiny: 'size-6 rounded p-[3px]',
}

// One die. With `onClick` it's a button you can tap to pick it; without,
// it's just a picture. While `rolling`, it tumbles and flicks through
// random faces until it lands on `value`.
export default function Die({ value, size = 'large', rolling = false, selected = false, ghost = false, disabled = false, onClick, delay = 0 }) {
  const [spinFace, setSpinFace] = useState(value)

  useEffect(() => {
    if (!rolling) return
    const timer = setInterval(() => setSpinFace(1 + Math.floor(Math.random() * 6)), 80)
    return () => clearInterval(timer)
  }, [rolling])

  const face = rolling ? spinFace : value

  const pips = SPOTS.map((spot) => (
    <span
      key={spot}
      className={`size-[70%] place-self-center rounded-full ${PIPS[face].includes(spot) ? 'bg-dice-pip shadow-inner' : ''}`}
    />
  ))

  const look = `grid grid-cols-3 grid-rows-3 bg-linear-to-br from-dice-ivory to-dice-shade ${SIZES[size]}`

  if (!onClick) {
    return (
      <span role="img" aria-label={`Die showing ${face}`} className={`${look} shadow-[0_2px_0_rgb(0_0_0/0.45)] ${ghost ? 'opacity-15' : ''}`}>
        {pips}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Die showing ${face}`}
      style={{ animationDelay: `${delay}ms` }}
      className={`${look} cursor-pointer transition duration-150 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand-gold disabled:cursor-default ${
        selected
          ? '-translate-y-2 shadow-[0_10px_18px_rgb(0_0_0/0.45)] ring-3 ring-brand-gold'
          : 'shadow-[0_5px_0_rgb(0_0_0/0.45)]'
      } ${rolling ? 'animate-dice-tumble motion-reduce:animate-none' : ''}`}
    >
      {pips}
    </button>
  )
}