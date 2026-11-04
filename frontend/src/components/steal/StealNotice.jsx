import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import MemberAvatar from '../profile/MemberAvatar'
import { timeAgo } from '../../utils/timeAgo'
import StealLogo from './StealLogo'
import LoanSharkMessage from './KingLoanShark'
import { LIFT, formatPp } from './style'

const GLOW_SMALL = '0 0 14px 1px rgba(250,188,63,0.45)'
const GLOW_BIG = '0 0 30px 4px rgba(250,188,63,0.75)'
const BUTTON = `inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 font-bold text-ink ${LIFT} hover:brightness-110 hover:shadow-[0_6px_24px_rgba(250,188,63,0.4)]`

const name = (user) => (
  <Link to={`/users/${user._id}`} className="font-semibold text-white hover:text-brand-gold">
    {user.username}
  </Link>
)

// A Critical Hit, sent to every member: black glass in a glowing gold
// border, like Kino Kasino's jackpots.
function CritNotice({ item }) {
  const reduce = useReducedMotion()
  const [attacker, victim] = item.actors
  return (
    <motion.article
      initial={{ boxShadow: GLOW_SMALL }}
      animate={reduce ? { boxShadow: GLOW_BIG } : { boxShadow: [GLOW_SMALL, GLOW_BIG, GLOW_SMALL] }}
      transition={reduce ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      className="rounded-2xl border-2 border-brand-gold bg-black/75 p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StealLogo size="sm" />
        <h2 className="font-['Bebas_Neue'] text-xl tracking-[0.2em] text-brand-gold">Critical Hit</h2>
        <span className="text-xs text-white/40">{timeAgo(item.at)}</span>
      </div>
      <div className="flex items-start gap-4">
        <Link to={`/users/${attacker._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
          <MemberAvatar user={attacker} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">
            {name(attacker)} landed a Critical Hit{victim ? <> on {name(victim)}</> : null} in Steal and Defend!
          </p>
          <p className="mt-1 font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-brand-gold drop-shadow-[0_0_10px_rgba(250,188,63,0.5)]">
            +{formatPp(item.amount ?? 0)}
          </p>
          <LoanSharkMessage className="mt-3" />
          <Link to="/games/steal-and-defend" className={`${BUTTON} mt-4`}>
            Play Steal and Defend
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

function Card({ tone = 'border-white/10', children, at }) {
  return (
    <article className={`rounded-2xl border-2 ${tone} bg-black/60 p-4 backdrop-blur-xl sm:p-5`}>
      <div className="mb-2 flex items-center gap-2">
        <StealLogo size="sm" />
        <span className="font-['Bebas_Neue'] text-lg tracking-widest text-brand-gold">Steal and Defend</span>
        <span className="ml-auto text-xs text-white/40">{timeAgo(at)}</span>
      </div>
      {children}
    </article>
  )
}

function resultLine(item) {
  const { attack } = item
  const [attacker, victim] = item.actors
  const amounts = attack.amounts ?? {}
  const you = attack.role
  if (attack.playing) return <>{name(attacker)}&apos;s attack is still being played.</>
  if (attack.outcome === 'success') {
    return you === 'attacker' ? (
      <>
        You stole {formatPp(amounts.attackerGot)} from {victim ? name(victim) : 'them'}
        {attack.crit ? ' with a Critical Hit!' : '!'}
      </>
    ) : (
      <>
        {name(attacker)} stole from you: you lost {formatPp(amounts.victimLost)}
        {amounts.wilson ? `, and Wilson got you back ${formatPp(amounts.wilson)}` : ''}.
      </>
    )
  }
  if (attack.outcome === 'fail') {
    return you === 'attacker' ? (
      <>
        Your attack on {victim ? name(victim) : 'them'} failed. You paid {formatPp(amounts.paid)}
        {amounts.debt ? ` and owe ${formatPp(amounts.debt)}` : ''}.
      </>
    ) : (
      <>
        You fought off {name(attacker)}&apos;s attack and got {formatPp(amounts.defenderGot)} from their fine.
      </>
    )
  }
  if (attack.outcome === 'fizzle') {
    return you === 'attacker' ? <>Your attack on {victim ? name(victim) : 'them'} fizzled. No fine.</> : <>Your Invisibility Cloak made {name(attacker)}&apos;s attack fizzle.</>
  }
  return you === 'attacker' ? <>Your attack on {victim ? name(victim) : 'them'} was Neuralyzed. Nothing stolen, no fine.</> : <>Your Neuralyzer wiped {name(attacker)}&apos;s attack.</>
}

// Steal and Defend's notifications (backend/utils/notify.js):
//   stealAttacked  someone has started an attack on you: go and defend
//   stealResult    how an attack you were in ended
//   stealCrit      somebody's Critical Hit, to everyone, in gold
//   stealFlag      for admins: something to look at
export default function StealNotice({ item }) {
  if (item.type === 'stealCrit') return <CritNotice item={item} />

  if (item.type === 'stealAttacked') {
    const [attacker] = item.actors
    return (
      <Card tone="border-brand-red" at={item.at}>
        <p className="text-white/90">
          {name(attacker)} {item.attack.playing ? 'is attacking you!' : 'attacked you.'}
        </p>
        {item.attack.playing && (
          <>
            <p className="mt-1 text-sm text-white/60">You can still swap your items until they finish the quiz.</p>
            <Link to="/games/steal-and-defend/play" className={`${BUTTON} mt-3`}>
              Defend
            </Link>
          </>
        )}
      </Card>
    )
  }

  if (item.type === 'stealFlag') {
    return (
      <Card tone="border-brand-red/60" at={item.at}>
        <p className="text-white/90">Flagged for admins: {item.flag.details}</p>
        <p className="mt-1 text-sm text-white/60">{item.actors.map((user) => user.username).join(' and ')}</p>
        <Link to="/games/steal-and-defend/admin" className={`${BUTTON} mt-3`}>
          Look into it
        </Link>
      </Card>
    )
  }

  return (
    <Card tone={item.attack.crit ? 'border-brand-gold' : 'border-white/10'} at={item.at}>
      <p className="text-white/90">{resultLine(item)}</p>
      <Link to={`/games/steal-and-defend/attacks/${item.attack._id}`} className="mt-2 inline-block text-sm text-brand-gold hover:text-white">
        See what happened →
      </Link>
    </Card>
  )
}
