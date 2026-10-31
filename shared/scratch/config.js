// Box Office Scratch: every number the game runs on, in this one file, so it
// can be rebalanced without touching the game itself. The server
// (backend/games/scratch/engine.js) and the page (pages/ScratchGame.jsx)
// both read it, so they always agree. The real odds are worked out from
// these numbers (odds.js), so they stay true after a change.
export const SCRATCH = {
  // The card: a grid of tiles, this many of them stars, the rest blank.
  rows: 4,
  cols: 4,
  stars: 5,

  // How many stars make a win, and how many tiles one ticket lets you scratch.
  starsToWin: 3,
  scratches: 7,

  // What a ticket costs, in points: PP first, then P-PP for the rest, like
  // every other bet on the site.
  ticketPrice: 10,

  // One card in this many hides a Golden Ticket on one of its blank tiles.
  goldenTicketOneIn: 200,

  // The jackpot, all in P-PP: what the pool starts at (and goes back to
  // after someone wins it), and how much each ticket sold adds to it.
  jackpotSeed: 150,
  jackpotContribution: 1,

  // What a win pays, by the scratch your last needed star turns up on. Every
  // `scratch` from starsToWin to scratches needs a row. `ppp` is paid in
  // P-PP; `refund` hands back exactly what the ticket cost (PP as PP, P-PP
  // as P-PP).
  tiers: [
    { scratch: 3, key: 'smash', name: 'Box Office Smash', ppp: 80 },
    { scratch: 4, key: 'darling', name: 'Critical Darling', ppp: 40 },
    { scratch: 5, key: 'cult', name: 'Cult Classic', ppp: 20 },
    { scratch: 6, key: 'sleeper', name: 'Sleeper Hit', ppp: 15 },
    { scratch: 7, key: 'dvd', name: 'Straight to DVD', refund: true },
  ],

  // Not enough stars by the last scratch.
  loss: { key: 'bomb', name: 'Box Office Bomb' },
}
