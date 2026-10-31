import { NavLink } from 'react-router-dom'
import CoinIcon from './CoinIcon'
import AnimatedNumber from '../AnimatedNumber'

// Both balances side by side, linking to the Wallet page. `wallet` comes
// from useWallet; while it's loading, the amounts show as "–". They count
// up and down to a new balance rather than jumping.
// `block` makes it a full-width row for the mobile menu.
export default function CoinBalance({ wallet, block = false }) {
  const base = block
    ? 'flex items-center gap-4 rounded-md px-4 py-3 text-base font-medium'
    : 'flex h-10 shrink-0 items-center gap-3 rounded-full border px-3.5 text-sm font-semibold'

  const classes = ({ isActive }) =>
    `${base} tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
      isActive
        ? 'border-brand-gold/60 bg-white/10 text-brand-gold'
        : 'border-white/20 bg-white/5 text-white/90 hover:border-brand-gold/60 hover:bg-white/10 hover:text-white'
    }`

  return (
    <NavLink to="/wallet" className={classes} title="Your PP and P-PP" aria-label={wallet ? `Wallet: ${wallet.pp} PP, ${wallet.ppp} P-PP` : 'Wallet'}>
      {block && <span className="mr-auto">Wallet</span>}
      <span className="flex items-center gap-1.5">
        <CoinIcon kind="pp" />
        {wallet ? <AnimatedNumber value={wallet.pp} /> : '–'}
      </span>
      <span className="flex items-center gap-1.5">
        <CoinIcon kind="ppp" />
        {wallet ? <AnimatedNumber value={wallet.ppp} /> : '–'}
      </span>
    </NavLink>
  )
}