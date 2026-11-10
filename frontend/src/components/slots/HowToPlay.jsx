import Paytable, { Paylines } from './Paytable'
import { SLOTS } from '../../../../shared/slots/config.js'

const GLASS = 'rounded-2xl border border-white/10 bg-black/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md'

// How to play: the controls, the eleven paylines, the Infinity Gauntlet and
// the full paytable.
export default function HowToPlay() {
  return (
    <div className="flex flex-col gap-4 text-sm text-white/80">
      <section className={GLASS}>
        <h2 className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">The controls</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>
            <span className="font-semibold text-white">Add credits</span> moves points from your wallet into the machine, your PP first, then
            P-PP.
          </li>
          <li>
            <span className="font-semibold text-white">− and +</span> set your bet, {SLOTS.minBet} PP at a time. Hold them down to change it
            quickly. The bet covers all {SLOTS.paylines.length} lines.
          </li>
          <li>
            <span className="font-semibold text-white">MAX</span> goes all in: it bets everything in the machine and pulls the lever for you.
          </li>
          <li>
            <span className="font-semibold text-white">The lever</span> spins the reels: click it, or on a phone pull it all the way down and let
            go.
          </li>
          <li>
            <span className="font-semibold text-white">Cash out</span> sends your credits back to your wallet: PP as PP, and your winnings as
            P-PP, in whole points. P-PP you can cash out each day is capped at {SLOTS.cashOutCapMultiple} times what the richest member held at
            12:00, on top of whatever P-PP you put in that day. The cap resets at 12:00.
          </li>
          <li>
            <span className="font-semibold text-white">Walk away</span> for {SLOTS.idleCashOutMinutes} minutes (no adding credits, spinning or
            cashing out) and the machine cashes out for you, up to the cap. Anything it can&apos;t cash out, P-PP over the cap included, is gone.
          </li>
          <li>Until then, your credits stay in the machine between visits, on any device.</li>
        </ul>
      </section>

      <section className={GLASS}>
        <h2 className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">The {SLOTS.paylines.length} lines</h2>
        <p className="mt-1 mb-3">
          A line pays when it starts on the leftmost reel with 3, 4 or 5 of the same symbol in a row. Every line is paid on its own, and wins on
          several lines add up.
        </p>
        <Paylines />
      </section>

      <section className={GLASS}>
        <h2 className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">The Infinity Gauntlet</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>
            The Gauntlet links <span className="font-semibold text-white">Maps</span> and <span className="font-semibold text-white">Rings</span>.
            A line that starts with 3 or more of them in a row, with at least one Gauntlet among them, pays as that many Maps or Rings: Maps and
            Gauntlets pay as Maps, Rings and Gauntlets as Rings.
          </li>
          <li>
            A line with Maps <em>and</em> Rings pays as one or the other. When it pays as Rings, that&apos;s a{' '}
            <span className="font-semibold text-white">CRITICAL HIT!</span>
          </li>
          <li>
            3 or more Gauntlets on their own are <span className="font-semibold text-white">INFINITY</span>, and pay the Gauntlet&apos;s own prize.
          </li>
          <li>The Gauntlet never links the Kino Kaveri logo or any other symbol. If a line can be read more than one way, it pays the best.</li>
        </ul>
      </section>

      <section className={GLASS}>
        <h2 className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">Paytable</h2>
        <p className="mt-1 mb-2">What a line pays, times your bet. Winnings come as P-PP.</p>
        <Paytable />
        <p className="mt-3 text-xs text-white/50">
          5 Kino Kaveri logos on any line is the jackpot: {SLOTS.jackpotMultiplier.toLocaleString('en-US')} times your bet, and everyone on the
          site hears about it. Points can&apos;t be bought or cashed out of the site.
        </p>
      </section>
    </div>
  )
}
