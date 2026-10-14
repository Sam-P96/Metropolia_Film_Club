// A looping GIF filling the section behind it, with a dark wash on top so
// text stays readable. Darker at the top and bottom edges, so it blends into
// the sections above and below.
//
// The section needs `relative overflow-hidden`, and its content `relative`
// so it paints above the GIF. Hidden for anyone who has asked their system
// for reduced motion.
function GifBackground({ src }) {
  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      />
      <div className="absolute inset-0 bg-linear-to-b from-ink/80 via-ink/40 to-ink/80" />
    </>
  )
}

export default GifBackground
