// How things come and go on Steal and Defend's pages (with motion/react),
// so buying, selling and trading never just snap. Spread onto a motion
// element: <motion.li {...SLIDE} layout>. Each page's StealPage wraps it all
// in MotionConfig reducedMotion="user", so with reduced motion they fade.
export const EASE = [0.22, 1, 0.36, 1]

// A card or row: slides up and fades in, shrinks and fades out.
export const SLIDE = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.22, ease: 'easeIn' } },
}

// Swapping one thing for another in place (a form step, a label): a short fade.
export const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

// Cards moving to fill a gap, or making room. Never on anything with a
// backdrop blur: moving a blurred box makes the blur flicker (which is why
// the game's glass boxes have none: style.js GLASS).
export const LAYOUT = { layout: true, transition: { layout: { duration: 0.3, ease: EASE } } }
