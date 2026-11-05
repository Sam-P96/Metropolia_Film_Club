import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import CoinIcon from '../wallet/CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import { GoldenTicketIcon, StarIcon } from './TileFace'
import { timeAgo } from '../../utils/timeAgo'
import { ticketTiers, ticketType, ticketTypeOf } from '../../../../shared/scratch/tickets.js'
import { ticketTheme } from './ticketThemes'
import ResonanceIcon from '../resonance/ResonanceIcon'

// The way into the game, in the ticket's colours (--tk-cta): gold on
// Standard and Premium, purple on VIP.
const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-(--tk-cta) px-4 font-bold text-(--tk-cta-text) transition hover:brightness-110'

// The tier `key` as a `type` ticket pays it, with `refund` for Straight to
// DVD (shared/scratch/tickets.js).
const tierByKey = (key, type) => ticketTiers(type).find((tier) => tier.key === key) ?? null
const format = (points) => points.toLocaleString('en-US')

// The winner's picture and name, both linking to their profile. The name's
// colours (`nameClass`) depend on what it sits on.
function winnerParts(user, nameClass) {
  return {
    face: (
      <Link to={`/users/${user._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
        <MemberAvatar user={user} size="lg" />
      </Link>
    ),
    name: (
      <>
        <Link to={`/users/${user._id}`} className={`font-semibold ${nameClass}`}>
          {user.username}
        </Link>
        <ResonanceIcon userId={user._id} className="ml-1" />
      </>
    ),
  }
}

// A Box Office Scratch notification (backend/utils/notify.js), in the
// colours of the ticket it was won on (ticketThemes.js, set here as CSS
// variables):
//   scratchWin      a member you follow won a tier: their picture and
//                   name, the tier, the ticket and the prize, on the
//                   ticket's own body: blue for Standard, cinema red for
//                   Premium, sparkly gold outlined in purple for VIP (with
//                   its red star)
//   scratchJackpot  someone hit a ticket type's jackpot, sent to every
//                   member: on dark glass with a rim that glows, slowly
//                   breathing: gold for Standard, red for Premium, and for
//                   VIP a gold rim in a purple aura, on glass tinted purple
// Both have a way into the game. Notifications from before there were
// ticket types were all Standard.
export default function ScratchNotice({ item }) {
  const reduce = useReducedMotion()
  const type = ticketTypeOf(item)
  const theme = ticketTheme(type)
  const typeName = ticketType(type).name

  if (item.type === 'scratchJackpot') {
    const { face, name } = winnerParts(item.actors[0], 'text-white hover:text-brand-gold')
    const { small, big } = theme.jackpotGlow
    // The type's name on the dark glass.
    const typeTag = (
      <span className="font-semibold" style={{ color: theme.tag }}>
        {typeName}
      </span>
    )

    return (
      <motion.article
        style={theme.vars}
        initial={{ boxShadow: small }}
        animate={reduce ? { boxShadow: big } : { boxShadow: [small, big, small] }}
        transition={reduce ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-2xl border-2 border-(--tk-jackpot-edge) bg-(--tk-jackpot-bg) p-5 backdrop-blur-xl sm:p-6"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <GoldenTicketIcon className="w-7" />
          <h2 className="font-['Bebas_Neue'] text-xl tracking-[0.2em] text-brand-gold">
            {typeTag} Jackpot
          </h2>
          <span className="text-xs text-white/40">{timeAgo(item.at)}</span>
        </div>
        <div className="flex items-start gap-4">
          {face}
          <div className="min-w-0 flex-1">
            <p className="text-lg text-white/90">
              {name} found the Golden Ticket and hit the Box Office Scratch {typeTag} jackpot!
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-brand-gold drop-shadow-[0_0_10px_rgba(250,188,63,0.5)]">
              <CoinIcon kind="ppp" size={26} /> {format(item.amount)} P-PP
            </p>
            <Link to="/games/scratch" className={`${BUTTON} mt-4`}>
              Try your luck
            </Link>
          </div>
        </div>
      </motion.article>
    )
  }

  const { face, name } = winnerParts(item.actors[0], 'text-(--tk-value) hover:text-(--tk-link-hover)')
  const tier = tierByKey(item.tier, type)
  const typeTag = <span className="font-semibold text-(--tk-notice-name)">{typeName}</span>

  return (
    <article
      style={theme.vars}
      className={`rounded-2xl border border-(--tk-edge) [background:var(--tk-body)] p-5 shadow-xl shadow-black/30 backdrop-blur-md sm:p-6 ${theme.bodyClass}`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StarIcon className="size-5" colors={theme.star} />
        <h2 className="text-sm font-semibold tracking-widest text-(--tk-title) uppercase">Box Office Scratch</h2>
        <span className="text-xs text-(--tk-notice-faint)">{timeAgo(item.at)}</span>
      </div>
      <div className="flex items-start gap-4">
        {face}
        <div className="min-w-0 flex-1">
          <p className="text-lg text-(--tk-notice-text)">
            {tier?.refund ? (
              <>
                {name} scratched <span className="font-semibold text-(--tk-value)">{tier.name}</span> on a {typeTag} ticket and got
                the ticket price back.
              </>
            ) : (
              <>
                {name} scratched <span className="font-semibold text-(--tk-value)">{tier?.name ?? 'a win'}</span> on a {typeTag}{' '}
                ticket and won{' '}
                <span className="inline-flex items-center gap-1 font-bold text-(--tk-prize)">
                  <CoinIcon kind="ppp" size={15} /> {format(item.amount)} P-PP
                </span>
                .
              </>
            )}
          </p>
          <Link to="/games/scratch" className={`${BUTTON} mt-4`}>
            Play Box Office Scratch
          </Link>
        </div>
      </div>
    </article>
  )
}
