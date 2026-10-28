import { bannerLayerStyle } from '../../utils/bannerStyle'

const FADE_RIGHT = {
  maskImage: 'linear-gradient(to right, black 60%, transparent)',
  WebkitMaskImage: 'linear-gradient(to right, black 60%, transparent)',
}

// A member's review card banner behind the left of a list row: as long as a
// card, 15% longer on desktop, fading out on the right. The row needs
// `relative isolate` so this sits behind its content.
function BannerStrip({ banner }) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-120 max-w-full lg:w-138"
      style={FADE_RIGHT}
    >
      <div className="absolute inset-0" style={bannerLayerStyle(banner)} />
      <div className="absolute inset-0 bg-ink/30" />
    </div>
  )
}

export default BannerStrip
