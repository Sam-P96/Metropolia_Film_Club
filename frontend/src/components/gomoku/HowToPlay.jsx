import { CARD, HEADING } from './GomokuChrome'
import { MIN_STAKE, QUICK_STAKES, REPLAY_DAYS, formatPoints } from '../../../../shared/gomoku/rules.js'

const RULE = 'mx-auto max-w-xl text-center'

// How to play Infinite Gomoku, under the game page's buttons.
export default function HowToPlay() {
  return (
    <section className={`${CARD} flex flex-col gap-4 text-white/80`} aria-labelledby="gomoku-rules">
      <h2 id="gomoku-rules" className={HEADING}>
        How to play
      </h2>
      <p className={RULE}>
        Take turns putting a piece on any empty point where the lines of the 15 × 15 board cross. Get <strong className="text-white">five in a row</strong>{' '}
        (across, down or diagonally) to win. Six or more in a row wins too. If the board fills up first, it&apos;s a draw.
      </p>
      <p className={RULE}>
        Tap a point to pick it, then press <strong className="text-white">Place piece</strong> under the board. Until you press it, you can pick somewhere
        else.
      </p>
      <p className={RULE}>
        Your piece lands with a shockwave. Your opponent sees it land too: straight away if they&apos;re at the board, or the next time they open the
        game if they aren&apos;t.
      </p>
      <p className={RULE}>
        <strong className="text-white">Play For Fun</strong>: <em>Play Local</em> is two people on this device, taking turns. <em>Play Online</em>{' '}
        challenges another member, with nothing at stake.
      </p>
      <p className={RULE}>
        <strong className="text-white">Play For PP</strong>: each of you puts up the stake ({QUICK_STAKES.map(formatPoints).join(', ')}, or your own
        amount, {MIN_STAKE} at the least), and the winner takes both, in P-PP. A draw gives both stakes back.
      </p>
      <p className={RULE}>
        A challenge can be accepted, declined, or answered with new terms, back and forth. Whoever accepts moves first. Three days to answer a
        challenge, and three days for each move, or the game goes to the other player.
      </p>
      <p className={RULE}>
        A finished online game can be watched again, move by move, for {REPLAY_DAYS} days after it ends. Then its replay is deleted, and only the
        final board is kept.
      </p>
      <p className={RULE}>
        The <strong className="text-white">Shop</strong> sells pieces, shockwaves, boards and grids. You see your own board and grid; your opponent
        sees their own. Pieces and shockwaves show on both screens. If you both play the same piece, theirs shows in negative on your screen (yours
        on theirs), and Black against Black shows as White.
      </p>
    </section>
  )
}
