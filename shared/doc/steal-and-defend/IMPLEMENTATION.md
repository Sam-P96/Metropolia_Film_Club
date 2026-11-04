# Steal and Defend: how it's built

This is the companion to `STEAL_AND_DEFEND_SPEC.md`. It covers how the game is put together, where everything lives, how to change things, every place the build differs from the spec or fills a gap, and what's left for you to do.

---

## 1. Architecture

The game has five layers, from rules up to pages:

| Layer | Where | What it does |
|---|---|---|
| Numbers | `shared/steal/config.js` | Every tunable number, read by both the server and the pages |
| Item data | `backend/data/steal-and-defend-items.json` | The items. Nothing about an item lives anywhere else |
| Rules engine | `backend/games/steal/` | Plain functions with no database: formulas, rolls, the quiz, answer checking. Unit-tested |
| Services | `backend/utils/steal/` | Plays the game against MongoDB, using the engine |
| HTTP | `backend/controllers/stealController.js`, `backend/routes/stealRouter.js` | Reads requests and sends answers, mounted at `/api/steal` |

The pages are in `frontend/src/pages/Steal*.jsx`, with their components in `frontend/src/components/steal/`.

### Server-authoritative

The server does everything that decides an outcome:
- makes the questions and keeps their answers;
- runs the timers;
- checks each answer;
- does every roll;
- pays everything out;
- changes durability.

The page only shows what it's sent and posts answers.

The questions are stored on the attack when it starts, with their answers, which are never sent to the page. So refreshing or closing the tab can't re-roll anything.

Unanswered questions time out on the server in two ways:
- every time the attack is read (lazy catch-up);
- every 20 seconds in the sweep.

Either way they count as wrong, and the attack still resolves.

### Transactions

Paying out an attack touches several documents: both wallets, the attack and items.

- **Replica set** (MongoDB Atlas, or a self-hosted replica set): this all runs as one MongoDB transaction (`utils/steal/tx.js`).
- **Standalone MongoDB** (typical local dev): the same steps run one after another. It's fine for development.
- **Production**: use a replica set, as Double or Nothing already needs (see the README).

### Rules engine (`backend/games/steal/`)

| File | Contents |
|---|---|
| `items.js` | Loads and validates the items JSON. `combinedEffects()` adds up what a set of equipped items does |
| `rules.js` | Steal amount; success formula; rolls (success, Neuralyzer, crit, Cloak); fine bill; debt (`settleBill`); success payout; Wilson; prices; sell-back; follow-time penalty; shop roll; day and week boundaries |
| `quiz.js` | The 19 question generators (the spec's 20, minus division); quiz setup from items; building a quiz (mix, no repeats, types dropped once used up, Mind Stone, Funhouse shuffles); `isCorrect`; `publicQuestion` (what the page may see) |
| `answers.js` | Text normalising, similarity (edit distance), number parsing |

### Services (`backend/utils/steal/`)

| File | Contents |
|---|---|
| `attacks.js` | Who can attack whom; starting an attack (snapshot, freeze, durability, Cloak); the quiz state machine (`nextState`, `timeoutsUntil`, `catchUp`, `answerQuestion`); `resolveAttack`; the views for each role; public feed; history |
| `players.js` | PvP (read from the profile's PVP setting); the takeback when it goes off; classes, Warrior by default; the unfollow penalty |
| `inventory.js` | Items, equip and unequip, durability (`wear`), destroying, selling back, daily tickdown |
| `shop.js` | The daily listings and buying them |
| `market.js` | Player market, trade offers with escrow, gifts |
| `moderation.js` | Bans, flags, IP and device sightings |
| `upkeep.js` | Idle Infinity Stones, account deletion, data export |
| `tx.js` | Runs in a transaction where the database supports it, otherwise one step at a time |

---

## 2. Models

### New collections

| Model (file) | One document is | Key fields |
|---|---|---|
| `StealPlayer` (`stealPlayerModel.js`) | A member's game settings, made the first time they're needed. `_id` is the user id | `playerClass` (null means Warrior), `classChangedAt`, `equipped` ([{item, key}], max 3), `penalties` ([{victim, unfollows}]), `attackDay`/`attackCount` (claims today's attack in one step), `takebacks` (dates). Whether someone's in the game is `User.pvp`, not stored here |
| `StealItem` (`stealItemModel.js`) | One owned item | `owner`, `key` (the item's id in the JSON), `durability`, `maxDurability`, `originalPrice`, `state` (owned, listed or escrow), `unique` (a partial unique index guarantees one of each Infinity Stone), `acquiredAt` |
| `StealAttack` (`stealAttackModel.js`) | One attack, start to finish | The snapshot (`percent`, `netWorth`, `attempted`, `potentialFine`); `status` (quiz, resolving, done); `outcome`; `crit`; `stone`; `doomed`; `expiresAt`; classes and items at the start and end; `setup`; `questions` with their answers; `current`/`opensAt`/`closesAt`; `answers`; `rates`; `rolls`; `amounts`; `durability` changes; `immunityUntil` (Soul Stone); `takenBackAt` |
| `StealListing` (`stealListingModel.js`) | One daily shop listing | `day`, `slot` (unique together), `key`, `soldTo`, `price` |
| `StealMarket` (`stealMarketModel.js`) | A player-market listing | `seller`, `item`, `price`, `status`, `buyer` |
| `StealTrade` (`stealTradeModel.js`) | A trade offer, or a gift | `from`, `to`, `give` {items, pp, held}, `want` {items, pp}, `status`, `gift` |
| `StealFlag` (`stealFlagModel.js`) | One open admin flag per kind and set of members | `kind`, `users`, `details`, `count`, `status` |
| `GameBan` (`gameBanModel.js`) | One admin ban | `user`, `scopes`, `until` (null means permanent), `reason`, `by`, `liftedAt` |
| `DeviceSighting` (`deviceSightingModel.js`) | A hashed IP and device id seen for a player | 90-day TTL |

There's also a tiny `stealjobs` collection, used without a model. It records which shop day each daily job last ran for.

### Changes to existing models

All of these are additive; nothing existing is reset or rewritten.

- **`User.wallet.ppp`**: no longer `min: 0`, because a debt is negative P-PP.
- **`User.wallet.frozenUntil`**: new, and has no default, so wallets that never play don't change.
- **`User.lastLoginAt`**: new, also with no default.
- **`WalletTx.reason`**: nine new reasons (`stealWin`, `stealLoss`, `stealWilson`, `stealFine`, `stealFineWon`, `stealBuy`, `stealSell`, `stealTrade`, `stealTakeback`).
- **`WalletTx.steal`**: a new reference to the attack, listing or trade.
- **`Notification.type`**: four new types (`stealAttacked`, `stealResult`, `stealCrit`, `stealFlag`).
- **`Notification`**: new `stealAttack` and `stealFlag` references.

---

## 3. Config, items, and adding an item

### `shared/steal/config.js`

This holds every number the game runs on, with a comment on each:
- reset times;
- account age and the reviews needed to buy;
- follow hours and the 21-day cap;
- daily, weekly and per-victim limits;
- the percentages an attack can be for (`percents`: 1, 2, 3, 4, 5, 10, 20, 30, 40, 50);
- quiz length, mix, timers, network grace, points per answer, math range, typed-match threshold;
- the attack clamp and the defense cap of 75;
- crit chance, multipliers and the lore text;
- the base fine and the debt share;
- classes, and the default class (Warrior);
- inventory size and equip slots;
- shop size, tier chances and sell-back share;
- idle-stone months and trade expiry;
- flag thresholds;
- ban scope names;
- feed size.

The pages read it too, so How to Play always shows the real numbers.

### `backend/data/steal-and-defend-items.json`

This is your file. I added two fields to each entry:
- **`id`**: a stable key, in lowercase with dashes. Owned items store this key, so you can rename an item without breaking copies people already own.
- **`effects`**: what the item does, as numbers the engine reads. `effect` stays as the sentence players see.

### Adding or editing an item

1. Add an object to the JSON, or edit one. It has these fields:
   - `id`: unique, lowercase with dashes. Never change it once anyone owns one.
   - `name`
   - `type`: `"attack"` or `"defense"`
   - `tier`: Common, Uncommon, Rare, Epic or Legendary
   - `unique: true`, only for an Infinity Stone
   - `effect`: the text players see
   - `effects`: what it actually does
   - `durability`
   - `dailyTickdown`
   - `priceMultiplier`
2. Restart the backend. In dev, nodemon restarts by itself.
3. A broken entry is skipped with a line in the log, rather than taking the site down. `npm test` also checks that the shipped file loads.

An item only works on its own side: attack items when attacking, defense items when defending. Effect keys, and how two items with the same key combine, from `backend/games/steal/items.js`:

| Key | Type | Combines | Meaning |
|---|---|---|---|
| `attack` | number | sum | + attack rate |
| `defense` | number | sum | − attacker's rate |
| `fine` | number | sum | ± percentage points on a failed thief's fine (Paint Can +20, Getaway Car −30) |
| `redPill` | number | sum | − attack rate per wrong answer |
| `revenge` | number | sum | % of the attempted amount the failed thief also owes |
| `wilson` | number | sum | % of a robbed defender's loss given back |
| `extraDurabilityLoss` | number | sum | durability a failed thief's equipped items also lose |
| `fewerQuestions` | number | sum | victim questions removed |
| `timerBonus` | number | sum | seconds added per question |
| `retries` | number | sum | wrong answers that can be retried |
| `foggyQuestions` | number | sum | multiple-choice questions shown without their text |
| `fizzle` | number | sum | % chance the attack fizzles at start |
| `neuralyzer` | number | sum | % chance a successful roll fails anyway |
| `typedMatch` | number | max | typed-answer similarity needed (0–1) |
| `mathMax` | number | max | the biggest number in math questions |
| `critChance` | number | max | crit chance % |
| `defenseCap` | number | max | raises the 75 defense cap |
| `immunityDays` | number | max | days the robbed defender can't attack back |
| `reshuffleSeconds` | number | min | multiple-choice options reshuffle this often |
| `timerOverride` | number | min | seconds per question, whatever else says |
| `critImmune` | boolean | any | no crits against them |
| `seeDefenderItems` | boolean | any | attacker sees the defender's equipped items |
| `forceCrit` | boolean | any | every success is a crit |
| `noLoss` | boolean | any | defender loses nothing when robbed |
| `autoSuccess` | boolean | any | no quiz; the attack succeeds |
| `destroyDefenderItems` | boolean | any | with autoSuccess: destroys a stoneless defender's equipped items |

Any combination of these keys works with no code change. A genuinely new kind of effect needs code in `rules.js` or `quiz.js`, plus a new key here.

`backend/data/countries.json` holds the trivia countries:
- name, continent and capital;
- `aliases`, such as "UK" or "Holland";
- `also`, for transcontinental countries.

---

## 4. API (`/api/steal`)

Everything except `items` and `feed` needs a login.

Every POST and DELETE is refused for a member with an "All games" ban. These stay allowed so a ban never traps anyone's points or items:
- selling back and unequipping;
- cancelling a listing;
- cancelling or declining an offer.

PVP itself isn't a game route: it's the profile's setting (`PATCH /api/users/me { pvp }`), which a games ban doesn't touch.

| Method and path | What it does |
|---|---|
| GET `/items` | Every item definition |
| GET `/feed` | Public feed of successful steals |
| GET `/status` | `{ pvp, playerClass }` for the Games card and Edit profile |
| GET `/me` | Hub: player, wallet (with freeze), inventory, equipped, attack status today and this week, incoming attacks, trades waiting, bans, isAdmin |
| GET `/pvp/takeback` | What turning PVP off would take back: `{ steals, owed }`, for Edit profile's warning |
| POST `/class` | `{ playerClass }`. The first change from Warrior any time, then once per week |
| POST `/items/:id/equip`, `/unequip`, `/sell` | Equip, unequip, sell back |
| GET `/targets` | Everyone they follow: available or not, the reason, follow progress, and the amount at each % |
| POST `/attacks` | `{ victim, percent }`. Starts an attack and returns its view |
| GET `/attacks/:id` | The attack as this member sees it (catches up timeouts first) |
| POST `/attacks/:id/answer` | `{ index, answer }`. Returns `{ right, retry, attack }` |
| GET `/history` | Their last 20 attacks, either side |
| GET `/shop` | Today's 9 listings at their prices, and `nextRefreshAt` |
| POST `/shop/:id/buy` | Buy a listing |
| GET `/market` | Open player-market listings |
| POST `/market` | `{ item, price }` |
| DELETE `/market/:id` | Take a listing down |
| POST `/market/:id/buy` | Buy a listing |
| GET `/trades` | Incoming, outgoing and recent offers |
| POST `/trades` | `{ to, giveItems, givePp, wantItems, wantPp }` |
| POST `/trades/:id/accept`, `/decline`, `/cancel` | Answer an offer, or take one back |
| POST `/gifts` | `{ to, item }` |
| GET `/players/:id/items` | Another member's items, for asking in a trade. Never says which are equipped |
| GET `/admin/flags?status=open\|dismissed` | Admins only |
| POST `/admin/flags/:id/dismiss` | Admins only |
| GET `/admin/bans` | The Ban List (active bans). Admins only |
| POST `/admin/bans` | `{ user, scopes, days, reason }`. `days` null or empty means permanent. Admins only |
| DELETE `/admin/bans/:id` | Unban. Admins only |
| GET `/admin/attack-reset` | When the steal timer was last reset, and by whom. Admins only |
| POST `/admin/attack-reset` | Reset the steal timer: every steal limit starts over (attacks and victims alike). Admins only |

A refusal is `{ error, code }`. The codes are `PVP_OFF`, `TOO_NEW`, `IN_DEBT`, `ATTACKING`, `USED_TODAY`, `UNAVAILABLE`, `SOLD`, `FROZEN`, `LOCKED`, `EQUIPPED`, `INVENTORY_FULL`, `SLOTS_FULL`, `CLASS_LOCKED`, `BANNED`, `MOVED_ON`, `NOT_OPEN` and `ALREADY_ANSWERED`. Saving the profile with PVP off during an attack is refused with `IN_ATTACK`. A successful save that turned PVP off returns `stealTakenBack`.

---

## 5. How a game runs

### Starting an attack (`startAttack`)

1. **Checks.** The attacker:
   - has PvP on, isn't banned from stealing, is 12+ days old and isn't negative;
   - has no attack going and hasn't used today's.

   The victim:
   - has PvP on and isn't banned from all games or the site;
   - has a net worth above 0;
   - has been followed for long enough, counting penalties;
   - wasn't attacked by this attacker this week;
   - is under the 2-a-day and 3-a-week success caps;
   - isn't protected by a Soul Stone used on this attacker.
2. **Claim the day's attack.** This is one conditional update on `StealPlayer`, so a double click can't start two.
3. **Snapshot.**
   - Net worth, and `attempted = ceil(% × net worth)`.
   - An estimated fine, from current items.
   - Both players' classes.
   - Both sides' equipped items.
4. **Build the quiz.**
   - Quiz-shaping defense items are read now: Motion Sensor, Spinning Top, Funhouse Mirror, Babel Fish, Time Stone, Mind Stone.
   - With a Power or Soul Stone there's no quiz, and only stones count on either side.
5. **Freeze and wear.**
   - Both wallets' `frozenUntil` is set to the attack's latest possible end: (questions + retries) × (3 s + timer + 1.5 s grace), plus 30 s.
   - The attacker's attack items lose 1 durability.
6. **Notify the defender**, with a notification and a live socket event.
7. **Cloak roll.** If it fizzles, resolve now as a fizzle. A Power or Soul Stone also resolves now.

### The quiz

The first question opens 3 s after the start. Each question is open from `opensAt` to `closesAt`, and an answer is accepted up to 1.5 s late.

After each answer:
- A right answer, or a wrong one with no DeLorean retry left, moves to the next question, which opens 3 s later.
- A wrong answer, or a timeout, with the DeLorean unused gets the same question again, with a fresh timer after the countdown.

Timeouts are applied whenever the attack is read, and by the sweep. Once every question is done, it resolves.

### Resolving (`resolveAttack`)

Resolution runs once: the first caller claims it by moving `quiz` to `resolving`.

1. **Read the defender's items** equipped right now.
2. **Work out the outcome** (spec §8.1–8.2):
   - fizzle, or
   - the success formula, then a doomed check, the roll, the Neuralyzer and the crit (Plot Armor blocks it; the Space Stone forces it).
3. **On success:**
   - The victim pays up to the attempted amount, PP first.
   - The thief is paid the gain as P-PP: crit and Rogue extras are newly made.
   - Wilson gives the victim back 25% of what they actually lost.
   - A Soul Stone sets `immunityUntil`.
   - The Power Stone destroys a stoneless defender's equipped items.
4. **On failure:**
   - The bill is the fine plus the Revenge Dagger, if any.
   - The thief pays all they have. 25% of the rest becomes debt (negative P-PP), and the rest is forgiven.
   - The defender gets what was paid, up to their share. The Rogue's extra 5% goes to nobody.
   - The Hattori Hanzo Katana wears the thief's equipped items down.
5. **Durability.**
   - The defender's equipped defense items lose 1.
   - So do quiz-shaping items that were on at the start but swapped out since.
   - Anything at 0 breaks: it's deleted, unequipped and taken off the market.
6. **Doom.** Any other attack on this victim still being played is marked `doomed`, so it will fail with the normal fine. Fizzles and doomed attacks don't doom others.
7. **Unfreeze.** Each player's freeze is worked out again from whatever attacks they're still in.
8. **Afterwards** (after commit):
   - result notifications to both players;
   - the site-wide crit notice;
   - flag checks;
   - live socket events.

### Turning PVP off (`takeBackSteals`)

This runs from `updateMe` in `userControllers.js` when a profile save turns PVP off, before anything is saved.

- It's refused while an attack they're in is being played, so the profile isn't saved either.
- Every steal since Monday 12:00 is claimed with `takenBackAt`, and its gains are taken back, with the debt rule if they can't cover them.
- Victims are paid back their net loss (lost minus Wilson), oldest first, out of what was recovered.
- Their items are unequipped, then the profile is saved with PVP off.

---

## 6. Scheduled jobs (`backend/jobs/stealSweep.js`)

`app.js` starts it once the database is connected. First it creates the game's collections and indexes.

| When | What |
|---|---|
| Every 20 s | `sweepAttacks`: questions past their time move on, and finished quizzes resolve |
| 12:00 Helsinki, and on every server start | `ensureShop` makes today's 9 listings. Each job below runs only once per shop day, claimed in `stealjobs` |
| | `dailyTickdown`: equipped items with `dailyTickdown: true` lose 1 (no item has it yet) |
| | `reclaimIdleStones`: Infinity Stones whose holder hasn't logged in for 3 months are removed, and offers holding them are cancelled |
| | `expireTrades`: offers older than 7 days are cancelled and their escrow handed back |

No job is needed for the daily and weekly limits, the weekly class change, temporary ban expiry or the Soul Stone's week. Each is worked out from timestamps against the last 12:00 or Monday 12:00, the way Double or Nothing works out its Monday reset. The shop also makes the day's listings the first time anyone opens it, in case the 12:00 job didn't run.

---

## 7. Wallet, notifications, moderation

### Wallet (`backend/utils/wallet.js`)

`changeWallet` is still the one place a wallet changes.

**The freeze:**
- It refuses any change that takes points away while `frozenUntil` is in the future, unless Steal and Defend itself passes `steal: true`.
- This covers bets in every game, gifts, the slot machine's credits, the shop and trades.
- Points coming in still go through.
- The update's filter includes `frozenUntil`, so a bet racing against an attack's start can't slip through.

**Debt:**
- Only `allowDebt` (fines and takebacks) can push P-PP below 0.
- Any P-PP coming in pays it off, because it's added to the same number.
- `payEveryone` (12:00) pays debt off first, then pays PP up to the cap as before.

### Notifications

| Type | Who | What |
|---|---|---|
| `stealAttacked` | Defender | Deleted when the result arrives |
| `stealResult` | Attacker and defender | Failures go to nobody else |
| `stealCrit` | Every member | Shown in gold like the slot machine's jackpots, and in every Notifications filter |
| `stealFlag` | Admins | |

All except `stealFlag` make the bell blink red, like other game notifications.

Live alerts use the existing socket.io server: `announceSteal` in `games/farkle/live.js` emits `steal:attack` to the member's own room. `StealAlert`, mounted in `App.jsx` outside the nav bar, shows "Someone is attacking you!" on any page.

### Moderation

- **Flags.** One open flag per kind and set of members. A repeat adds to its count. Admins are notified once, when it opens.
- **Bans.** Scopes stack:
  - "All games" covers stealing, buying and trading.
  - "Site-wide" covers everything: login is refused, and every logged-in request gets a 403, except downloading or deleting your own data.
  - "All games" also refuses the other games' play routes (`middleware/gameBans.js`, mounted in `app.js`). The slot machine's cash-out and collecting a scratch card still work.
- **Sightings.**
  - Every request from the frontend sends `X-Device-Id`, a random id kept in localStorage.
  - For members with PVP on, an HMAC of the IP and of that id is stored. It's recorded at login, when PVP is turned on, on attacks, and on trades, listings and gifts.
  - Alt flags compare these hashes over the last 30 days.

- **Steal timer reset.** An admin can start every steal limit over (`resetAttacksForEveryone` in `attacks.js`):
  - The moment it's pressed is stored in `stealjobs`, as `attacksReset`, with the admin's id.
  - Every limit then counts from that moment, not from 12:00 or Monday 12:00 (`limitWindows`): the attack a day, each victim once a week, and a victim's 2-a-day and 3-a-week caps. So everyone can steal again, and be stolen from again.
  - The stored per-day claims (`StealPlayer.attackCount`) go back to 0.
  - Soul Stone protection and follow times aren't reset.

Account deletion (`forgetStealPlayer`):
- deletes the attacks they were in, lifting the other player's freeze if one was being played;
- cancels their trades, refunding the other side;
- deletes their items, so their stones go back to the pool;
- deletes their player settings, sightings, flags and bans.

The data export includes `stealAndDefend`.

---

## 8. Frontend

| Route | Page | Contents |
|---|---|---|
| `/games` | `Games.jsx` | New card: Sword VS Shield, or the text "Require PvP" when the viewer's PvP is off |
| `/games/steal-and-defend` | `StealAndDefend.jsx` | Intro: logo, title, description, Play, How to play. Play with PvP off shows "Requires you to turn on PvP from your profile page" |
| `/games/steal-and-defend/play` | `StealHub.jsx` | Points, incoming-attack warning, freeze, debt and ban notices, trades waiting, targets (pick %, start), equipped slots and inventory, history, class, attack status, public feed |
| `/games/steal-and-defend/shop` | `StealShop.jsx` | 9 listings at your prices, countdown to 12:00 |
| `/games/steal-and-defend/market` | `StealMarket.jsx` | Player market, trades, sell form, gift form, trade-offer form |
| `/games/steal-and-defend/attacks/:id` | `StealAttack.jsx` | Quiz for the attacker, "under attack" view for the defender, result for both |
| `/games/steal-and-defend/admin` | `StealAdmin.jsx` | Flags (open or dismissed), the steal-timer reset (one button, two confirmations), the ban form, the Ban List with Unban |

**The quiz screen** is a fixed layer under the sticky nav bar, with the page's gradient as its own opaque background, so the footer never shows through. It locks page scroll while it's showing, so it never scrolls on a phone, and the nav is untouched.

It's sized to the visible part of the screen (the visual viewport) below the nav, so on a phone with the keyboard up it fits in the space above the keyboard:
- the layout tightens and moves to the top, under the timer;
- the answer box scrolls itself back into view whenever that space changes;
- it stays read-only rather than disabled while an answer is sent, so the keyboard doesn't drop and jump the screen.

If a question is too long to fit, only the question area scrolls, rather than clipping. It also has:
- a big timer;
- the 3-second countdown, with right or wrong after each answer;
- server-time-corrected deadlines.

**Edit profile's PVP switch** is the game's switch too, saved with the form's Save as before. Its description now mentions Steal and Defend. Under it, `StealPvpNote.jsx` shows:
- with PVP on: the member's class, and the IP and device hashing;
- with PVP switched off but not yet saved: what saving will take back, and that it can't be done mid-attack.

**King Loan Shark** has a profile picture, `frontend/src/assets/Onsen_Shark.webp`, framed on the shark's head (`components/steal/KingLoanShark.jsx`). His crit message shows with it, as a message from him, in three places: the result screen on a Critical Hit, the gold Critical Hit notification, and How to Play.

**The backdrop** of every Steal and Defend page fades from the club's purple into an orange glow (`STEAL_FADE` in `components/steal/style.js`).

The nav bar is not changed.

---

## 9. Tests

From `backend/`, against the local test database (`kino_test` is wiped by the tests):

```
MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test MONGO_URI= npm test
```

There are two test files:
- **`tests/steal.test.js`** (53 tests, no database):
  - the items file;
  - the success formula, including the spec's 70% example;
  - rolls: Neuralyzer, crits, Two-Face, Plot Armor, Space Stone, Cloak;
  - crit multipliers and payouts, including Rogue, Reality and Wilson;
  - steal amounts;
  - fines and debt, including the spec's 75% and −20 examples;
  - prices and sell-back;
  - follow penalties;
  - the shop roll (40/30/20/9/1, stone uniqueness, all stones out means Epic);
  - reset times in summer and winter;
  - answer checking;
  - quiz building.
- **`tests/stealFlow.test.js`** (29 tests, real MongoDB through the routes):
  - PvP gate, PVP from the profile with Warrior by default, PVP refused off mid-attack, class changes, target reasons, account age;
  - a full success with the freeze;
  - failure into debt, and the payout paying it off;
  - simultaneous attacks, timeouts;
  - Cloak, Power, Reality, crits;
  - PvP-off takeback, the unfollow penalty;
  - shop single purchase, equip rules, sell-back;
  - trades with escrow, decline, market, gift flag, stone uniqueness;
  - bans and Unban, site-wide ban, the admin's steal-timer reset, account deletion.

The whole backend suite: 277 pass, 0 fail, and 33 skipped (the Double or Nothing and Slot Machine tests, which need a replica set).

---

## 10. Changes from the spec

Each is a gap I filled or a place I chose differently, with the reason.

### Setup and data

1. **Files are in `shared/doc/steal-and-defend/`**, not `docs/`. The spec was already there, so this file is next to it. The items JSON moved to `backend/data/` as asked.
2. **One PvP switch, and everyone is a Warrior by default** (your call, after the first build had a separate switch).
   - The profile's PVP setting is the game's switch: with PVP on you're in Steal and Defend, and you can't be out of it while PVP is on.
   - There's no class to pick when it goes on. Everyone is a Warrior (`STEAL.defaultClass`) until they change class from the hub. The first change can be made any time, then once a week.
   - Members who already had PVP on for dislikes are in the game from launch, as Warriors. Their turning PVP off gets the takeback and the mid-attack refusal from spec §12.
3. **Items JSON gained `id` and `effects`.** The rule "don't hardcode item stats elsewhere" means the numbers in the effect text needed a machine-readable home. Ids keep owned items working if you rename an item.

2a. **Steals go up to 50%** (your call): 1, 2, 3, 4, 5, 10, 20, 30, 40 or 50% of the victim's net worth, instead of the spec's whole number from 1 to 5.
   - The spec's crit multipliers only cover 1–5%. I carried on the same ×0.25 per step up the list: ×3.25 at 10%, ×3.5 at 20%, ×3.75 at 30%, ×4 at 40% and ×4.25 at 50%. Carrying on the spec's per-percent rate instead would give ×14.25 at 50%.
   - The fine is still 80% of whatever was attempted, so a failed 50% attempt is a fine of 40% of the victim's net worth.
   - Both lists are in `shared/steal/config.js` (`percents`, `crit.multipliers`). Every percentage needs a multiplier; a unit test checks that.

2b. **Admins can reset the steal timer for everyone** (your call; not in the spec). It's one button with two confirmations on the admin page. Every steal limit starts over: everyone gets their attack back, anyone can be attacked again by someone who already did this week, and capped victims can be robbed again. Soul Stone protection and follow times are item and follow rules, not timers, so they stay.

### Wallet and limits

4. **Debt is negative P-PP**, with PP at 0, rather than a separate field.
   - Net worth stays PP + P-PP, as the leaderboard already computes it, so a −20 shows as −20.
   - Any P-PP coming in pays debt off with no special code.
   - The 12:00 payout was changed to pay debt first. Otherwise a member at their PP cap could never climb out.
   - The payout notification counts the debt paid.
5. **The freeze lives on the wallet** (`frozenUntil`) and is enforced in `changeWallet`, so every game respects it without being changed. It ends by itself at the attack's latest possible end, so a crash can't leave anyone frozen. Points coming in aren't blocked, only spending.
6. **Daily and weekly limits are worked out from timestamps**, not reset jobs. This matches Double or Nothing and can't drift if the server is down at 12:00.

### Attacks and items

7. **Items only work on their own side**: attack items when you attack, defense items when you defend.
8. **When the defender's items count.** The spec says they're read at resolution. The quiz-shaping ones are read at the start, because they shape a quiz that's already made: Motion Sensor, Spinning Top, Funhouse Mirror, Babel Fish, Time Stone and Mind Stone, plus the Cloak, which the spec already puts at the start. They still lose durability at the end, even if swapped out mid-attack; otherwise a defender could use a Time Stone and unequip it for free.
9. **Classes are read when the attack starts.** The spec doesn't say. This stops a defender switching to Warrior mid-attack.
10. **The "potential fine" at the start is an estimate.** The fine charged uses the attempted amount from the snapshot, but the defender's items at the end, since the Paint Can can be swapped in, as the spec allows.
11. **The Space Stone.** The item text says "ignores all non-stone items"; spec §11 says "forces a crit and ignores Plot Armor". I read both as: nothing that isn't a stone can stop its crit. It doesn't strip the defender's other items, which would make it nearly a Power Stone.
12. **Power and Soul Stones ignore non-stone items on both sides.** That includes the attacker's Two-Face's Coin, so crits stay at 5%. Class bonuses, which aren't items, still apply: a Rogue still gets +20%. Durability still ticks as normal.
13. **Simultaneous attacks.** A fizzle doesn't doom other attacks, since it "fails before the quiz", and a doomed attack doesn't doom the next one. Success, failure and Neuralyzer do doom others.
14. **A robbed victim can't go into debt.** They lose at most what they have; the freeze makes a shortfall nearly impossible anyway. The thief is still paid in full, since the extras are created money already.
15. **Partial payment of a fine** goes to the defender first; the Rogue's burned 5% comes last.
16. **PvP-off takeback.**
    - Victims get back their net loss: lost minus Wilson's refund, which was created money.
    - They're paid only from what was actually recovered, oldest steal first, the same as §8.5's "the defender only receives what was actually paid".
    - Items are unequipped, since equipping needs PvP on.
17. **The DeLorean** triggers automatically on the first wrong or timed-out answer. There's no reason to decline it.
18. **Right or wrong is shown after each answer** during the countdown, and the result screen lists every question with its right answer, for the attacker only.
19. **1.5 s network grace** on each question, so an answer sent at 9.9 s isn't lost in transit. The next question opens 3 s after the deadline.
20. **The Funhouse Mirror.** The server works out every reshuffle and the page shows them. Answers are sent by option id, so the reshuffle is visual: nothing can stop a modified browser ignoring it.

### Quiz content

20a. **No division questions** (your call). Math is multiplication only: question 14 in the spec is gone. Each quiz still has 2 math questions, both multiplication. The Spinning Top's text now says "up to 30 x 30". Number answers can still be compared at a set number of decimals, in case division questions are ever brought back.

21. **Victim questions respect privacy.**
    - If the attacker couldn't see the victim's profile (private, or friends-only without being friends), the questions only use the victim's reviews, which show site-wide anyway.
    - "Who did they follow most recently?" only appears if the victim's Following list is open to the attacker.
    - Otherwise the quiz would leak private data.
22. **"Movies from TMDB" trivia** uses the club's own film logs, which hold TMDB data copied at log time, instead of live TMDB calls. It's fast and doesn't spend TMDB quota.
23. **Original titles.** "Name a film they rated x/5" fetches TMDB's original title for those films. `tmdbService` now returns `originalTitle`. It gives up after 2.5 s, so a slow TMDB can't hold up an attack.
24. **Countries.**
    - Disputed or ambiguous capitals are left out of the capital question: Israel, Palestine, Bolivia, Sri Lanka, Taiwan, Kosovo and Nauru.
    - Transcontinental countries count for both continents.
    - Letter questions only accept names that really start or end with that letter, so "Holland" doesn't answer "starts with H".
25. **Typed answers** are also compared with spaces removed, so "spiderman" matches "Spider-Man".

### Shop, market and trades

26. **Player market purchases** need 5 reviews, like the shop, and the buyer must not be banned from buying or trading.
27. **Other players' inventories are visible**, so trades can ask for items, but never which items are equipped. That stays the Marauder's Map's job.
28. **Selling an equipped item is refused**: unequip it first. While frozen, a player can't sell, list, buy or trade. A defender can still equip and unequip, as the spec requires.
29. **Trade offers expire after 7 days** (config) and their escrow goes back. The spec doesn't say.
30. **No notification for trade offers.** The spec's notification table has none, so the hub shows how many offers are waiting.
31. **Gifts are instant**, with nothing to accept. Escrow-returned PP goes back exactly as it came out (PP as PP, P-PP as P-PP), since it's the sender's own money; PP paid to the other side arrives as P-PP.
32. **Suspicious trades** are flagged when items go one way and PP the other at ≤ 2% or ≥ 50× of the items' original shop prices. Gifts of Epic or Legendary items are flagged too.

### Moderation

33. **Admins only.** The spec says "admin", so the flags, bans and the admin page are for admins, not moderators. The existing Ban Hammer stays as it is for moderators.
34. **Banned members can't be targeted.** A member with an active "All games" or "Site-wide" ban can't be attacked.
35. **What bans leave open.** A banned member can still take points and items out of play (cash out, sell back, cancel, turn PvP off), and a site-banned member can still download or delete their data (GDPR).
36. **IP and device logging** is only for members with PVP on, stores HMAC hashes rather than raw IPs, and is deleted after 90 days.
37. **Idle stones.** "Inactive for 3 months (no login)" uses a new `lastLoginAt`, set at each login. Members who haven't logged in since it was added count from when they got the stone.

### Infrastructure

38. **Transactions when the database supports them.** Production gets atomic payouts, while local development on a standalone MongoDB still works.
39. **Daily jobs also run on startup.** They're claimed once per shop day, so a server that was down at 12:00 catches up and nothing runs twice.
40. **Account deletion** deletes the attacks the member was in rather than keeping half-blank records. That means the other player's history loses them too.

---

## 11. Unfinished, or needs you

- [ ] **Privacy policy.** Add the Steal and Defend IP and device hashing to `frontend/src/pages/Privacy.jsx`, and bump `PRIVACY_POLICY_VERSION` in `backend/controllers/userControllers.js` if you want members to re-consent. Suggested wording:
  > "If you turn on PVP, we keep a one-way hash of your IP address and of a random id stored in your browser, each time you log in or play, for 90 days. We use them only to spot one person playing from several accounts. We never store the IP address itself."
- [ ] **King Loan Shark's picture is 573 KB.** It loads wherever his message shows. A small square crop of the shark's head (say 256 × 256, a few KB) would load faster. Drop it in as `Onsen_Shark.webp` and set the framing in `KingLoanShark.jsx` to `backgroundSize: 'cover'`, `backgroundPosition: 'center'`.
- [ ] **Logo art.** The Sword VS Shield logo is hand-drawn inline SVG (`components/steal/StealLogo.jsx`). Swap in real art if you have some; the ivory-tile layout matches the other cards.
- [ ] **Look at it in a browser.** I built and linted the frontend, and every backend route is covered by the integration tests, but I haven't opened the pages in a browser. Check these at phone width especially: the quiz screen, the hub layout, and the profile switch.
- [ ] **Production database.** Make sure production runs as a replica set (Atlas does), so payouts are atomic. Without one, the game still works, but a crash mid-payout could leave an attack half paid.
- [ ] **Balance.** The item prices, durability and tier chances are exactly as specified; play-test them. Every number is in `shared/steal/config.js` and the items JSON.
- [ ] **Existing PVP members.** Everyone who already had PVP on for dislikes is in Steal and Defend from launch, as a Warrior. You may want to announce it before deploying.
- [ ] **Live alerts after a login from before this.** The pop-up alert reads PVP from the stored login. A member who turned PVP on in an older session sees it after their next login or profile save; until then they still get the notification and the red bell.
- [ ] **King Loan Shark's loans** (spec §8.5, "once loans exist") aren't part of this build.
- [ ] **No reason given for a doomed attack.** It's stored as `doomed: true` and shows only as a normal failure, as the spec wants.
- [ ] **Commit.** Nothing is committed. The work is in the working tree on `feat/resonance`; you may want a `feat/steal-and-defend` branch for it.
