import LoopVideo from './LoopVideo'

// A looping video (once a GIF) filling the section behind it, with a dark
// wash on top so text stays readable. Darker at the top and bottom edges, so
// it blends into the sections above and below. `video` is the MP4 and
// `poster` its first frame (see LoopVideo).
//
// The section needs `relative overflow-hidden`, and its content `relative`
// so it paints above the video. A still poster for anyone who has asked
// their system for reduced motion.
function GifBackground({ video, poster }) {
  return (
    <>
      <LoopVideo src={video} poster={poster} />
      <div className="absolute inset-0 bg-linear-to-b from-ink/80 via-ink/40 to-ink/80" />
    </>
  )
}

export default GifBackground
