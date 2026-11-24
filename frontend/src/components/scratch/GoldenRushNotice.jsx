import { Link } from 'react-router-dom'
import { GoldenTicketIcon } from './TileFace'
import { timeAgo } from '../../utils/timeAgo'

// Times on Helsinki's clock, like the rest of the site's hours.
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const at = (date) => (date ? clock.format(new Date(date)) : '--:--')

// Box Office Scratch's Golden Rush, told to this member alone
// (backend/utils/scratch.js goldenRushNotice): when it runs, glowing gold,
// with a way to the game while it's on. The server pins it to the top of
// Notifications until it's over.
export default function GoldenRushNotice({ item }) {
  const { from, to } = item.rush ?? {}
  const on = Boolean(to) && new Date(to) > new Date()

  return (
    <article className="rounded-2xl border-2 border-brand-gold bg-linear-to-br from-[#3a2a05]/95 via-ink/95 to-[#3a2a05]/90 p-5 shadow-[0_0_32px_rgba(250,188,63,0.45)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <GoldenTicketIcon className="w-7" />
        <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">Box Office Scratch</h2>
        <span className="text-xs text-white/50">{timeAgo(item.at)}</span>
        <span
          className={`ml-auto rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            on ? 'border-brand-gold/60 bg-brand-gold/15 text-brand-gold' : 'border-white/15 bg-white/5 text-white/55'
          }`}
        >
          {on ? 'On now' : 'Over'}
        </span>
      </div>
      <p className="mt-2 font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-brand-gold drop-shadow-[0_0_10px_rgba(250,188,63,0.45)]">
        Golden Rush
      </p>
      <p className="mt-2 text-white/85">
        Golden Rush has started, from <strong className="text-white tabular-nums">{at(from)}</strong> to{' '}
        <strong className="text-white tabular-nums">{at(to)}</strong>. 1/50 scratch cards has a golden ticket! You are the only person who is notified
        of this.
      </p>
      {on && (
        <Link
          to="/games/scratch"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110"
        >
          Scratch a card
        </Link>
      )}
    </article>
  )
}
