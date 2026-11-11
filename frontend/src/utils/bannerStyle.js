const BANNER_ALPHA = {
  opaque: 1,
  translucent: 0.55,
  glass: 0.35,
}

// Where a banner's picture sits, as x and y from 0 to 100 (50 is centred).
// Anything missing or out of range counts as centred, or the nearest edge.
export function bannerPosition(banner) {
  const clamp = (value) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50)
  return { x: clamp(banner?.position?.x), y: clamp(banner?.position?.y) }
}

// What a banner shows: its picture, sized to cover the layer, or its colour.
// The picture always covers the whole banner, and its position (percentages
// of how far it can move) can only take it as far as its own edges, so it
// never leaves a gap.
export function bannerFillStyle(banner) {
  if (banner.type === 'image' && banner.imageUrl) {
    const { x, y } = bannerPosition(banner)
    return {
      backgroundImage: `url(${banner.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: `${x}% ${y}%`,
    }
  }
  return { backgroundColor: banner.color || '#2D1B47' }
}

// How see-through a banner layer is, and the glass style's blur and edge.
export function bannerFrameStyle(banner) {
  const style = banner.style || 'opaque'
  const alpha = BANNER_ALPHA[style] ?? 1

  const glassExtras =
    style === 'glass'
      ? {
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        }
      : {}

  return { opacity: alpha, ...glassExtras }
}

// The inline style for a layer showing a member's review card banner.
export function bannerLayerStyle(banner) {
  if (!banner) return {}
  return { ...bannerFillStyle(banner), ...bannerFrameStyle(banner) }
}
