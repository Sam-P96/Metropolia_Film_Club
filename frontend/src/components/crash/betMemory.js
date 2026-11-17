// The last bet and auto-cash-out target, remembered on this device
// (BetControls.jsx): { bet, autoOn, autoText }.
const KEY = 'crash.bet'

export function savedBet() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return { bet: Number(saved?.bet) || 1, autoOn: Boolean(saved?.autoOn), autoText: String(saved?.autoText ?? '2') }
  } catch {
    return { bet: 1, autoOn: false, autoText: '2' }
  }
}

export function saveBet(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Storage is off (a private window): it lasts until the page closes.
  }
}
