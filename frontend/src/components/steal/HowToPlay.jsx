import useApi from '../../hooks/useApi'
import { getStealItems } from '../../services/steal'
import { STEAL } from '../../../../shared/steal/config.js'
import LoanSharkMessage from './KingLoanShark'
import { GLASS, SCROLL, tierColour } from './style'

const SECTION = `${GLASS} p-5 text-sm text-white/80`
const HEADING = "font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold"
const LIST = 'mt-2 flex list-disc flex-col gap-1.5 pl-5'

const strong = (text) => <span className="font-semibold text-white">{text}</span>

// How to play Steal and Defend: the rules, classes, items and the crit
// lore (spec §15). The numbers come from shared/steal/config.js and the
// items from the server's items file, so this never goes out of date.
export default function HowToPlay() {
  const { data } = useApi(getStealItems, [])
  const items = data?.items ?? []
  const { quiz, limits, follow, eligibility, crit, fine } = STEAL
  const crits = Object.entries(crit.multipliers)

  return (
    <div className="flex flex-col gap-4">
      <section className={SECTION}>
        <h2 className={HEADING}>The idea</h2>
        <p className="mt-1">
          Follow other members, then try to steal {STEAL.percents.slice(0, -1).join(', ')} or {STEAL.percents.at(-1)}% of their net worth (PP + P-PP) by winning a timed quiz
          about them. Defend yourself with items from the daily shop. Everything is decided on the server: refreshing or closing the page never
          changes a thing.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Before you can attack</h2>
        <ul className={LIST}>
          <li>
            Turn on {strong('PVP')} in Edit profile on your profile page: the same switch that lets you dislike and be disliked. It&apos;s off for
            everyone to start with, and while it&apos;s off nobody can attack you. Everyone starts as a Warrior.
          </li>
          <li>Your account must be at least {eligibility.accountAgeDays} days old, and your balance can&apos;t be negative.</li>
          <li>
            You must have followed your target for {follow.hours} hours in a row. Unfollowing and following again starts the clock over. Unfollow
            someone you&apos;ve stolen from, and the time you need for them doubles each time: 3, 6, 12, then 21 days, for good.
          </li>
          <li>
            {limits.attacksPerDay} attack a day (success, failure or fizzle), and each person once a week. A victim can be robbed at most{' '}
            {limits.victimPerDay} times a day and {limits.victimPerWeek} times a week. The day starts over at 12:00 and the week on Monday at 12:00.
          </li>
        </ul>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>The attack</h2>
        <ul className={LIST}>
          <li>
            Pick a target and a percentage. The amount you&apos;re after and the fine if you fail are worked out right then, and both of your
            balances freeze until it&apos;s over: no spending, trading or betting anywhere.
          </li>
          <li>Your attack items lose 1 durability as it starts, and they&apos;re locked until it ends. The defender is told straight away and can swap their items until you finish.</li>
          <li>
            {strong(`${quiz.questions} questions`)}: {quiz.mix.victim} about your target, {quiz.mix.math} math and {quiz.mix.trivia} trivia, with{' '}
            {quiz.timerSeconds} seconds each and a {quiz.countdownSeconds}-second countdown between them. Each right answer is +{quiz.pointsPerCorrect}% attack rate.
            Unanswered questions count as wrong.
          </li>
          <li>Typed answers count when they&apos;re {Math.round(quiz.typedMatch * 100)}% similar to a right one. The math questions are multiplication.</li>
        </ul>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Winning and losing</h2>
        <p className="mt-1 rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-white/80">
          success % = (10 × right answers + attack items + class) − (defense items + Red Pill + class)
        </p>
        <p className="mt-2 text-xs text-white/50">Attack goes from 0 to 100, and defense can&apos;t pass {STEAL.defenseCap} unless an item says so.</p>
        <ul className={LIST}>
          <li>{strong('Success')}: you take the amount, PP first then P-PP from them, and it&apos;s paid to you as P-PP. Every successful steal goes on the public feed.</li>
          <li>
            {strong('Critical Hit')} ({crit.chance}% of successes): you get{' '}
            {crits.map(([percent, multiplier]) => `×${multiplier} at ${percent}%`).join(', ')}. The victim still only loses the amount, and everyone on the site hears about it.
          </li>
          <li>
            {strong('Failure')}: you pay a fine of {fine.base}% of the amount to the defender. Only the two of you see a failure.
          </li>
          <li>
            {strong("Can't pay?")} You pay what you have, and {STEAL.debtShare}% of the rest becomes a negative balance (the rest is forgiven). PP in your
            Slot Machine, at the poker table or out on loan counts too: as much as that could cover becomes a negative balance in full. Until the daily
            payout brings you back up, you can&apos;t attack, buy items or be attacked.
          </li>
          <li>If two people attack the same person at once, the first to finish counts. The other one fails.</li>
        </ul>
        <p className="mt-3 text-xs text-white/50">On every Critical Hit, you hear from him:</p>
        <LoanSharkMessage className="mt-2" />
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Classes</h2>
        <p className="mt-1">Everyone starts as a Warrior. Change class from the game&apos;s page once a week.</p>
        <ul className={LIST}>
          {Object.values(STEAL.classes).map((playerClass) => (
            <li key={playerClass.label}>
              {strong(playerClass.label)}: {playerClass.summary}
              {playerClass.fineBonus ? ' (that extra 5% goes to nobody, not the defender)' : ''}.
            </li>
          ))}
        </ul>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Items</h2>
        <ul className={LIST}>
          <li>
            Own up to {STEAL.inventory.size} and equip {STEAL.inventory.slots}, attack and defense alike, never two of the same. Effects from different
            items add up.
          </li>
          <li>
            The shop has {STEAL.shop.listings} new listings every day at 12:00. Each one can only be bought once, by whoever gets there first. Prices are
            the item&apos;s multiplier times your daily PP, so everyone sees their own. Buying needs {eligibility.reviewsToBuy} reviews.
          </li>
          <li>Attack items lose 1 durability when you start an attack; defense items when an attack on you ends. At 0 they break.</li>
          <li>
            Sell an item back for {Math.round(STEAL.shop.sellBack * 100)}% of what it first cost, times the durability left, or sell it to another player,
            trade it or give it away.
          </li>
          <li>
            {strong('Infinity Stones')} are unique: one of each on the whole site. One goes back to the shop when it breaks, is sold back, or its holder
            hasn&apos;t logged in for {STEAL.stoneInactiveMonths} months. The Power and Soul Stones skip the quiz and ignore every item that isn&apos;t a stone.
          </li>
        </ul>
        {items.length > 0 && (
          <div className={`mt-3 overflow-x-auto pb-1 ${SCROLL}`}>
            <table className="w-full min-w-lg text-left text-xs">
              <thead className="text-white/50">
                <tr>
                  <th className="py-1 pr-3 font-medium">Item</th>
                  <th className="py-1 pr-3 font-medium">Tier</th>
                  <th className="py-1 pr-3 font-medium">Durability</th>
                  <th className="py-1 font-medium">What it does</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.key} className="border-t border-white/10 align-top">
                    <td className="py-1.5 pr-3 font-semibold text-white">
                      {item.name}
                      <span className="block text-[10px] font-normal text-white/40 uppercase">{item.type}</span>
                    </td>
                    <td className="py-1.5 pr-3" style={{ color: tierColour(item.tier) }}>
                      {item.tier}
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums">{item.durability}</td>
                    <td className="py-1.5 text-white/70">{item.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Turning PVP off</h2>
        <p className="mt-1">
          While PVP is on you&apos;re in the game: you can turn it off any time an attack you&apos;re in isn&apos;t being played. Everything you stole since Monday&apos;s reset is taken back: each victim gets
          back what they lost, and crit and Rogue extras disappear. Your items stay yours, but you can&apos;t equip them while PvP is off.
        </p>
      </section>
    </div>
  )
}
