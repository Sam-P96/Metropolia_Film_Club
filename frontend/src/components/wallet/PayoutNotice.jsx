import { Link } from 'react-router-dom'
import CoinIcon from './CoinIcon'
import { timeAgo } from '../../utils/timeAgo'

const TONES = {
  dark: { text: 'text-white/80', muted: 'text-white/50', amount: 'text-emerald-300', link: 'text-brand-gold hover:text-white' },
  light: { text: 'text-ink/80', muted: 'text-ink/50', amount: 'text-emerald-700', link: 'text-brand-red hover:text-ink' },
}

// The 12:00 payout reached them: in a green box, like a like. Only the
// latest one is kept (backend/utils/notify.js notePayout). `light` is for
// the white Notifications background.
export default function PayoutNotice({ item, light = false }) {
  const tone = light ? TONES.light : TONES.dark

  return (
    <article className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 backdrop-blur-sm sm:p-6">
      <h2 className={`text-sm font-semibold ${tone.amount}`}>Daily payout</h2>
      <p className={`mt-2 flex flex-wrap items-center gap-2 text-lg ${tone.text}`}>
        <CoinIcon kind="pp" size={22} />
        <span className={`text-2xl font-bold tabular-nums ${tone.amount}`}>+{item.amount.toLocaleString('en-US')} PP</span>
        <span>from today's payout.</span>
      </p>
      <p className={`mt-1 text-sm ${tone.muted}`}>
        1 PP for every review you've written, every day at 12:00 · {timeAgo(item.at)} ·{' '}
        <Link to="/wallet" className={`font-medium transition-colors ${tone.link}`}>
          Your wallet
        </Link>
      </p>
    </article>
  )
}
