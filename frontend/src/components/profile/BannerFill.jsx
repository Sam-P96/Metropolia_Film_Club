import LoopVideo from '../LoopVideo'
import { bannerFillStyle, bannerMedia, bannerPosition } from '../../utils/bannerStyle'

// A member's review card banner filling the box it's in (which needs
// `relative` or similar): an animated picture as the small looping video the
// server made of it, a still one as its small copy, a colour as itself, or
// the original picture until the server has made its copy. The banner's
// position applies to all of them. `className` adds to its classes (say,
// rounded corners), `style` to its style (say, a mask).
function BannerFill({ banner, className = '', style }) {
  if (!banner) return null
  const media = bannerMedia(banner)

  if (media?.video) {
    const { x, y } = bannerPosition(banner)
    return <LoopVideo src={media.video} poster={media.poster} className={className} style={{ objectPosition: `${x}% ${y}%`, ...style }} />
  }

  return <div aria-hidden="true" className={`absolute inset-0 ${className}`} style={{ ...bannerFillStyle(banner), ...style }} />
}

export default BannerFill
