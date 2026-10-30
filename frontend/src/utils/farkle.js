import { PVP_MIN_STAKE, formatPoints } from '../../../shared/farkle/rules.js'

// What's wrong with `stakeText` as a stake between two members, or '' if
// nothing is. `max` is the most it can be: what the poorer of the two has.
export function stakeHint(stakeText, max) {
  const stake = Number(stakeText)
  if (stakeText === '' || !Number.isInteger(stake)) return 'A stake is a whole number of points.'
  if (max < PVP_MIN_STAKE) return `One of you has fewer than ${PVP_MIN_STAKE} points, so there's nothing to play for yet.`
  if (stake < PVP_MIN_STAKE) return `The smallest stake is ${PVP_MIN_STAKE}.`
  if (stake > max) return `The most you two can play for right now is ${formatPoints(max)}.`
  return ''
}

// Roughly how long `ms` is: "2 days 4 hours", "3 hours 10 minutes", "5 minutes".
export function roughTimeLeft(ms) {
  const minutes = Math.max(1, Math.ceil(ms / 60000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  const unit = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

  if (days) return hours ? `${unit(days, 'day')} ${unit(hours, 'hour')}` : unit(days, 'day')
  if (hours) return rest ? `${unit(hours, 'hour')} ${unit(rest, 'minute')}` : unit(hours, 'hour')
  return unit(rest, 'minute')
}

// "Mon 3 Nov, 14:05", in the member's own time.
export function formatDeadline(iso) {
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
