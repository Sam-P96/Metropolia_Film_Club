import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import PillToggle from '../PillToggle'
import MemberAvatar from '../profile/MemberAvatar'
import useApi from '../../hooks/useApi'
import { getStealFeed, getStealHistory } from '../../services/steal'
import { timeAgo } from '../../utils/timeAgo'
import { EASE, FADE, LAYOUT, SLIDE } from './motion'
import { GLASS, formatPp } from './style'

const OUTCOMES = { success: 'Stole', fail: 'Failed', fizzle: 'Fizzled', neuralyzed: 'Neuralyzed' }
const TABS = [
  { value: 'steals', label: 'Recent Steals' },
  { value: 'history', label: 'Your History' },
]

function Loading() {
  return (
    <motion.div key="loading" {...FADE} className="flex flex-col gap-3" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-white/10 motion-reduce:animate-none" />
      ))}
    </motion.div>
  )
}

// Every successful steal, newest first, for everyone to see (spec §8.3).
// Failures stay between the two players. New ones slide in at the top.
function RecentSteals({ feed }) {
  const steals = feed.data?.steals ?? []
  if (feed.error) return <p className="text-sm text-white/50">Couldn&apos;t load the feed.</p>
  if (!feed.data) return <Loading />
  if (steals.length === 0) return <p className="text-sm text-white/50">Nobody has stolen anything yet.</p>

  return (
    <ul className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {steals.map((steal, index) => (
          <motion.li
            key={steal._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE, delay: Math.min(index, 8) * 0.04 } }}
            exit={SLIDE.exit}
            {...LAYOUT}
          >
            <div className={`flex items-start gap-3 ${steal.takenBack ? 'opacity-50' : ''}`}>
              <MemberAvatar user={steal.attacker} size="sm" />
              <div className="min-w-0 flex-1 text-sm text-white/80">
                <Link to={`/users/${steal.attacker._id}`} className="font-semibold text-white hover:text-brand-gold">
                  {steal.attacker.username}
                </Link>{' '}
                stole {formatPp(steal.stolen)} from{' '}
                <Link to={`/users/${steal.victim._id}`} className="font-semibold text-white hover:text-brand-gold">
                  {steal.victim.username}
                </Link>
                {steal.crit && <span className="ml-1 font-bold text-brand-gold">· Critical Hit!</span>}
                {steal.stone && <span className="ml-1 text-white/50">· with the {steal.stone === 'power' ? 'Power' : 'Soul'} Stone</span>}
                <p className="text-xs text-white/40">
                  {timeAgo(steal.at)}
                  {steal.takenBack ? ' · taken back' : ''}
                </p>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

// Every attack they've been in, either side, newest first: who, how it
// went, and what it won or cost them.
function YourHistory({ history }) {
  const rows = history.data?.attacks ?? []
  if (history.error) return <p className="text-sm text-white/50">Couldn&apos;t load your history.</p>
  if (!history.data) return <Loading />
  if (rows.length === 0) return <p className="text-sm text-white/50">No attacks yet, by you or on you.</p>

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {rows.map((row) => {
          const gained = row.role === 'attacker' ? row.amounts?.attackerGot : row.amounts?.defenderGot
          const lost = row.role === 'attacker' ? row.amounts?.paid : row.amounts?.victimLost
          return (
            <motion.li key={row._id} {...SLIDE}>
              <Link to={`/games/steal-and-defend/attacks/${row._id}`} className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-white/5">
                {row.other && <MemberAvatar user={row.other} size="sm" />}
                <span className="min-w-0 flex-1 truncate text-white/80">
                  {row.role === 'attacker' ? 'You attacked' : 'Attacked by'} {row.other?.username ?? 'someone who left'}
                </span>
                <span className="text-xs text-white/50">
                  {row.status === 'playing' ? 'Playing' : OUTCOMES[row.outcome]}
                  {row.crit ? ' · Crit' : ''}
                  {gained ? ` · +${formatPp(gained)}` : ''}
                  {lost ? ` · −${formatPp(lost)}` : ''}
                </span>
                <span className="hidden text-xs text-white/30 sm:inline">{timeAgo(row.startedAt)}</span>
              </Link>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

// Recent Steals and Your History in one box, with a toggle between them
// (Recent Steals first). Both load once, and again when the hub's
// `version` goes up, without clearing, so switching is instant.
export default function StealActivity({ version = 0 }) {
  const [tab, setTab] = useState('steals')
  const feed = useApi(getStealFeed, [])
  const history = useApi(getStealHistory, [])
  const { reload: reloadFeed } = feed
  const { reload: reloadHistory } = history

  useEffect(() => {
    if (!version) return
    reloadFeed()
    reloadHistory()
  }, [version, reloadFeed, reloadHistory])

  return (
    // No layout animation on the glass box: moving a backdrop-blurred box
    // makes the blur flicker.
    <section className={`${GLASS} flex flex-col gap-4 p-5`} aria-labelledby="steal-activity">
      <h2 id="steal-activity" className="sr-only">
        {tab === 'steals' ? 'Recent steals' : 'Your history'}
      </h2>
      <div className="self-start">
        <PillToggle options={TABS} value={tab} onChange={setTab} label="Show" />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} {...FADE}>
          {tab === 'steals' ? <RecentSteals feed={feed} /> : <YourHistory history={history} />}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
