import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import MemberAvatar from '../profile/MemberAvatar'
import useApi from '../../hooks/useApi'
import { getStealFeed } from '../../services/steal'
import { timeAgo } from '../../utils/timeAgo'
import { EASE, FADE, LAYOUT, SLIDE } from './motion'
import { GLASS, formatPp } from './style'

// Every successful steal, newest first, for everyone to see (spec §8.3).
// Failures stay between the two players. Loaded once; the hub's `version`
// going up loads it again without clearing it, and new steals slide in at
// the top.
export default function PublicFeed({ version = 0 }) {
  const { data, error, reload } = useApi(getStealFeed, [])
  useEffect(() => {
    if (version) reload()
  }, [version, reload])
  const steals = data?.steals ?? []

  return (
    <section className={`${GLASS} p-5`} aria-labelledby="steal-feed">
      <h2 id="steal-feed" className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">
        Recent steals
      </h2>
      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p key="error" {...FADE} className="mt-2 text-sm text-white/50">
            Couldn&apos;t load the feed.
          </motion.p>
        ) : !data ? (
          <motion.div key="loading" {...FADE} className="mt-3 flex flex-col gap-3" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/10 motion-reduce:animate-none" />
            ))}
          </motion.div>
        ) : steals.length === 0 ? (
          <motion.p key="none" {...FADE} className="mt-2 text-sm text-white/50">
            Nobody has stolen anything yet.
          </motion.p>
        ) : (
          <motion.ul key="list" {...FADE} className="mt-3 flex flex-col gap-3">
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
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  )
}
