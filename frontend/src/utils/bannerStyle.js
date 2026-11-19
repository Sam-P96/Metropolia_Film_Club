// Where a banner's picture sits, as x and y from 0 to 100 (50 is centred).
// Anything missing or out of range counts as centred, or the nearest edge.
export function bannerPosition(banner) {
  const clamp = (value) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50)
  return { x: clamp(banner?.position?.x), y: clamp(banner?.position?.y) }
}

// The small video (and its first frame, the poster) the server made of a
// banner's picture (backend/utils/bannerMedia.js): { video, poster }, video
// null for a picture that doesn't move. Null until it's made, or when it
// was made for a different picture (say, while they're trying a new link).
export function bannerMedia(banner) {
  const made = banner?.converted
  if (banner?.type !== 'image' || !banner.imageUrl || !made?.poster || made.from !== banner.imageUrl) return null
  return { video: made.video ?? null, poster: made.poster }
}

// What a banner shows: its picture, sized to cover the layer, or its colour.
// The picture always covers the whole banner, and its position (percentages
// of how far it can move) can only take it as far as its own edges, so it
// never leaves a gap. The server's small copy of the picture (`media`,
// bannerMedia's, or null when it's missing: hooks/useBannerMedia.js), once
// there is one, in place of the original.
export function bannerFillStyle(banner, media = bannerMedia(banner)) {
  if (banner.type === 'image' && banner.imageUrl) {
    const { x, y } = bannerPosition(banner)
    return {
      backgroundImage: `url(${media?.poster ?? banner.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: `${x}% ${y}%`,
    }
  }
  return { backgroundColor: banner.color || '#2D1B47' }
}
