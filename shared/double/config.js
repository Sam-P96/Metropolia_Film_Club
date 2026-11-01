// Double or Nothing: every number the game runs on, in this one file, so it
// can be rebalanced without touching the game itself. The server
// (backend/utils/double.js) and the page (pages/DoubleOrNothing.jsx) both
// read it, so they always agree.
export const DOUBLE = {
  // Rock, paper, scissors against the house: up to 3 rounds. 2 wins wins
  // the game, 2 draws puts you on the Waiting List, any loss before 2 wins
  // puts you on the Ban List.
  throws: ['rock', 'paper', 'scissors'],
  rounds: 3,
  winsNeeded: 2,
  drawsToWait: 2,

  // Seconds to make each throw. After that the server throws for you,
  // at random, until the game is decided.
  roundSeconds: 60,

  // The week's starting bet: the 75th percentile of what active members
  // hold (PP + P-PP), rounded, and kept between min and max. Active means
  // they've posted a review in the last `activeMonths` months.
  seed: { percentile: 0.75, min: 20, max: 500, activeMonths: 2 },

  // The bonus pot: half of what's left in the pot at each Monday reset
  // goes in, up to `cap` (the rest is burned). Won along with a win when
  // the bet is at least `betMultiple` times the week's seed.
  bonus: { cap: 3000, betMultiple: 4 },

  // When the pot starts over: every Monday at 12:00, Helsinki time.
  reset: { weekday: 1, hour: 12, zone: 'Europe/Helsinki' },
}
