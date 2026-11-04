import '@fontsource/bebas-neue'
import { Link } from 'react-router-dom'
import { MotionConfig, motion } from 'motion/react'

import AnimatedNumber from '../components/AnimatedNumber'
import GameBackdrop from '../components/GameBackdrop'
import CoinIcon from '../components/wallet/CoinIcon'
import BonusCard from '../components/double/BonusCard'
import HowItWorks from '../components/double/HowItWorks'
import RecentPlays from '../components/double/RecentPlays'
import ResetCountdown from '../components/double/ResetCountdown'
import ThrowBox from '../components/double/ThrowBox'
import { GLASS } from '../components/double/glass'
import useDoubleOrNothing, { formatPoints } from '../hooks/useDoubleOrNothing'
import useWallet from '../hooks/useWallet'

const EASE = [0.22, 1, 0.36, 1]

function Skeleton({ className }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-white/10 ${className}`} />
}

// The two big numbers: what playing costs, and what winning pays.
function PotCard({ bet, bonusPot, bonusEligible }) {
  return (
    <section className={`${GLASS} grid grid-cols-2 gap-4 p-5 sm:p-6`} aria-label="The pot">
      <div>
        <p className="text-xs tracking-widest text-white/50 uppercase">You bet</p>
        <p className="mt-1 text-4xl font-bold text-white tabular-nums sm:text-5xl">
          <AnimatedNumber value={bet} />
        </p>
        <p className="mt-1 text-xs text-white/50">PP first, then P-PP</p>
      </div>
      <div>
        <p className="text-xs tracking-widest text-white/50 uppercase">You can win</p>
        <p className="mt-1 flex items-center gap-2 text-4xl font-bold text-brand-gold tabular-nums sm:text-5xl">
          <AnimatedNumber value={bet * 2} />
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
          <CoinIcon kind="ppp" size={14} /> P-PP
        </p>
        {bonusEligible && bonusPot > 0 && (
          <p className="mt-2 text-sm font-semibold text-brand-gold">+ {formatPoints(bonusPot)} bonus pot</p>
        )}
      </div>
    </section>
  )
}

// Double or Nothing: one pot for the whole site (backend/utils/double.js).
// The bet and what it wins up top, then the throw box (or which list
// they're on), the bonus pot, when the pot resets, what others did with it
// lately, and the rules. On a phone everything is one column; on a wide
// screen the pot and the throw box sit beside the rest. Coming back
// mid-game picks the game up again. The page fades in and slides up a
// little as it opens (with reduced motion, it only fades), over its own
// purple-to-golden-yellow background.
export default function DoubleOrNothing() {
  const wallet = useWallet()
  const play = useDoubleOrNothing()
  const { status, game, loadError } = play

  return (
    <MotionConfig reducedMotion="user">
      {/* The club's purple running into golden yellow. Outside the sliding
          wrapper: a moving parent would carry a fixed background along. */}
      <GameBackdrop to="#D4A017" />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:py-12"
      >
        <header>
          <Link to="/games" className="text-sm text-white/60 hover:text-white">
            ← Games
          </Link>
          <h1 className="mt-2 font-['Bebas_Neue'] text-5xl leading-none tracking-wide text-white">
            Double <span className="text-brand-gold">or Nothing</span>
          </h1>
          <p className="mt-2 max-w-2xl text-white/70">
            Match the pot and win 2 of 3 throws. Win and you double your bet. Lose, and you double the pot and leave it for the next person.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg font-bold text-white" aria-label="Your points">
            <span className="flex items-center gap-1.5">
              <CoinIcon kind="pp" size={18} /> {wallet ? <AnimatedNumber value={wallet.pp} /> : '…'}
            </span>
            <span className="flex items-center gap-1.5">
              <CoinIcon kind="ppp" size={18} /> {wallet ? <AnimatedNumber value={wallet.ppp} /> : '…'}
            </span>
          </p>
        </header>

        {!status ? (
          loadError ? (
            <p className={`${GLASS} p-6 text-white/70`}>Couldn&apos;t load Double or Nothing. Try refreshing the page.</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="flex flex-col gap-5">
                <Skeleton className="h-32" />
                <Skeleton className="h-56" />
              </div>
              <div className="flex flex-col gap-5">
                <Skeleton className="h-40" />
                <Skeleton className="h-28" />
              </div>
            </div>
          )
        ) : (
          <>
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="flex flex-col gap-5">
                <PotCard
                  bet={game ? game.bet : status.currentBet}
                  bonusPot={status.bonusPot}
                  bonusEligible={game ? game.bet >= status.bonusUnlocksAt : status.bonusEligible}
                />
                <ThrowBox play={play} wallet={wallet} />
              </div>
              <div className="flex flex-col gap-5">
                <BonusCard
                  bonusPot={status.bonusPot}
                  bonusCap={status.bonusCap}
                  eligible={status.bonusEligible}
                  unlocksAt={status.bonusUnlocksAt}
                />
                <ResetCountdown nextResetAt={status.nextResetAt} offset={play.offset} />
                <RecentPlays recent={status.recent} />
              </div>
            </div>
            <HowItWorks />
          </>
        )}
      </motion.div>
    </MotionConfig>
  )
}
