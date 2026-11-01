import { DOUBLE } from '../../../../shared/double/config.js'
import { GLASS } from './glass'

const CARD = `${GLASS} p-6`

// The rules in plain words, with the numbers from the config.
export default function HowItWorks() {
  const { seed, bonus, roundSeconds } = DOUBLE

  return (
    <section className={CARD} aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="text-xl font-bold text-white">
        How it works
      </h2>
      <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-white/75">
        <li>There&apos;s one pot for the whole site, and anyone can play it. To play, you bet exactly what&apos;s in the pot right now.</li>
        <li>Your bet comes out of your PP first, then your P-PP.</li>
        <li>
          You play up to 3 rounds of rock, paper, scissors against the house. The house only throws after you have. You get{' '}
          {roundSeconds} seconds for each throw; after that, the server throws for you at random.
        </li>
        <li>
          <strong className="text-white">Win 2 rounds</strong> before you lose one, and you get double your bet back in P-PP. The pot goes
          back to the week&apos;s starting bet, and everyone on the lists can play again.
        </li>
        <li>
          <strong className="text-white">Lose a round</strong> before you&apos;ve won 2, even after a win, and you go on the Ban List: your
          bet stays in the pot, the pot doubles, and you sit out until someone wins it or the Monday reset.
        </li>
        <li>
          <strong className="text-white">Draw twice</strong> before you&apos;ve won 2 (without losing), and you go on the Waiting List: your
          bet stays in the pot, the pot doubles, and you sit out until the next person finishes a game.
        </li>
        <li>
          The bonus pot: win when the bet is at least {bonus.betMultiple} times the week&apos;s starting bet, and you win the whole bonus
          pot too.
        </li>
        <li>
          Every Monday at 12:00 Helsinki time the pot starts over. Half of what&apos;s been left in it goes to the bonus pot (which holds up
          to {bonus.cap.toLocaleString('en-US')}), and the other half is burned. The new starting bet is what a typical active member
          holds: the 75th percentile of the wallets of everyone who&apos;s posted a review in the last {seed.activeMonths} months, between{' '}
          {seed.min} and {seed.max}.
        </li>
        <li>Points can&apos;t be bought or cashed out: they&apos;re only for fun on the site.</li>
      </ul>
    </section>
  )
}
