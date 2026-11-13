import { useReducedMotion } from 'motion/react'

// React sets `muted` on the video as a property, not as an attribute, and
// iOS Safari only autoplays a video with the muted attribute. defaultMuted
// is that attribute.
function keepMuted(video) {
  if (video) video.defaultMuted = true
}

// A short looping video filling the box behind it, in place of a GIF: the
// same picture at a fraction of the size. `poster` is its first frame,
// shown until the video plays. `className` adds to the size and placing
// every background uses (say -z-10).
//
// Like the GIFs it replaces, it needs `relative` (or similar) on the box it
// fills. Anyone who has asked their system for reduced motion gets the
// poster, standing still, and the video isn't downloaded at all.
function LoopVideo({ src, poster, className = '' }) {
  const still = useReducedMotion()
  const classes = `absolute inset-0 h-full w-full object-cover ${className}`

  if (still) return <img src={poster} alt="" aria-hidden="true" className={classes} />

  return (
    <video
      ref={keepMuted}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={poster}
      aria-hidden="true"
      className={classes}
    />
  )
}

export default LoopVideo
