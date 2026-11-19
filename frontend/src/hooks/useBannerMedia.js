import { useEffect, useSyncExternalStore } from 'react'
import { bannerMedia } from '../utils/bannerStyle'

// The server keeps its small copies of banners (backend/utils/bannerMedia.js)
// on its own disk, but says which exist in the database. A server whose
// disk doesn't have them (a fresh install, a wiped disk, no ffmpeg to make
// them again) would point every banner at a file that isn't there, and the
// banners would come up empty. So each copy is checked once per page load,
// by loading its poster, and a banner whose copy doesn't load shows its
// original picture instead.

// Copies checked so far, and the ones that didn't load.
const started = new Set()
const missing = new Set()
const listeners = new Set()

function markMissing(poster) {
  if (!poster || missing.has(poster)) return
  missing.add(poster)
  for (const listener of listeners) listener()
}

function check(poster) {
  if (started.has(poster)) return
  started.add(poster)
  const probe = new Image()
  probe.onerror = () => markMissing(poster)
  probe.src = poster
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// `banner`'s small copies, { video, poster } (as bannerMedia), while they
// load, or null: no copies yet, or they're missing, so its original
// picture shows. `onMissing` is for a copy that fails some other way (the
// video, say), to switch every banner using it over too.
export function useBannerMedia(banner) {
  const media = bannerMedia(banner)
  const poster = media?.poster ?? null
  const gone = useSyncExternalStore(subscribe, () => (poster ? missing.has(poster) : false))

  useEffect(() => {
    if (poster) check(poster)
  }, [poster])

  return { media: gone ? null : media, onMissing: () => markMissing(poster) }
}
