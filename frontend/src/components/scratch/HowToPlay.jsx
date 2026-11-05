import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import AnimatedNumber from '../AnimatedNumber'
import CoinIcon from '../wallet/CoinIcon'
import { Skeleton } from './Marquee'
import { ticketTheme } from './ticketThemes'
import { SCRATCH } from '../../../../shared/scratch/config.js'
import { TICKET_TYPES, describeHours, ticketTiers, ticketType } from '../../../../shared/scratch/tickets.js'

const GLASS = 'rounded-2xl border border-white/10 bg-black/40 shadow-xl shadow-black/40 backdrop-blur-md'

// 1 -> "1st", 3 -> "3rd", 4 -> "4th", for whatever starsToWin is set to.
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`
const NEEDED = ordinal(SCRATCH.starsToWin)

// "a, b and c", or with `last` = 'or', "a, b or c".
const list = (items, last = 'and') => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${last} ${items.at(-1)}`)

// Every ticket type, cheapest first, with what each tier pays on it.
const TYPES = TICKET_TYPES.map((key) => ({ ...ticketType(key), tiers: ticketTiers(key) }))
const TIMED = TYPES.filter((type) => type.hours)

// The jackpot prizes: bold gold that glows, breathing slowly. With reduced
// motion they hold the glow still instead.
const GLOW = {
  textShadow: ['0 0 6px rgba(250,188,63,0.45)', '0 0 16px rgba(250,188,63,0.9)', '0 0 6px rgba(250,188,63,0.45)'],
}

// The column of the ticket type being looked at or played: a soft light
// that moves between columns rather than jumping.
const column = (key, viewType) => `transition-colors duration-300 ${key === viewType ? 'bg-white/6' : 'bg-transparent'}`

// "How to play": the rules, and what every tier pays on each ticket type,
// side by side. Opens and closes smoothly. `jackpots` are the pools right
// now ({ standard, premium, vip }, null while they load), so the Golden
// Ticket's row shows the real amounts; `viewType` is the ticket the page is
// showing, whose column is lit; `hours` says whether timed tickets (VIP)
// are on sale (useTicketHours, null while it loads).
export default function HowToPlay({ jackpots = null, viewType, hours = null }) {
  const [open, setOpen] = useState(false)
  const calm = useReducedMotion()

  return (
    <section className={GLASS}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">How to play</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="text-white/60" aria-hidden="true">
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="rules"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 px-5 pb-5 text-sm text-white/80">
              <ol className="flex list-decimal flex-col gap-1 pl-5">
                <li>
                  Pick a ticket: {list(TYPES.map((type) => `${type.name} (${type.price} points)`), 'or')}. Your PP go first, then P-PP for
                  the rest.
                </li>
                <li>
                  Every card has {SCRATCH.rows * SCRATCH.cols} tiles, {SCRATCH.stars} of them stars, and you get {SCRATCH.scratches} scratches.
                </li>
                <li>
                  Find {SCRATCH.starsToWin} stars to win. The sooner your {NEEDED} star turns up, the bigger the win, and it&apos;s paid the
                  moment it does. The pricier the ticket, the more it pays.
                </li>
                <li>
                  Then keep scratching: the scratches left are a hunt for the Golden Ticket, which wins the whole jackpot of your
                  ticket&apos;s type.
                </li>
                <li>Collect ends the card early, leaving your scratches left unused.</li>
                {TIMED.map((type) => {
                  const now = hours?.[type.key]
                  return (
                    <li key={type.key}>
                      <span style={{ color: ticketTheme(type.key).tag }}>{type.name}</span> tickets are on sale {describeHours(type.hours)}.
                      {now && (
                        <span className={`ml-1.5 font-semibold ${now.open ? 'text-emerald-300' : 'text-white/60'}`}>
                          {now.open ? 'On sale now.' : `Opens at ${type.hours.opens}.`}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ol>

              {/* What each tier pays on each ticket, the prizes big enough
                  to be the point of the table. Narrow enough for a phone:
                  each tier's name and scratch share the first column. */}
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs text-white/50">
                  <CoinIcon kind="ppp" size={14} /> Prizes in P-PP
                </p>
                <table className="w-full table-fixed text-left tabular-nums">
                  <colgroup>
                    <col />
                    {TYPES.map((type) => (
                      <col key={type.key} className="w-15" />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col" className="py-1 pr-1 align-bottom text-xs font-medium tracking-wider text-white/50 uppercase">
                        {NEEDED} star on
                      </th>
                      {TYPES.map((type) => (
                        <th
                          key={type.key}
                          scope="col"
                          className={`rounded-t-lg px-1 py-1 text-right align-bottom ${column(type.key, viewType)}`}
                          style={{ color: ticketTheme(type.key).tag }}
                        >
                          <span className="block text-xs font-bold">{type.name}</span>
                          <span className="block text-[0.65rem] font-medium text-white/50">{type.price} pts</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {SCRATCH.tiers.map((tier, row) => (
                      <tr key={tier.key}>
                        <th scope="row" className="py-2 pr-1 font-normal">
                          <span className="block leading-tight text-white">{tier.name}</span>
                          <span className="block text-xs text-white/50">Scratch {tier.scratch}</span>
                        </th>
                        {TYPES.map((type) => {
                          const prize = type.tiers[row]
                          return (
                            <td key={type.key} className={`px-1 py-2 text-right ${column(type.key, viewType)}`}>
                              {prize.refund ? (
                                <span className="text-xs font-semibold text-white">{type.price} back</span>
                              ) : (
                                <span className="text-base font-bold text-brand-gold">{prize.ppp}</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    <tr>
                      <th scope="row" className="py-2 pr-1 font-normal">
                        <span className="block leading-tight text-white/50">{SCRATCH.loss.name}</span>
                        <span className="block text-xs text-white/40">No {NEEDED} star</span>
                      </th>
                      {TYPES.map((type) => (
                        <td key={type.key} className={`px-1 py-2 text-right text-white/50 ${column(type.key, viewType)}`}>
                          Nothing
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row" className="py-2 pr-1 font-normal">
                        <span className="block leading-tight text-brand-gold">Golden Ticket</span>
                        <span className="block text-xs text-brand-gold/70">Any scratch</span>
                      </th>
                      {TYPES.map((type) => (
                        <td key={type.key} className={`rounded-b-lg px-1 py-2 text-right ${column(type.key, viewType)}`}>
                          {jackpots === null ? (
                            <Skeleton className="ml-auto h-5 w-10" />
                          ) : (
                            <motion.span
                              animate={calm ? undefined : GLOW}
                              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                              style={{ textShadow: '0 0 12px rgba(250,188,63,0.75)' }}
                              className="inline-flex flex-col items-end text-base leading-tight font-black text-brand-gold sm:text-lg"
                            >
                              <AnimatedNumber value={jackpots[type.key]} />
                              <span className="text-[0.6rem] font-bold tracking-wider uppercase">Jackpot</span>
                            </motion.span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-white/50">
                Each ticket type has its own jackpot, which starts at{' '}
                {list(TYPES.map((type, i) => `${type.jackpotSeed}${i === 0 ? ' P-PP' : ''} for ${type.name} (+${type.jackpotContribution} a ticket)`))}.
                One card in {SCRATCH.goldenTicketOneIn} hides a Golden Ticket, whatever the ticket. Every card is sealed when you buy it, and
                Reveal card lets you check the seal. Points can&apos;t be bought or cashed out.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
