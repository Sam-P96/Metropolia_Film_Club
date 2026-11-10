import { api } from './api'

// The logged-in member's wallet: { pp, ppp, dailyPp, ppCap, nextPayoutAt }.
// `ppp` is P-PP. dailyPp is what the 12:00 payout gives them, ppCap the
// most PP they can hold.
export function getWallet() {
  return api('/wallet')
}

// Their newest wallet changes, newest first. Each is { _id, reason, pp,
// ppp, balance: { pp, ppp }, at }: pp and ppp are what it added (positive)
// or took (negative).
export function getWalletHistory() {
  return api('/wallet/history')
}

// A page of the PP Leaderboard (members by PP and P-PP together), 10 at a
// time down to the top 100: { leaders: [{ user, pp }], hasMore, next }.
// `pp` is that total, below 0 for a member in debt.
export function getPpLeaderboard(skip = 0) {
  return api(`/wallet/leaderboard?skip=${skip}`)
}

// "Gift PP": `amount` P-PP to the member `to`, for a 1 point fee (PP if
// they have any, otherwise P-PP). Resolves to what it took: { pp, ppp }.
export function sendGift({ to, amount }) {
  return api('/wallet/gifts', { method: 'POST', body: { to, amount } })
}

// Anything that changes the wallet (a bet, a win) calls this, and every
// balance on the page loads again (hooks/useWallet.js).
export const WALLET_CHANGED_EVENT = 'wallet-changed'

export function walletChanged() {
  window.dispatchEvent(new Event(WALLET_CHANGED_EVENT))
}