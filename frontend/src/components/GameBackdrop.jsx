import { motion } from 'motion/react'
import { backdropImage } from '../utils/gameBackdrop'

// On a phone or tablet the backgrounds run on 10% past the bottom of the
// screen, so the address bar sliding away never uncovers a black bar.
const RUN_ON = 'bottom-0 max-lg:-bottom-[10%]'

// The background of a full-screen game layer (Kino Poker's table, Steal and
// Defend's quiz), behind it from its `top` to past the bottom of the screen.
// The layer is exactly as tall as what you can see, and when the address
// bar slides away it takes a moment to grow: this fills that gap with the
// same colours. `className` gives it a z-index just under the layer's.
export function FrameBackdrop({ top, to, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 ${RUN_ON} ${className}`}
      style={{ top, backgroundImage: backdropImage(to), backgroundAttachment: 'fixed' }}
    />
  )
}

// The background of a game's page: the club's dark ink and purple, with the
// purple running into the game's own colour (`to`) towards the bottom right.
// Double or Nothing goes to golden yellow, Box Office Scratch to blue, Kino
// Farkle to red, Steal and Defend to orange, Kino Poker to wine red. Fixed
// to the window behind the whole page, like the Notifications GIF, so it
// stays put as the page scrolls. It fades in as the page opens, so the
// site's usual purple turns into the game's colour.
//
// Put it outside anything that slides in: a moving parent would carry a
// fixed background along with it.
export default function GameBackdrop({ to }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.6, ease: 'easeInOut' }}
      className={`pointer-events-none fixed inset-x-0 top-0 -z-10 ${RUN_ON}`}
      style={{ backgroundImage: backdropImage(to) }}
    />
  )
}
