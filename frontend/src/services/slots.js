import { api } from './api'

// The Slot Machine on the server (backend/utils/slots.js). Amounts are in
// PP and can have cents: the machine's balance is PP and P-PP together.

// Their machine: { machine: { balance, lastWin } }.
export function getMachine() {
  return api('/slots')
}

// Add credits: `amount` whole points from the wallet, PP first, then P-PP.
// Resolves to { machine }.
export function addCredits(amount) {
  return api('/slots/credits', { method: 'POST', body: { amount } })
}

// One spin. `spinId` is the page's own id for it, so sending it again (a
// retry) gets the same spin back rather than a second one. Resolves to
// { spinId, grid, lines, bet, win, bigWin, jackpot, balance }: grid[reel][row]
// is a symbol key, and each line { line, symbol, count, multiplier, cells }.
export function spin(spinId, bet) {
  return api('/slots/spins', { method: 'POST', body: { spinId, bet } })
}

// What Cash out would do now: { pp, ppp } to the wallet, what `stays` in
// the machine (of it, `overCap`), and `capLeft`, the P-PP that can still be
// cashed out today.
export function getCashOutQuote() {
  return api('/slots/cash-out')
}

// Cash out: { machine, paid: { pp, ppp }, quote }.
export function cashOut() {
  return api('/slots/cash-out', { method: 'POST' })
}
