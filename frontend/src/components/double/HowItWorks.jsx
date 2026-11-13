import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DOUBLE } from '../../../../shared/double/config.js'
import { GLASS } from './glass'

const EASE = [0.22, 1, 0.36, 1]

// How to play: a button that slides the rules open under it (and closed
// again), in plain words, with the numbers from the config. The page's
// MotionConfig turns the slide into a plain fade with reduced motion.
export default function HowItWorks() {
  const { seed, bonus, roundSeconds } = DOUBLE
  const [open, setOpen] = useState(false)
  const rulesId = useId()

  return (
    <section className={`${GLASS} overflow-hidden`}>
      <h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={rulesId}
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-6 py-4 text-left text-xl font-bold text-white transition-colors hover:bg-white/5"
        >
          How to play
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`size-5 shrink-0 text-white/60 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="rules"
            id={rulesId}
            initial={{ height: 0, opacity: 0, y: -12 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <ul className="flex list-disc flex-col gap-2 px-6 pb-6 pl-11 text-sm text-white/75">
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
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
