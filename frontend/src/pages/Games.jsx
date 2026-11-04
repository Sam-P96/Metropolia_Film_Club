import '@fontsource/bebas-neue'
import '@fontsource/cinzel'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Die from '../components/farkle/Die'
import StatusBadge from '../components/double/StatusBadge'
import useApi from '../hooks/useApi'
import { getDoubleStatus } from '../services/double'
import { getCurrentUser } from '../utils/currentUser'
import PpLeaderboard from '../components/wallet/PpLeaderboard'
import { GoldenTicketIcon, StarIcon } from '../components/scratch/TileFace'
import { BOT_MODE } from '../../../shared/farkle/rules.js'
import { SCRATCH } from '../../../shared/scratch/config.js'
import SymbolArt from '../components/slots/SymbolArt'
import GameTitle from '../components/slots/GameTitle'
import { SLOTS } from '../../../shared/slots/config.js'
import StealLogo from '../components/steal/StealLogo'
import { getStealStatus } from '../services/steal'

const CARD = 'group flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-plum/40 p-6 shadow-xl shadow-black/40 backdrop-blur-md transition-colors hover:border-brand-gold/60'

// Every game on the site, as a card each, behind "Games" in the nav:
// Farkle, Box Office Scratch, Double or Nothing, Kino Kasino and Steal and
// Defend (whose picture says "Require PvP" until its PvP is on). Every row
// is as tall as the tallest card, so the cards are all one size. Below them, the PP
// Leaderboard, like the Critics Leaderboard under Movie Reviews. Anyone can
// look; playing needs a login, since games are played for points. Double or
// Nothing's picture is the member's standing in it, which logged-out
// visitors always see as AVAILABLE.
export default function Games() {
  const [loggedIn] = useState(() => Boolean(getCurrentUser()))
  const double = useApi(() => getDoubleStatus(), [loggedIn], { enabled: loggedIn })
  const doubleStatus = loggedIn ? (double.data?.status ?? (double.error ? 'AVAILABLE' : null)) : 'AVAILABLE'
  // Steal and Defend's card shows its logo only to members with its PvP on.
  const steal = useApi(() => getStealStatus(), [loggedIn], { enabled: loggedIn })
  const stealPvp = Boolean(steal.data?.pvp)

  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-white">Games</h1>
        <p className="mt-2 max-w-2xl text-white/60">
          Play for PP and P-PP. Points can't be bought or cashed out: they're only for fun on the site, like badges and trophies.
        </p>

        <ul className="mt-8 grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <Link to="/games/farkle" className={CARD}>
              <div className="flex gap-2" aria-hidden="true">
                {[1, 5, 5, 1].map((face, i) => (
                  <Die key={i} value={face} size="small" />
                ))}
              </div>
              <h2 className="font-['Cinzel'] text-2xl text-white">
                Kino <span className="text-brand-gold">Farkle</span>
              </h2>
              <p className="text-white/70">
                The push-your-luck dice game. Play {BOT_MODE} any time, or challenge another member and take turns by
                notification.
              </p>
              <span className="mt-auto font-semibold text-brand-gold transition-colors group-hover:text-white">Play Farkle →</span>
            </Link>
          </li>
          <li>
            <Link to="/games/scratch" className={CARD}>
              <div className="flex items-center gap-2 rounded-lg bg-ticket/80 px-2 py-1.5 self-start" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <StarIcon key={i} className="size-7" />
                ))}
                <GoldenTicketIcon className="w-9" />
              </div>
              <h2 className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
                Box Office <span className="text-brand-gold">Scratch</span>
              </h2>
              <p className="text-white/70">
                A {SCRATCH.ticketPrice}-point scratch card. Find {SCRATCH.starsToWin} stars in {SCRATCH.scratches} scratches to win P-PP, and
                hunt for the Golden Ticket and its jackpot.
              </p>
              <span className="mt-auto font-semibold text-brand-gold transition-colors group-hover:text-white">Play Box Office Scratch →</span>
            </Link>
          </li>
          <li>
            <Link to="/games/double-or-nothing" className={CARD}>
              <div className="self-start">
                <span className="sr-only">Your status: </span>
                <StatusBadge status={doubleStatus} />
              </div>
              <h2 className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
                Double <span className="text-brand-gold">or Nothing</span>
              </h2>
              <p className="text-white/70">
                Double it, give it to the next person! Match the bet and win 2 of 3 throws of rock, paper, scissors to double it. Lose, and the pot
                doubles for the next player.
              </p>
              <span className="mt-auto font-semibold text-brand-gold transition-colors group-hover:text-white">Play Double or Nothing →</span>
            </Link>
          </li>
          <li>
            <Link to="/games/slots" className={CARD}>
              <div className="flex gap-1.5 self-start" aria-hidden="true">
                {['logo', 'gauntlet', 'ring'].map((key) => (
                  <span key={key} className="grid size-10 place-items-center rounded-lg bg-dice-ivory">
                    <SymbolArt symbolKey={key} size={30} />
                  </span>
                ))}
              </div>
              <h2 className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
                <GameTitle />
              </h2>
              <p className="text-white/70">
                Five reels, {SLOTS.paylines.length} lines. Load it with points, pull the lever, and line up five Kino Kaveri logos for the jackpot.
              </p>
              <span className="mt-auto font-semibold text-brand-gold transition-colors group-hover:text-white">Play {SLOTS.name} →</span>
            </Link>
          </li>
          <li>
            <Link to="/games/steal-and-defend" className={CARD}>
              {stealPvp ? (
                <StealLogo />
              ) : (
                <span className="self-start rounded-lg border border-brand-red/60 bg-brand-red/15 px-3 py-1.5 font-['Bebas_Neue'] text-2xl leading-none tracking-wide text-white">
                  Require PvP
                </span>
              )}
              <h2 className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
                Steal and <span className="text-brand-gold">Defend</span>
              </h2>
              <p className="text-white/70">
                Follow a member, win a quiz about them, and steal a slice of their points. Defend your own with items from the daily shop.
              </p>
              <span className="mt-auto font-semibold text-brand-gold transition-colors group-hover:text-white">Play Steal and Defend →</span>
            </Link>
          </li>
        </ul>
      </div>

      <PpLeaderboard />
    </>
  )
}
