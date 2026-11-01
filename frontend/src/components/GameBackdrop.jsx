import { motion } from 'motion/react'

// The background of a game's page: the club's dark ink and purple, with the
// purple running into the game's own colour (`to`) towards the bottom right.
// Double or Nothing goes to green, Box Office Scratch to blue, Kino Farkle
// to red. Fixed to the window behind the whole page, like the Notifications
// GIF, so it stays put as the page scrolls. It fades in as the page opens,
// so the site's usual purple turns into the game's colour.
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
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ backgroundImage: `linear-gradient(160deg, #0B0710 0%, #1A1024 35%, #2D1B47 58%, ${to} 100%)` }}
    />
  )
}
