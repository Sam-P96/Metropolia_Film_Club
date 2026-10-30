import { Link } from 'react-router-dom'
import CoinIcon from './CoinIcon'
import { timeAgo } from '../../utils/timeAgo'

const TONES = {
  dark: { text: 'text-white/90', muted: 'text-white/50', name: 'font-semibold text-white hover:text-brand-gold', link: 'text-brand-gold hover:text-white' },
  light: { text: 'text-ink/90', muted: 'text-ink/50', name: 'font-semibold text-ink hover:text-brand-red', link: 'text-brand-red hover:text-ink' },
}

// Another member gifted them P-PP ("Gift PP" in the Wallet), in a gold box,
// the colour of P-PP. `light` is for the white Notifications background.
export default function GiftNotice({ item, light = false }) {
  const tone = light ? TONES.light : TONES.dark
  const giver = item.actors[0]

  return (
    <article className="rounded-2xl border border-brand-gold/50 bg-brand-gold/15 p-5 backdrop-blur-sm sm:p-6">
      <p className={`flex flex-wrap items-center gap-1.5 text-lg ${tone.text}`}>
        <CoinIcon kind="ppp" size={20} />
        You received {item.amount.toLocaleString('en-US')} PP&apos;s from{' '}
        <Link to={`/users/${giver._id}`} className={tone.name}>
          {giver.username}
        </Link>
      </p>
      <p className={`mt-1 text-sm ${tone.muted}`}>
        {timeAgo(item.at)} ·{' '}
        <Link to="/wallet" className={`font-medium transition-colors ${tone.link}`}>
          Your wallet
        </Link>
      </p>
    </article>
  )
}
