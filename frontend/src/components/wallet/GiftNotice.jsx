import { Link } from 'react-router-dom'
import CoinIcon from './CoinIcon'
import { timeAgo } from '../../utils/timeAgo'
import ResonanceIcon from '../resonance/ResonanceIcon'

const TONES = {
  dark: { text: 'text-white/90', muted: 'text-white/50', name: 'font-semibold text-white hover:text-brand-gold', link: 'text-brand-gold hover:text-white' },
  light: { text: 'text-ink/90', muted: 'text-ink/50', name: 'font-semibold text-ink hover:text-brand-red', link: 'text-brand-red hover:text-ink' },
}

// Another member gifted them P-PP ("Gift PP" in the Wallet), or an admin
// sent them some from the admin panel (type 'adminGrant': no name, but
// their note if they wrote one), in a gold box, the colour of P-PP.
// `light` is for the white Notifications background.
export default function GiftNotice({ item, light = false }) {
  const tone = light ? TONES.light : TONES.dark
  const amount = item.amount.toLocaleString('en-US')
  const giver = item.type === 'adminGrant' ? null : item.actors[0]

  return (
    <article className="rounded-2xl border border-brand-gold/50 bg-brand-gold/15 p-5 backdrop-blur-sm sm:p-6">
      <p className={`flex flex-wrap items-center gap-1.5 text-lg ${tone.text}`}>
        <CoinIcon kind="ppp" size={20} />
        {giver ? (
          <>
            You received {amount} PP&apos;s from{' '}
            <Link to={`/users/${giver._id}`} className={tone.name}>
              {giver.username}
            </Link>
            <ResonanceIcon userId={giver._id} />
          </>
        ) : (
          <>An admin sent you {amount} P-PP!</>
        )}
      </p>
      {item.note && <p className={`mt-2 break-words italic ${tone.text}`}>&ldquo;{item.note}&rdquo;</p>}
      <p className={`mt-1 text-sm ${tone.muted}`}>
        {timeAgo(item.at)} ·{' '}
        <Link to="/wallet" className={`font-medium transition-colors ${tone.link}`}>
          Your wallet
        </Link>
      </p>
    </article>
  )
}
