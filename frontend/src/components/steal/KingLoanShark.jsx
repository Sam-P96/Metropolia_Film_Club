import onsenShark from '../../assets/Onsen_Shark.webp'
import { STEAL } from '../../../../shared/steal/config.js'

const SIZES = { sm: 'size-10', md: 'size-14', lg: 'size-20' }

// King Loan Shark's profile picture: assets/Onsen_Shark.webp, framed on the
// shark's head (the picture is a wide scene, so a plain centre crop would
// mostly be splash). The framing is the backgroundSize/Position below.
export function LoanSharkAvatar({ size = 'md' }) {
  return (
    <span
      role="img"
      aria-label="King Loan Shark"
      className={`${SIZES[size] ?? SIZES.md} block shrink-0 rounded-full bg-ink bg-no-repeat ring-2 ring-brand-gold shadow-[0_0_14px_rgba(250,188,63,0.45)]`}
      style={{ backgroundImage: `url(${onsenShark})`, backgroundSize: '120% auto', backgroundPosition: '68% 35%' }}
    />
  )
}

// King Loan Shark's word on a Critical Hit (spec §8.3): his picture, his
// name, and the lore, like a message from him. On the result screen, the
// gold Critical Hit notice and How to Play.
export default function LoanSharkMessage({ size = 'md', className = '' }) {
  return (
    <div className={`flex items-start gap-3 text-left ${className}`}>
      <LoanSharkAvatar size={size} />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-brand-gold/40 bg-black/50 px-3 py-2">
        <p className="text-xs font-semibold tracking-widest text-brand-gold uppercase">King Loan Shark</p>
        <p className="mt-0.5 text-sm text-brand-gold/90 italic">{STEAL.crit.lore}</p>
      </div>
    </div>
  )
}
