// Loan Shark sums the page needs as someone types, before anything is
// sent: the lending form's preview. They round the same way as the server
// (backend/utils/loanShark/math.js), which checks everything again.

const ceilDiv = (a, b) => Math.floor((a + b - 1) / b)

// Borrowing `amount` at `rate` % costs `payBack`; of the lender's profit,
// `taxPercent` % is income tax, and they keep the rest.
export function lendPreview(amount, rate, taxPercent) {
  const profit = ceilDiv(amount * rate, 100)
  const tax = ceilDiv(profit * taxPercent, 100)
  return { amount, payBack: amount + profit, profit, tax, keep: profit - tax }
}

// 200 000 000 -> "2d 7h 33m". Under a minute left, "0m".
export function formatLeft(ms) {
  const minutes = Math.floor(ms / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  return `${days}d ${hours}h ${minutes % 60}m`
}

// 12:00 on a check's day, in Helsinki, in words: "Sat 7 Nov, 12:00".
export function checkTime(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/Helsinki',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const points = (value) => (value ?? 0).toLocaleString('en-US')
