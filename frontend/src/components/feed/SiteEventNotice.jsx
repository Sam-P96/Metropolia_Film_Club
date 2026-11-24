import { Link } from 'react-router-dom'
import { GoldenTicketIcon, StarIcon } from '../scratch/TileFace'
import { BLACK_FRIDAY, DOUBLE_PRIZES } from '../../../../shared/events.js'
import { cosmeticById } from '../../../../shared/cosmetics/catalogue.js'
import { timeAgo } from '../../utils/timeAgo'

// A calendar event starting (backend/utils/siteEvents.js), sent to every
// member: the Black Market's Black Friday Sale, in white, and Box Office
// Scratch's Double Prize Weekend, in a rainbow frame (index.css).

function BlackFridayNotice({ item }) {
  const excluded = BLACK_FRIDAY.excluded
    .map((id) => cosmeticById(id))
    .filter(Boolean)
    .map((cosmetic) => `the ${cosmetic.name} ${cosmetic.type === 'name' ? 'name style' : 'border'}`)

  return (
    <article className="rounded-2xl border border-white bg-white p-5 text-black shadow-[0_0_28px_rgb(255_255_255/0.3)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold tracking-widest uppercase">Black Market</h2>
        <span className="text-xs text-black/50">{timeAgo(item.at)}</span>
      </div>
      <p className="mt-2 font-['Bebas_Neue'] text-4xl leading-none tracking-wide">
        Black Friday <span className="rounded bg-black px-1.5 text-white">Sale</span>
      </p>
      <p className="mt-2 text-black/80">
        <strong className="text-black">{Math.round(BLACK_FRIDAY.discount * 100)}% off</strong> every name style and border
        {excluded.length ? `, except ${excluded.join(' and ')},` : ''} all weekend, until Sunday at midnight.
      </p>
      <Link
        to="/games/loan-shark/black-market"
        className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-black px-4 font-bold text-white transition hover:bg-black/80"
      >
        Go shopping
      </Link>
    </article>
  )
}

function DoublePrizesNotice({ item }) {
  return (
    <article className="rainbow-frame rounded-2xl p-[2px]">
      <div className="rounded-[calc(1rem-2px)] bg-ink/95 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1" aria-hidden="true">
            <StarIcon className="size-5" />
            <GoldenTicketIcon className="w-6" />
          </span>
          <h2 className="text-sm font-semibold tracking-widest text-white/80 uppercase">Box Office Scratch</h2>
          <span className="text-xs text-white/50">{timeAgo(item.at)}</span>
        </div>
        <p className="rainbow-text mt-2 font-['Bebas_Neue'] text-4xl leading-none tracking-wide">Double Prize Weekend</p>
        <p className="mt-2 text-white/80">
          Every prize is <strong className="text-white">doubled</strong> on cards bought this weekend, from Friday 16:00 until Sunday at midnight. The
          jackpots stay as they are. {DOUBLE_PRIZES.cardsPerDay} cards of each ticket a day.
        </p>
        <Link
          to="/games/scratch"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110"
        >
          Scratch a card
        </Link>
      </div>
    </article>
  )
}

export default function SiteEventNotice({ item }) {
  return item.type === 'blackFriday' ? <BlackFridayNotice item={item} /> : <DoublePrizesNotice item={item} />
}
