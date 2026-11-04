import { POKER } from '../../../../shared/poker/config.js'
import { GLASS } from './style'

const SECTION = `${GLASS} p-5 text-sm text-white/80`
const HEADING = "font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold"
const LIST = 'mt-2 flex list-disc flex-col gap-1.5 pl-5'

const strong = (text) => <span className="font-semibold text-white">{text}</span>

// Best first, with an example of each.
const RANKINGS = [
  ['Royal flush', 'A K Q J 10, all one suit'],
  ['Straight flush', 'Five in a row, all one suit'],
  ['Four of a kind', 'Four cards of one rank'],
  ['Full house', 'Three of a kind and a pair'],
  ['Flush', 'Five of one suit'],
  ['Straight', 'Five in a row (A 2 3 4 5 counts, Five high)'],
  ['Three of a kind', 'Three cards of one rank'],
  ['Two pair', 'Two pairs'],
  ['One pair', 'Two cards of one rank'],
  ['High card', 'None of the above'],
]

// How to play Kino Poker. The numbers come from shared/poker/config.js, so
// this never goes out of date.
export default function HowToPlay() {
  const { blinds, buyIn, timers, seats, minPlayers, maxDraw } = POKER
  const bots = Object.values(POKER.bots).map((bot) => bot.name)

  return (
    <div className="flex flex-col gap-4">
      <section className={SECTION}>
        <h2 className={HEADING}>The table</h2>
        <ul className={LIST}>
          <li>
            One table, always open, with {seats} seats. Sit down first and three bots join you: {bots.join(', ').replace(/, ([^,]*)$/, ' and $1')}.
          </li>
          <li>
            When someone new arrives, they sit down between hands and a bot gets up to make room. Once the bots are gone, the table fills up to{' '}
            {seats}, and anyone else waits in the queue (it shows your place).
          </li>
          <li>With fewer than {minPlayers} players, bots come back to fill the table. When the last member leaves, the table starts over.</li>
        </ul>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>A hand of 5-Card Draw</h2>
        <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            The two players left of the dealer {strong('D')} put in the blinds: {blinds.small} and {blinds.big}.
          </li>
          <li>Everyone gets five cards, face down. Only you can see yours.</li>
          <li>A round of betting, starting left of the big blind.</li>
          <li>
            {strong('The draw')}: tap up to {maxDraw} of your cards to swap them for new ones, or keep all five.
          </li>
          <li>Another round of betting, starting left of the dealer.</li>
          <li>{strong('Showdown')}: the best hand wins the pot. Split pots are shared, and an odd chip goes to the first winner left of the dealer.</li>
        </ol>
        <p className="mt-2">If everyone else folds, the last player in wins without showing.</p>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Betting</h2>
        <ul className={LIST}>
          <li>
            {strong('No limit')}: bet or raise any amount up to everything in front of you. A raise must be at least as big as the last one (and
            never less than the big blind).
          </li>
          <li>Run short and you can still go all in. Side pots keep it fair: you can only win as much from each player as you put in.</li>
          <li>
            You have {timers.actSeconds} seconds to act and {timers.drawSeconds} to draw. Run out, and the table checks for you if it can, folds if it
            can&apos;t, and keeps all five in the draw.
          </li>
        </ul>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Hands, best first</h2>
        <ol className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {RANKINGS.map(([name, example], index) => (
            <li key={name} className="flex gap-2">
              <span className="w-5 shrink-0 text-right text-white/40 tabular-nums">{index + 1}.</span>
              <span>
                {strong(name)} <span className="text-white/60">· {example}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2">The same kind of hand is decided by its cards, highest first (a pair of Kings beats a pair of Queens). Suits never break a tie.</p>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Points</h2>
        <ul className={LIST}>
          <li>
            Buy in for {buyIn.min} to {buyIn.max} points. It spends your {strong('PP first')}, then P-PP.
          </li>
          <li>
            Leave the table and your chips go back to your wallet. You get your PP back, less anything you lost, and everything you won is{' '}
            {strong('P-PP')}.
          </li>
          <li>
            Chips you win from a bot pay {strong('half')}, like beating Clanker at Kino Farkle. Chips you win from other members pay in full.
          </li>
          <li>
            Leave in the middle of a hand and you fold. If your connection drops, you have {timers.reconnectSeconds} seconds to come back before you
            fold, and you leave the table with your chips after the hand.
          </li>
        </ul>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>The bots</h2>
        <ul className={LIST}>
          <li>{strong(POKER.bots.shark.name)} is aggressive and a little unhinged: big raises, lots of bluffs.</li>
          <li>{strong(POKER.bots.kaveri.name)} is careful: folds a lot, and only bets big with a strong hand.</li>
          <li>{strong(POKER.bots.maverick.name)} plays the odds, and bluffs only when it&apos;s smart.</li>
        </ul>
        <p className="mt-2">Tap the 😊 button at the table to react with an emoji, or type one of your own.</p>
        <p className="mt-2">The cards that make your best hand glow, with a little lightning now and then. Pick the colour in Options, or turn it off there or with VFX at the table.</p>
      </section>
    </div>
  )
}
