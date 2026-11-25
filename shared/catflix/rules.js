// Catflix No Chill's rules: pets, their meters, the shop, the Room Room and
// its weather. The server enforces them (backend/utils/catflix/); the pages
// show them (frontend/src/components/catflix/). The pets themselves (their
// looks: registered forms and base forms) are made by admins in Pet Forge.
//
// Every pet is a magical egg cat: gender neutral, and they don't breed.

export const CATFLIX = {
  name: 'Catflix No Chill',

  // The rarities of registered forms, and so of cards, from the commonest.
  rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'],

  // Booster packs: each card is rolled on its own (odds below) from the
  // registered forms. A rarity with no forms yet gives a common instead.
  packs: {
    single: { name: 'Single Pack', cards: 1, price: 50000 },
    triple: { name: 'Triple Pack', cards: 3, price: 100000 },
    blackGold: { name: 'Black & Gold Pack', cards: 7, price: 200000 },
  },
  // % a card, by rarity.
  odds: [
    ['common', 40],
    ['uncommon', 30],
    ['rare', 19],
    ['epic', 10],
    ['legendary', 1],
  ],
  // The Spell Forge: this many cards of one rarity make one of the next.
  forgeCards: 3,

  // Aura crystals: each unlocks an aura for your pet. Half price in the
  // Black Friday Sale (shared/events.js).
  auras: {
    ember: { name: 'Ember', price: 500000 },
    frost: { name: 'Frost', price: 500000 },
    verdant: { name: 'Verdant', price: 500000 },
    void: { name: 'Void', price: 500000 },
    storm: { name: 'Storm', price: 500000 },
    celestial: { name: 'Celestial', price: 500000 },
    sakura: { name: 'Sakura Storm', price: 500000 },
    rain: { name: 'Rain Cloud', price: 800000 },
  },

  // Pet food: a bag is 3 servings, and nobody holds more than 100.
  food: { price: 100, servings: 3, max: 100 },
  // Toys: balls to drop in a pet room, your own pet's or the one you're
  // visiting on a Play Date. The pets there knock them about: each knock is
  // +`happiness` happiness for the pet that knocked it, and uses up 1 of the
  // ball's `durability` (the knocks it lasts); a worn-out ball is gone. One
  // of each kind at a time: another can be bought once it's worn out. The
  // server counts at most one knock a player every `knockEveryMs`
  // (backend/utils/catflix/toys.js).
  toys: {
    happiness: 5,
    knockEveryMs: 1000,
    balls: {
      beach: { name: 'Beach ball', price: 1000, durability: 10 },
      soccer: { name: 'Soccer ball', price: 2000, durability: 20 },
      basketball: { name: 'Basketball', price: 3000, durability: 30 },
      yarn: { name: 'Yarn ball', price: 10000, durability: 100 },
    },
  },

  // Pet room styles: Cozy is everyone's; the rest are bought once each.
  roomStyles: {
    cozy: { name: 'Cozy', price: 0 },
    cute: { name: 'Cute', price: 500 },
    gothic: { name: 'Gothic', price: 500 },
    punk: { name: 'Punk', price: 500 },
    scifi: { name: 'Sci-fi', price: 500 },
  },

  // The free egg: tap it this many times to hatch it.
  eggTaps: 100,

  // A pet's meters, 0 to 100. A new pet's start between these.
  meterMax: 100,
  startMeters: [35, 75],

  // Hunger: 100 is full. A feed adds `perFeed`; three feeds, or reaching
  // 100, keeps them full for `fullHours`, and after that hunger drops
  // `perHour`. Below `hungryBelow`, they lose 1 happiness an hour.
  hunger: { perFeed: 34, feedsToFill: 3, fullHours: 24, perHour: 4, hungryBelow: 15 },

  // Poop: one every `everyHours` (at most `max` in the room). Each one not
  // scooped up costs 1 happiness every `costEveryHours`.
  poop: { everyHours: 8, max: 5, costEveryHours: 2 },

  // Love: one meter for the owner, and one for each other player who has
  // cared for them. Below `ownerBelow` happiness, love for the owner drops
  // 1 an hour; below `othersBelow`, love for everyone else does. Others
  // only earn love while happiness is below `othersEarnBelow`.
  love: { ownerBelow: 50, othersBelow: 25, othersEarnBelow: 50 },

  // Care, by the owner or on a Play Date. A praise within `comboMinutes` of
  // a scold by the same player is a scold-then-praise.
  care: {
    feed: { hunger: 34, love: 1 },
    brush: { happiness: 1, love: 1 },
    scoop: { love: 1 },
    praise: { happiness: 1 },
    scoldThenPraise: { love: 2, happiness: 2, confidence: -1 },
    scold: { confidence: 2, happiness: -1 },
    comboMinutes: 10,
  },

  // A friend's cat that loves you: once a day (from 12:00 Helsinki), a cat
  // whose love for you is `loveAtLeast` or more, whose owner is your friend
  // (you follow each other), has a `chance` of stealing `share` of its
  // owner's PP (never P-PP) and giving it to you as P-PP. Both of you are
  // told (backend/utils/catflix/gifts.js).
  friendGift: { loveAtLeast: 80, chance: 0.05, share: 0.05 },

  // The Room Room: what pets do to each other there.
  //   play   both pets +1 happiness
  //   pet    the other pet +2 happiness and +1 confidence
  //   bully  if yours is the more confident: yours +1 confidence, both -1
  //          happiness; if not (or as confident): both -1 confidence and
  //          -1 happiness
  // Each action (and each kind of care on a Play Date) once an hour for
  // each pet; your own pet's care at home isn't limited.
  actionEveryMs: 60 * 60 * 1000,

  // The Room Room: 7 pets a room (yours included), each other one a
  // friend's half the time when there are friends' pets to choose from.
  room: { pets: 7, friendShare: 0.5, defaultMap: 'school' },
  maps: {
    theatre: { name: 'Theatre', indoor: true },
    graveyard: { name: 'Graveyard' },
    catpark: { name: 'Cat park' },
    school: { name: 'School' },
    cafeteria: { name: 'Cafeteria', indoor: true },
    christmas: { name: 'Christmas', snowy: true },
  },

  // Ruin Run: your pet runs through the ruined city, faster and faster.
  // You bet first (PP first, then P-PP): one of `bets`, or any whole
  // number up to `maxBet`. When the run ends, every 1% of speed above 100%
  // pays back `backPerPercent`% of the bet, with no cap: 150% speed gives
  // the bet back, 200% twice it, 300% four times it. Like Forrest Bounce,
  // `cashOutsPerDay` runs a play day (12:00 to 12:00 Helsinki) can be
  // cashed out; a run can be thrown away to keep the cash-out, and once
  // they're used it's free play (no bet, nothing paid) until 12:00. Every
  // run your pet finishes gives it +`confidence` confidence. The server
  // plays every run again to check it (backend/public/pet-forge/ruin-engine.js).
  // Like Forrest Bounce's, a cash-out goes out to the player's followers,
  // and to every member if it paid `bigWinTimes` the bet or more (350%
  // speed); a new best speed goes out to every member.
  ruinRun: { bets: [1, 10, 30, 50, 100], maxBet: 10000, backPerPercent: 2, cashOutsPerDay: 3, confidence: 1, bigWinTimes: 5 },

  // Nekomusume: Kitty Race: `racers` cats race, yours among them, and you
  // bet up to `maxBet` on it (PP first, then P-PP). Every cat has the same
  // chance; if yours wins you get `pays` times your bet (the bet back in
  // the coins it was paid in, the rest in P-PP). Race alone, against 9
  // house cats, or open a race your friends (members you follow who follow
  // you) can join, up to `racers` of you; house cats fill the rest. It
  // starts when the host says, or by itself `lobbyMinutes` after it opened.
  // Every race is on one of the `maps`, picked at random.
  // A share of every bet lost goes to the Box Office Scratch jackpots
  // (backend/config/jackpotFeed.js).
  kittyRace: {
    racers: 10,
    maxBet: 5000,
    bets: [10, 100, 500, 1000, 5000],
    pays: 10,
    lobbyMinutes: 5,
    // From the start: a moment for everyone's page to catch up, the 3 s
    // countdown, then the race (the winner finishes at 60 s, the last cat
    // by about 75 s).
    leadMs: 2000,
    countdownMs: 3000,
    raceMs: 78000,
    maps: {
      stadium: { name: 'Stadium' },
      river: { name: 'Riverside' },
      ruins: { name: 'Ruins' },
      theatre: { name: 'Theatre', indoor: true },
    },
    // The house cats' names.
    houseCats: ['Mochi', 'Tofu', 'Nori', 'Miso', 'Yuzu', 'Taro', 'Kiki', 'Momo', 'Sushi', 'Boba', 'Udon', 'Kuro', 'Shiro', 'Sora', 'Hana', 'Kinako'],
  },
}

// What a Ruin Run pays at `speed`% for a bet of `bet`: 2% of the bet for
// every 1% above 100, rounded down. 10 at 154%: 10 × 2 × 54 / 100 = 10.8 → 10.
export function ruinPayout(bet, speed) {
  const above = Math.max(0, Math.floor(speed) - 100)
  return Math.floor((bet * CATFLIX.ruinRun.backPerPercent * above) / 100)
}

export const RARITY_COLORS = { common: '#e8e8e8', uncommon: '#5fd35a', rare: '#3fa8ff', epic: '#b45cff', legendary: '#ff9f2e' }

// The rarity after `rarity` (the Spell Forge's), or null after legendary.
export function nextRarity(rarity) {
  const index = CATFLIX.rarities.indexOf(rarity)
  return index < 0 || index === CATFLIX.rarities.length - 1 ? null : CATFLIX.rarities[index + 1]
}

// A card's rarity, rolled from the odds. `random` gives 0 to 1.
export function rollRarity(random = Math.random) {
  let roll = random() * 100
  for (const [rarity, weight] of CATFLIX.odds) {
    if (roll < weight) return rarity
    roll -= weight
  }
  return 'common'
}

// ---- Weather ----
// The same for everyone, changing 6 times a day (every 4 hours, Helsinki
// time). Indoor maps have none; the Christmas map is only ever clear or
// snowy.
export const WEATHER_SLOT_HOURS = 4

// A number from 0 to 1, the same every time for `text`.
function hashUnit(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

// The weather on `map` in the 4 hours `slot` names ("2026-11-24#3": the
// Helsinki day and which 4 hours of it), or null indoors. The Christmas
// map: clear or snow, half and half. The rest: clear half the time, rain
// 30% and thunder 20% (they're drawn with no snow). `maps`: the Room
// Room's, or Kitty Race's tracks.
export function weatherFor(map, slot, maps = CATFLIX.maps) {
  const info = maps[map]
  if (!info || info.indoor) return null
  const roll = hashUnit(`${slot}|${map}`)
  if (info.snowy) return roll < 0.5 ? 'sunny' : 'snow'
  return roll < 0.5 ? 'sunny' : roll < 0.8 ? 'rain' : 'thunder'
}

// Which 4 hours `date` is in, in Helsinki: "2026-11-24#3".
export function weatherSlot(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}#${Math.floor(Number(parts.hour) / WEATHER_SLOT_HOURS)}`
}
