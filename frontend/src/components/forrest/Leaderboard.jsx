import MemberAvatar from '../profile/MemberAvatar'
import { CARD, HEADING } from './ForrestChrome'

// The site's best runs, best first, on the start page.
export default function Leaderboard({ entries }) {
  return (
    <section aria-labelledby="forrest-best" className={`${CARD} flex flex-col gap-3`}>
      <h2 id="forrest-best" className={HEADING}>
        Best runs
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-white/60">Nobody&apos;s bounced yet. The first run sets the record.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li key={entry.user._id} className="flex items-center gap-3">
              <span className={`w-5 text-right font-bold tabular-nums ${index === 0 ? 'text-brand-gold' : 'text-white/50'}`}>{index + 1}</span>
              <MemberAvatar user={entry.user} size="sm" />
              <span className="min-w-0 flex-1 truncate text-white">{entry.user.username}</span>
              <span className="font-semibold text-[#b8e986] tabular-nums">{entry.fruit} fruit</span>
              <span className="w-12 text-right text-xs text-white/50">Lv {entry.level}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-white/50">Best runs count fruit before the entry&apos;s multiplier, so every entry counts the same.</p>
    </section>
  )
}
