const formatter = new Intl.RelativeTimeFormat('en', {numeric: 'auto'})

const units = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
]

export function timeAgo(isoString) {
    const seconds = Math.round((new Date(isoString) - new Date()) / 1000)

    for (const [unit, secondsInUnit] of units) {
        if (Math.abs(seconds) >= secondsInUnit) {
            return formatter.format(Math.round(seconds / secondsInUnit), unit)
        }
    }
    return 'just now'
}