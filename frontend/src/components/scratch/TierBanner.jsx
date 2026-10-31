import { motion } from 'motion/react'
import CoinIcon from '../wallet/CoinIcon'
import { Bulbs } from './Marquee'
import { GoldenTicketIcon } from './TileFace'
import { SCRATCH } from '../../../../shared/scratch/config.js'

const format = (points) => points.toLocaleString('en-US')

// What a card won, on a cinema marquee: bulbs chasing round a gold frame,
// "Now showing" over the tier, and the payout. It springs in when the tier
// locks in. `kind` is 'tier' (with `tier` from the card), 'jackpot' (with
// `amount`), or 'bomb' for a card that ran out of scratches.
export default function TierBanner({ kind, tier, amount }) {
  const jackpot = kind === 'jackpot'
  const bomb = kind === 'bomb'

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: -14, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={`relative overflow-hidden rounded-2xl border-2 px-4 py-3 text-center ${
        bomb
          ? 'border-brand-red/60 bg-black/60'
          : jackpot
            ? 'border-brand-gold bg-black/70 shadow-[0_0_28px_rgba(250,188,63,0.55)]'
            : 'border-brand-gold/80 bg-black/60 shadow-[0_0_18px_rgba(250,188,63,0.3)]'
      }`}
    >
      {!bomb && <Bulbs count={12} className="mb-2 px-1" />}

      <p className={`font-['Bebas_Neue'] text-sm tracking-[0.3em] ${bomb ? 'text-brand-red' : 'text-brand-gold/80'}`}>
        {bomb ? 'Closing night' : jackpot ? 'Golden Ticket' : 'Now showing'}
      </p>

      <p className={`font-['Bebas_Neue'] text-3xl leading-tight tracking-wide sm:text-4xl ${bomb ? 'text-white/70' : 'text-white'}`}>
        {bomb ? SCRATCH.loss.name : jackpot ? 'Jackpot!' : tier.name}
      </p>

      <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold">
        {bomb ? (
          <span className="text-white/60">Not enough stars this time.</span>
        ) : jackpot ? (
          <>
            <GoldenTicketIcon className="w-6" />
            <span className="text-brand-gold">+{format(amount)} P-PP</span>
          </>
        ) : tier.refund ? (
          <span className="text-emerald-300">Your ticket price is back in your wallet</span>
        ) : (
          <>
            <CoinIcon kind="ppp" size={16} />
            <span className="text-brand-gold">+{format(tier.ppp)} P-PP</span>
          </>
        )}
      </p>

      {!bomb && <Bulbs count={12} className="mt-2 px-1" />}
    </motion.div>
  )
}
