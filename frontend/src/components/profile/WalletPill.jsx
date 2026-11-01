import CoinIcon from '../wallet/CoinIcon'

// A member's PP and P-PP in a small black pill, beside Stats on their
// profile. Just the amounts: unlike the nav's balance, it isn't a link,
// since it may well be someone else's.
export default function WalletPill({ wallet }) {
  if (!wallet) return null

  return (
    <span
      role="img"
      aria-label={`${wallet.pp.toLocaleString('en-US')} PP and ${wallet.ppp.toLocaleString('en-US')} P-PP`}
      className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/80 px-3 py-1 text-sm font-semibold text-white tabular-nums shadow-md shadow-black/40"
    >
      <span className="flex items-center gap-1.5">
        <CoinIcon kind="pp" size={16} />
        {wallet.pp.toLocaleString('en-US')}
      </span>
      <span className="flex items-center gap-1.5">
        <CoinIcon kind="ppp" size={16} />
        {wallet.ppp.toLocaleString('en-US')}
      </span>
    </span>
  )
}
