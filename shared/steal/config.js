// Steal and Defend: every number the game runs on, in this one file, so it
// can be rebalanced without touching the game itself. The server
// (backend/games/steal and backend/utils/steal) and the pages
// (frontend/src/pages/Steal*.jsx) both read it, so they always agree.
//
// What each item does is in backend/data/steal-and-defend-items.json
// instead: its `effects` are added on top of the numbers here.
export const STEAL = {
  name: 'Steal and Defend',

  // Every time is Helsinki time. The daily reset is 12:00 (with the PP
  // payout); the weekly one is Monday 12:00 (with Double or Nothing).
  zone: 'Europe/Helsinki',
  daily: { hour: 12 },
  weekly: { weekday: 1, hour: 12 },

  // Who can do what (spec §3).
  eligibility: {
    // Attacking needs an account at least this old.
    accountAgeDays: 12,
    // Buying from the shop (and the player market) needs this many reviews.
    reviewsToBuy: 5,
  },

  // Following someone long enough before attacking them (spec §4). Each
  // unfollow after a successful steal from them doubles it, up to the cap.
  follow: { hours: 72, capHours: 21 * 24 },

  limits: {
    // Attack attempts per attacker per day, and attempts on each victim
    // per week (success, failure or fizzle).
    attacksPerDay: 1,
    attemptsPerVictimPerWeek: 1,
    // Successful steals from one victim.
    victimPerDay: 2,
    victimPerWeek: 3,
  },

  // The steal: one of these percentages of the victim's net worth. Each
  // needs a crit multiplier below.
  percents: [1, 2, 3, 4, 5, 10, 20, 30, 40, 50],

  quiz: {
    questions: 10,
    mix: { victim: 6, math: 2, trivia: 2 },
    // Seconds between questions, and to answer each one.
    countdownSeconds: 3,
    timerSeconds: 10,
    // How late an answer can arrive and still count, for the trip from
    // the page to the server.
    graceMs: 1500,
    // Attack rate per correct answer.
    pointsPerCorrect: 10,
    // Multiplication uses numbers from 1 to this (the quiz's only math).
    mathMax: 20,
    // Typed answers count when they're at least this similar (0 to 1).
    typedMatch: 0.8,
    // The genre question picks from their top this many genres.
    topGenres: 10,
    // Multiple-choice average-rating options are at least this far apart.
    averageSpacing: 0.3,
    // What the Mind Stone shows instead of the question.
    foggyText: 'Your mind feels foggy, choose an answer.',
  },

  // The success formula (spec §8.1): attack is clamped between these, and
  // defense can't go past defenseCap unless an item raises the cap.
  attackRange: { min: 0, max: 100 },
  defenseCap: 75,

  crit: {
    chance: 5,
    // The multiplier for each chosen percentage: 1% x2 ... 5% x3, then
    // x0.25 more for each step up to 50%.
    multipliers: { 1: 2, 2: 2.25, 3: 2.5, 4: 2.75, 5: 3, 10: 3.25, 20: 3.5, 30: 3.75, 40: 4, 50: 4.25 },
    lore: 'King Loan Shark noticed your talents. He\'s giving you a little extra for keeping the town lively — good for business. He\'s "investing in your talents."',
  },

  // A failed attack's fine, as a percentage of the attempted amount
  // (items add to or take from it).
  fine: { base: 80 },

  // A thief who can't pay: this share of what's still owed becomes a
  // negative balance. The rest is forgiven.
  debtShare: 25,

  // Everyone's class until they pick another (once a week, from the hub).
  defaultClass: 'warrior',

  classes: {
    warrior: { label: 'Warrior', defense: 5, attack: 0, gainBonus: 0, fineBonus: 0, summary: '+5 defense' },
    mage: { label: 'Mage', defense: 0, attack: 5, gainBonus: 0, fineBonus: 0, summary: '+5 attack' },
    // gainBonus is newly made on top of a steal; fineBonus is taken from
    // the thief on a failure and goes to nobody.
    rogue: {
      label: 'Rogue',
      defense: 0,
      attack: 0,
      gainBonus: 20,
      fineBonus: 5,
      summary: '+20% on a successful steal, but +5% on a fine',
    },
  },

  inventory: { size: 27, slots: 3 },

  shop: {
    listings: 9,
    // Chance of each tier, out of 100. Each listing rolls a tier, then
    // picks an item in it at random.
    tierChances: { Common: 40, Uncommon: 30, Rare: 20, Epic: 9, Legendary: 1 },
    // A Legendary roll with every Infinity Stone already out there
    // becomes this tier instead.
    noStonesLeft: 'Epic',
    // Selling an item back pays this share of what it first cost, times
    // how much durability is left.
    sellBack: 0.5,
  },

  tiers: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],

  // An Infinity Stone goes back to the shop when whoever holds it hasn't
  // logged in for this many months.
  stoneInactiveMonths: 3,

  // A trade offer nobody answers is cancelled after this many days, and
  // what it held goes back.
  tradeExpiryDays: 7,

  // Admin flags (spec §14). Each looks back this many days.
  flags: {
    windowDays: 30,
    // The same two players stealing from each other this many times.
    collusionSteals: 3,
    // Going into debt from failed attacks this many times.
    debts: 3,
    // Turning PvP off with steals to take back this many times.
    refunds: 2,
    // A trade is extreme when the PP paid is at most `lowRatio` of what
    // the items first cost (1 PP for a Legendary), or at least `highRatio`
    // times it.
    lowRatio: 0.02,
    highRatio: 50,
    // Gifts of these tiers count as extreme too: they're free.
    giftTiers: ['Epic', 'Legendary'],
    // IPs and devices seen within this many days count as shared.
    sightingDays: 30,
  },

  // What admins can ban a member from.
  banScopes: {
    steal: 'Stealing',
    buy: 'Buying items',
    trade: 'Trading',
    games: 'All games',
    site: 'Site-wide',
  },

  // How many successful steals the public feed shows.
  feedSize: 20,
}
