import { api } from './api'
import { walletChanged } from './wallet'

// Loan Shark (backend/routes/loanSharkRouter.js). getLoanShark resolves to
// everything the page shows: { rules, me, shark, player, now }. Every
// change resolves to { done, view }: what it did, and the page as it is now
// (and tells the wallet to load again).

export function getLoanShark() {
  return api('/loan-shark')
}

async function change(path, options) {
  const result = await api(path, options)
  walletChanged()
  return result
}

// King Loan Shark: P-PP borrowed, or points paid back (PP first, then P-PP).
export function borrowFromShark(amount) {
  return change('/loan-shark/shark/borrow', { method: 'POST', body: { amount } })
}

export function payShark(amount) {
  return change('/loan-shark/shark/pay', { method: 'POST', body: { amount } })
}

// An offer: { style: 'fixed' | 'flexible', amount (PP), rate (whole percent) }.
export function postOffer(offer) {
  return change('/loan-shark/offers', { method: 'POST', body: offer })
}

export function takeDownOffer(id) {
  return change(`/loan-shark/offers/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// All of a Fixed offer, or `amount` from a Flexible one.
export function borrowFromOffer(id, amount) {
  return change(`/loan-shark/offers/${encodeURIComponent(id)}/borrow`, { method: 'POST', body: { amount } })
}

// "Pay off now": everything owed on one player loan.
export function payOffDebt(id) {
  return change(`/loan-shark/debts/${encodeURIComponent(id)}/pay`, { method: 'POST' })
}

// Admins, for testing: the next 12:00 check, now, for them or `username`.
export function runTestCheck(username) {
  return change('/loan-shark/test/check', { method: 'POST', body: { username } })
}
