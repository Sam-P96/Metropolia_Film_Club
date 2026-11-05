// Box Office Scratch: every number the game runs on, in this one file, so it
// can be rebalanced without touching the game itself. The server
// (backend/games/scratch/engine.js, backend/utils/scratch.js) and the page
// (pages/ScratchGame.jsx) both read it, so they always agree. The real odds
// are worked out from these numbers (odds.js), so they stay true after a
// change. tickets.js looks things up in it for both.
export const SCRATCH = {
  // ---- The rules, the same on every ticket ----

  // The card: a grid of tiles, this many of them stars, the rest blank.
  rows: 4,
  cols: 4,
  stars: 5,

  // How many stars make a win, and how many tiles one ticket lets you scratch.
  starsToWin: 3,
  scratches: 7,

  // One card in this many hides a Golden Ticket on one of its blank tiles.
  goldenTicketOneIn: 200,

  // The tiers, by the scratch your last needed star turns up on. Every
  // `scratch` from starsToWin to scratches needs a row here, and a prize in
  // every ticket type below.
  tiers: [
    { scratch: 3, key: 'smash', name: 'Box Office Smash' },
    { scratch: 4, key: 'darling', name: 'Critical Darling' },
    { scratch: 5, key: 'cult', name: 'Cult Classic' },
    { scratch: 6, key: 'sleeper', name: 'Sleeper Hit' },
    { scratch: 7, key: 'dvd', name: 'Straight to DVD' },
  ],

  // Not enough stars by the last scratch.
  loss: { key: 'bomb', name: 'Box Office Bomb' },

  // ---- The tickets on sale ----
  // Cheapest first: the page lists them in this order. Each one has:
  //   price                what it costs, in points: PP first, then P-PP
  //                        for the rest, like every other bet on the site
  //   prizes               what a win pays, by the scratch the last needed
  //                        star turns up on. `ppp` is paid in P-PP; `refund`
  //                        hands back exactly what the ticket cost (PP as
  //                        PP, P-PP as P-PP)
  //   jackpotSeed          its own jackpot, in P-PP: what the pool starts at,
  //                        and goes back to after someone wins it
  //   jackpotContribution  how much each ticket of this type sold adds to
  //                        its pool
  //   hours                null if it's always on sale. Otherwise it's on
  //                        sale from `opens` up to (not including) `closes`
  //                        by the clocks in `timeZone`, daylight saving time
  //                        and all; '24:00' is the midnight that ends the
  //                        day. The server checks it, never the member's
  //                        own clock. A card bought in time can be finished
  //                        after closing.
  ticketTypes: {
    standard: {
      name: 'Standard',
      price: 10,
      prizes: { 3: { ppp: 80 }, 4: { ppp: 40 }, 5: { ppp: 20 }, 6: { ppp: 15 }, 7: { refund: true } },
      jackpotSeed: 150,
      jackpotContribution: 1,
      hours: null,
    },
    premium: {
      name: 'Premium',
      price: 20,
      prizes: { 3: { ppp: 165 }, 4: { ppp: 85 }, 5: { ppp: 40 }, 6: { ppp: 35 }, 7: { refund: true } },
      jackpotSeed: 315,
      jackpotContribution: 2,
      hours: null,
    },
    vip: {
      name: 'VIP',
      price: 30,
      prizes: { 3: { ppp: 265 }, 4: { ppp: 130 }, 5: { ppp: 65 }, 6: { ppp: 50 }, 7: { refund: true } },
      jackpotSeed: 485,
      jackpotContribution: 3,
      hours: { timeZone: 'Europe/Helsinki', opens: '16:00', closes: '24:00' },
    },
  },
}
