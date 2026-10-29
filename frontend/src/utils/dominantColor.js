// The picture is shrunk to this many pixels a side before counting: enough
// to find its main colour, and quick even for a big GIF.
const SAMPLE_SIZE = 32

// The most common colour in RGBA pixel data (as canvas getImageData gives
// it) as "rgb(r, g, b)", or null if every pixel is see-through. Similar
// shades (16 levels a channel) count as one, see-through pixels don't
// count, and the answer is the average of the winning shades.
export function mostCommonColor(data) {
  const buckets = new Map()
  let best = null

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue

    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
    bucket.count += 1
    bucket.r += data[i]
    bucket.g += data[i + 1]
    bucket.b += data[i + 2]
    buckets.set(key, bucket)

    if (!best || bucket.count > best.count) best = bucket
  }

  if (!best) return null

  const average = (sum) => Math.round(sum / best.count)
  return `rgb(${average(best.r)}, ${average(best.g)}, ${average(best.b)})`
}

// Each picture is only worked out once per visit: a link's promise is kept.
const found = new Map()

// The most common colour in the picture at `url` (a GIF's first frame), or
// null if it can't be read. Reading pixels needs the host to allow it
// (CORS); plenty of image hosts do, and our own pictures always can.
export function dominantColorOf(url) {
  if (!found.has(url)) {
    found.set(
      url,
      new Promise((resolve) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'

        image.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = SAMPLE_SIZE
            canvas.height = SAMPLE_SIZE
            const context = canvas.getContext('2d', { willReadFrequently: true })
            context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
            resolve(mostCommonColor(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data))
          } catch {
            // The host doesn't let pages read its pictures.
            resolve(null)
          }
        }

        image.onerror = () => resolve(null)
        image.src = url
      })
    )
  }

  return found.get(url)
}
