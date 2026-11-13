import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import StealPage, { PvpRequired, StealTitle } from '../components/steal/StealPage'
import Reveal, { Placeholder } from '../components/steal/Reveal'
import { FADE, LAYOUT, SLIDE } from '../components/steal/motion'
import Loadout from '../components/steal/Loadout'
import TargetList from '../components/steal/TargetList'
import StealActivity from '../components/steal/StealActivity'
import ClassPicker from '../components/steal/ClassPicker'
import MemberAvatar from '../components/profile/MemberAvatar'
import CoinIcon from '../components/wallet/CoinIcon'
import AnimatedNumber from '../components/AnimatedNumber'
import useApi from '../hooks/useApi'
import useCountdown from '../hooks/useCountdown'
import useStealSocket from '../hooks/useStealSocket'
import { getStealHub, setStealClass } from '../services/steal'
import { STEAL } from '../../../shared/steal/config.js'
import { GLASS, GOLD_BUTTON, QUIET_BUTTON, formatPp, formatSpan } from '../components/steal/style'

const HEADING = "font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold"
const OUTCOMES = { success: 'Stole', fail: 'Failed', fizzle: 'Fizzled', neuralyzed: 'Neuralyzed' }

function Countdown({ to, label }) {
  const left = useCountdown(to)
  return (
    <p className="text-xs text-white/50">
      {label} {left === null ? '…' : formatSpan(left)}
    </p>
  )
}

// Their class, and changing it once a week.
function ClassCard({ player, onChanged }) {
  const [changing, setChanging] = useState(false)
  const [problem, setProblem] = useState(null)
  const label = STEAL.classes[player.playerClass]

  const change = async (key) => {
    setProblem(null)
    try {
      await setStealClass(key)
      setChanging(false)
      onChanged()
    } catch (failure) {
      setProblem(failure.message)
    }
  }

  return (
    <section className={`${GLASS} p-5`}>
      <h2 className={HEADING}>Class</h2>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={player.playerClass} {...FADE}>
          <p className="mt-1 text-lg font-bold text-white">{label?.label ?? 'None yet'}</p>
          {label && <p className="text-sm text-white/60">{label.summary}</p>}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        {player.canChangeClass ? (
          changing ? (
            <motion.div key="picking" {...SLIDE} className="mt-3">
              <ClassPicker value={player.playerClass} onChange={change} />
              <button type="button" onClick={() => setChanging(false)} className="mt-2 text-xs text-white/60 hover:text-white">
                Keep {label?.label}
              </button>
            </motion.div>
          ) : (
            <motion.div key="change" {...FADE}>
              <button type="button" onClick={() => setChanging(true)} className={`${QUIET_BUTTON} mt-3 min-h-9 text-sm`}>
                Change class (once a week)
              </button>
            </motion.div>
          )
        ) : (
          player.classChangesAt && (
            <motion.div key="locked" {...FADE}>
              <Countdown to={player.classChangesAt} label="Change again in" />
            </motion.div>
          )
        )}
      </AnimatePresence>
      {problem && <motion.p {...FADE} className="mt-2 text-sm text-brand-red">{problem}</motion.p>}
    </section>
  )
}

// Today's and this week's attacks (spec §15, attack status).
function AttackStatus({ attack }) {
  return (
    <section className={`${GLASS} p-5`}>
      <h2 className={HEADING}>Your attacks</h2>
      <p className="mt-1 text-sm text-white">
        Today: {attack.attacksToday}/{attack.perDay} used
      </p>
      <Countdown to={attack.nextDailyAt} label="New day in" />
      <p className="mt-3 text-sm text-white">This week</p>
      {attack.thisWeek.length === 0 && <p className="text-xs text-white/50">Nobody yet.</p>}
      <ul className="mt-1 flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {attack.thisWeek.map((row) => (
            <motion.li key={row._id} {...SLIDE} {...LAYOUT} className="flex items-center gap-2 text-sm">
              <MemberAvatar user={row.victim} size="sm" />
              <Link to={`/games/steal-and-defend/attacks/${row._id}`} className="flex-1 truncate text-white/80 hover:text-white">
                {row.victim.username}
              </Link>
              <span className="text-xs text-white/50">{row.playing ? 'Playing' : OUTCOMES[row.outcome]}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <Countdown to={attack.nextWeeklyAt} label="New week in" />
    </section>
  )
}

// While the hub loads: boxes roughly where everything will go.
function HubPlaceholder() {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-5">
        <Placeholder className="h-64" />
        <Placeholder className="h-80" />
      </div>
      <div className="flex flex-col gap-5">
        <Placeholder className="h-32" />
        <Placeholder className="h-44" />
        <Placeholder className="h-56" />
      </div>
    </div>
  )
}

// A warning or notice above the hub, sliding in and out as it comes and goes.
function Banner({ children, className }) {
  return (
    <motion.div {...SLIDE} {...LAYOUT} className={className}>
      {children}
    </motion.div>
  )
}

// Steal and Defend's hub (spec §15): class, the 3 slots, inventory, targets,
// the public feed and their attack status. Updates the moment someone
// attacks them, so they can swap items in time. Once loaded, it builds up
// section by section; after that, changes never reload it: what's showing
// stays until the fresh copy arrives, and what changed slides in or out.
export default function StealHub() {
  const hub = useApi(getStealHub, [])
  const [version, setVersion] = useState(0)
  const { reload } = hub
  const refresh = useCallback(() => {
    reload()
    setVersion((v) => v + 1)
  }, [reload])
  const data = hub.data
  useStealSocket(() => refresh(), Boolean(data?.player.enabled))

  // While someone's attacking them, check every few seconds too, in case
  // the live connection isn't there.
  const underAttack = (data?.incoming?.length ?? 0) > 0
  useEffect(() => {
    if (!underAttack) return
    const timer = setInterval(refresh, 5000)
    return () => clearInterval(timer)
  }, [underAttack, refresh])

  const actions = (
    <>
      <Link to="/games/steal-and-defend" className={`${QUIET_BUTTON} min-h-9 text-sm`}>
        How to play
      </Link>
      {data?.isAdmin && (
        <Link to="/games/steal-and-defend/admin" className={`${QUIET_BUTTON} min-h-9 text-sm`}>
          Admin
        </Link>
      )}
    </>
  )

  return (
    <StealPage back={{ to: '/games', label: 'Games' }} title={<StealTitle />} actions={actions}>
      <AnimatePresence mode="wait" initial={false}>
        {!data ? (
          <motion.div key="loading" {...FADE}>
            {hub.error ? <p className={`${GLASS} p-6 text-white/70`}>Couldn&apos;t load Steal and Defend. Try refreshing the page.</p> : <HubPlaceholder />}
          </motion.div>
        ) : !data.player.enabled ? (
          <motion.div key="off" {...FADE} className="flex flex-col gap-5">
            <Reveal order={0}>
              <PvpRequired />
            </Reveal>
            {data.inventory.length > 0 && (
              <Reveal order={1}>
                <Loadout hub={data} onChanged={refresh} />
              </Reveal>
            )}
            <Reveal order={2}>
              <StealActivity version={version} />
            </Reveal>
          </motion.div>
        ) : (
          <motion.div key="on" {...FADE} className="flex flex-col gap-5">
            <Reveal order={0}>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-lg font-bold text-white" aria-label="Your points">
                <span className="flex items-center gap-1.5">
                  <CoinIcon kind="pp" size={18} /> <AnimatedNumber value={data.wallet.pp} />
                </span>
                <span className="flex items-center gap-1.5">
                  <CoinIcon kind="ppp" size={18} /> <AnimatedNumber value={data.wallet.ppp} />
                </span>
                <span className="text-sm font-normal text-white/50">Net worth {formatPp(data.wallet.net)}</span>
              </p>
            </Reveal>

            <AnimatePresence initial={false}>
              {data.incoming.map((attack) => (
                <Banner key={attack._id} className="rounded-2xl border-2 border-brand-red bg-brand-red/15 p-4 text-white">
                  <div role="alert">
                    <p className="font-bold">{attack.attacker?.username ?? 'Someone'} is attacking you right now!</p>
                    <p className="text-sm text-white/70">Swap your equipped items below before they finish the quiz: your defense items are read the moment it ends.</p>
                  </div>
                </Banner>
              ))}
              {data.wallet.frozenUntil && (
                <Banner key="frozen" className="text-sm text-white/60">
                  Your points are frozen until the attack you&apos;re in is over.
                </Banner>
              )}
              {data.wallet.net < 0 && (
                <Banner key="debt" className="rounded-xl border border-brand-red/50 bg-black/40 p-3 text-sm text-white/80">
                  Your balance is negative. You can&apos;t attack, buy items or be attacked until the daily payout brings you back up.
                </Banner>
              )}
              {data.bans.map((ban, i) => (
                <Banner key={`ban-${i}`} className="rounded-xl border border-brand-red/50 bg-black/40 p-3 text-sm text-white/80">
                  Banned from {ban.scopes.map((scope) => STEAL.banScopes[scope]).join(', ').toLowerCase()}
                  {ban.until ? ` until ${new Date(ban.until).toLocaleDateString()}` : ''}. Reason: {ban.reason}
                </Banner>
              ))}
              {data.tradesWaiting > 0 && (
                <Banner key="trades" className="self-start">
                  <Link to="/games/steal-and-defend/market" className={GOLD_BUTTON}>
                    {data.tradesWaiting} trade offer{data.tradesWaiting === 1 ? '' : 's'} waiting
                  </Link>
                </Banner>
              )}
            </AnimatePresence>

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="flex min-w-0 flex-col gap-5">
                <Reveal order={1}>
                  <TargetList version={version} />
                </Reveal>
                <Reveal order={2}>
                  <Loadout hub={data} onChanged={refresh} />
                </Reveal>
              </div>
              <div className="flex flex-col gap-5">
                <Reveal order={2}>
                  <ClassCard player={data.player} onChanged={refresh} />
                </Reveal>
                <Reveal order={3}>
                  <AttackStatus attack={data.attack} />
                </Reveal>
                <Reveal order={4}>
                  <StealActivity version={version} />
                </Reveal>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StealPage>
  )
}
