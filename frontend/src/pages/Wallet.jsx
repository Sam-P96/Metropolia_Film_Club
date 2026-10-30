import { useEffect, useState } from 'react'
import CoinIcon from '../components/wallet/CoinIcon'
import GiftForm from '../components/wallet/GiftForm'
import useWallet from '../hooks/useWallet'
import { WALLET_CHANGED_EVENT, getWalletHistory } from '../services/wallet'
import { timeAgo } from '../utils/timeAgo'

const CARD = 'rounded-2xl border border-white/10 bg-plum/40 p-6 shadow-xl shadow-black/40 backdrop-blur-md'

const REASONS = {
  dailyPayout: 'Daily payout',
  bet: 'Bet',
  win: 'Win',
  refund: 'Bet returned',
  shop: 'Shop',
  admin: 'Changed by an admin',
  giftSent: 'Gift',
  giftReceived: 'Gift',
}

// What a history row was. Gifts say who to or from.
function labelFor(row) {
  const name = row.other?.username ?? 'a former member'
  if (row.reason === 'giftSent') return `Gift to ${name} (with the 1 point fee)`
  if (row.reason === 'giftReceived') return `Gift from ${name}`
  return REASONS[row.reason] ?? row.reason
}

const format = (points) => points.toLocaleString('en-US')
const signed = (points) => `${points > 0 ? '+' : '−'}${format(Math.abs(points))}`

// 12:00 on a day, in the member's own words: "Sat 12:00".
function payoutTime(iso) {
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/Helsinki', weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

// The logged-in member's PP and P-PP, how they earn PP, how bets are paid
// for, and their latest wallet changes. App.jsx sends logged-out visitors
// to log in first.
export default function Wallet() {
  const wallet = useWallet()
  const [history, setHistory] = useState(null)

  useEffect(() => {
    let stopped = false
    const load = () =>
      getWalletHistory()
        .then((rows) => {
          if (!stopped) setHistory(rows)
        })
        .catch(() => {
          if (!stopped) setHistory([])
        })

    load()
    window.addEventListener(WALLET_CHANGED_EVENT, load)
    return () => {
      stopped = true
      window.removeEventListener(WALLET_CHANGED_EVENT, load)
    }
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold text-white">Wallet</h1>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Balances">
        <div className={CARD}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
            <CoinIcon kind="pp" /> Power Points
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums text-white">{wallet ? format(wallet.pp) : '–'}</div>
          {wallet && (
            <p className="mt-2 text-sm text-white/70">
              {wallet.dailyPp > 0
                ? `+${format(wallet.dailyPp)} PP every day at 12:00, up to ${format(wallet.ppCap)}.`
                : 'Write a review to start earning: 1 PP per review you have written, every day at 12:00.'}
              {wallet.dailyPp > 0 && wallet.nextPayoutAt && ` Next payout: ${payoutTime(wallet.nextPayoutAt)}.`}
            </p>
          )}
        </div>

        <div className={CARD}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
            <CoinIcon kind="ppp" /> Premium Power Points
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums text-brand-gold">{wallet ? format(wallet.ppp) : '–'}</div>
          <p className="mt-2 text-sm text-white/70">Won in games, with no cap. Soon: badges and trophies.</p>
        </div>
      </section>

      <section className={CARD}>
        <h2 className="text-lg font-semibold text-white">How bets are paid</h2>
        <p className="mt-2 text-sm text-white/70">
          Your PP goes first, then P-PP for the rest. With 40 PP and 100 P-PP, a 60 bet takes all 40 PP and 20 P-PP. Winnings are
          always paid in P-PP. Points can't be bought or cashed out.
        </p>
      </section>

      <section className={CARD}>
        <h2 className="text-lg font-semibold text-white">Gift PP</h2>
        <p className="mt-2 mb-4 text-sm text-white/70">
          Give some of your P-PP to another member. Each gift costs 1 point on top, whatever its size: 1 PP if you have any,
          otherwise 1 P-PP.
        </p>
        <GiftForm wallet={wallet} />
      </section>

      <section className={CARD}>
        <h2 className="mb-3 text-lg font-semibold text-white">History</h2>
        {history === null ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-white/50">Payouts, bets and wins show up here.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {history.map((row) => (
              <li key={row._id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                <div className="min-w-0">
                  <div className="text-white">{labelFor(row)}</div>
                  <div className="text-xs text-white/50">{timeAgo(row.at)}</div>
                </div>
                <div className="flex items-center gap-4 tabular-nums">
                  {row.pp !== 0 && (
                    <span className={`flex items-center gap-1 ${row.pp > 0 ? 'text-green-300' : 'text-white/80'}`}>
                      <CoinIcon kind="pp" size={15} /> {signed(row.pp)}
                    </span>
                  )}
                  {row.ppp !== 0 && (
                    <span className={`flex items-center gap-1 ${row.ppp > 0 ? 'text-brand-gold' : 'text-white/80'}`}>
                      <CoinIcon kind="ppp" size={15} /> {signed(row.ppp)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}