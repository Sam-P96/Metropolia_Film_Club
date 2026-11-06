// Kino Poker, 5-Card Draw: every number the game runs on, in this one file,
// so it can be rebalanced without touching the game itself. The server
// (backend/games/poker/) and the pages (frontend/src/pages/Poker*.jsx) both
// read it, so they always agree. What the bots say is in ./lines.js.
export const POKER = {
  name: 'Kino Poker',
  variant: '5-Card Draw',

  // One table, always open.
  seats: 6,
  // With fewer players than this, bots come back to fill the table to it.
  minPlayers: 4,

  // No-limit, with blinds. Small and big blind, in points.
  blinds: { small: 1, big: 2 },

  // What a member sits down with, from their wallet (PP first, then P-PP),
  // in points: 10 to 150 big blinds.
  buyIn: { min: 20, max: 300, default: 60 },

  // What each bot sits down with. Bots play with the house's points: one
  // that runs out buys back in between hands.
  botStack: 150,

  // Chips won from a bot pay half, like beating Clanker at Kino Farkle
  // (your stake back plus half). Chips won from members pay in full.
  botWinShare: 0.5,

  // Leaving the table ahead (cashing out more than you sat down with) is a
  // win: every member hears about it in Notifications, at least this many
  // points up. One notice a sitting, however many hands it took.
  announce: { minWin: 1 },

  // Each player draws up to this many cards.
  maxDraw: 3,

  timers: {
    // To act in a betting round, and to draw. Then the server checks (or
    // folds) for you, or stands pat.
    actSeconds: 25,
    drawSeconds: 25,
    // The first hand after the table opens; how long a hand's result shows;
    // then, once new players have sat down, a moment before the next deal.
    firstHandSeconds: 4,
    nextHandSeconds: 6,
    dealSeconds: 2,
    // A member whose connection drops has this long to come back before
    // they fold (and, between hands, leave the table with their chips).
    reconnectSeconds: 20,
  },

  bot: {
    // How long a bot "thinks" before it acts, in milliseconds: a random
    // time in this range, so they feel human.
    thinkMs: [900, 2600],
  },

  speech: {
    // How often a bot says something on a routine action. Raises, all-ins,
    // wins, losses, joining and leaving always get a line, and so does the
    // hello every bot says on the first hand after the table opens.
    chance: { check: 0.3, call: 0.3, bet: 0.6, fold: 0.5, draw: 0.45, standPat: 0.8 },
    // How long each bubble stays up. Each bot has its own, popping up the
    // moment it acts (a new line replaces its last one). The hellos come
    // one after another, this far apart.
    bubbleSeconds: 2.6,
    greetGapMs: 800,
  },

  // Emoji reactions: the four in the menu, then any one emoji typed in.
  // Each floats up over the player's seat for everyone at the table.
  emoji: {
    presets: [
      { emoji: '😂', label: 'Laughing' },
      { emoji: '😢', label: 'Crying' },
      { emoji: '😠', label: 'Angry' },
      { emoji: '😘', label: 'Blowing a kiss' },
    ],
    // At most one every this many milliseconds per player, and how long
    // each shows.
    cooldownMs: 1500,
    showSeconds: 2.5,
  },

  // The bots, by key: their name at the table and their pictures. Each
  // time a bot sits down it gets one of its pictures at random, the same
  // for everyone watching (the files, and how each is framed, are in
  // frontend/src/components/poker/botPictures.js). The emoji shows if a
  // picture is ever missing. How they play is backend/games/poker/bots.js.
  bots: {
    shark: { name: 'King Loan Shark', pictures: ['kingLoanShark'], placeholder: '🦈' },
    kaveri: { name: 'Kaveri', pictures: ['kaveriEyes1', 'kaveriEyes2', 'kaveriBaseForm'], placeholder: '🐰' },
    maverick: { name: 'Bret Maverick', pictures: ['bret'], placeholder: '🎩' },
  },
}
