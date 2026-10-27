const BANNER_ALPHA = {
  opaque: 1,
  translucent: 0.55,
  glass: 0.35,
}

// The inline style for a layer showing a member's review card banner.
export function bannerLayerStyle(banner) {
  if (!banner) return {}

  const style = banner.style || 'opaque'
  const alpha = BANNER_ALPHA[style] ?? 1

  const base =
    banner.type === 'image' && banner.imageUrl
      ? {
          backgroundImage: `url(${banner.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : { backgroundColor: banner.color || '#2D1B47' }

  const glassExtras =
    style === 'glass'
      ? {
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        }
      : {}

  return { ...base, opacity: alpha, ...glassExtras }
}
