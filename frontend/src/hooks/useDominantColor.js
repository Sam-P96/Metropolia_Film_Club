import { useEffect, useState } from 'react'

import { dominantColorOf } from '../utils/dominantColor'

// The most common colour in the picture at `url`, or null while it's being
// worked out, when it can't be, or when there's no `url`.
function useDominantColor(url) {
  const [result, setResult] = useState({ url: null, color: null })

  useEffect(() => {
    if (!url) return

    let cancelled = false
    dominantColorOf(url).then((color) => {
      if (!cancelled) setResult({ url, color })
    })

    return () => {
      cancelled = true
    }
  }, [url])

  return result.url === url ? result.color : null
}

export default useDominantColor
