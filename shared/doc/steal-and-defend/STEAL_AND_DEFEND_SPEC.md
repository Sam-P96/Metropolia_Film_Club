# Steal and Defend — Game Spec (prototype name)

A PvP game for the kinokaverit.com film club site. Players follow other members, then try to steal a percentage of their net worth by winning a timed quiz. Defenders protect themselves with items bought from a daily shop.

All times are **Europe/Helsinki**. "Daily reset" = **12:00** every day (same time as the daily PP payout). "Weekly reset" = **Monday 12:00** (same time as Double or Nothing).

Item data lives in `steal-and-defend-items.json` (see §10).

---

## 1. Site constraints

- **Never change or add to the site's existing nav bar.** New pages use it as it is.
- Match the look and structure of the other club games:
  - Games page card, then an intro page (title, description, **Play**, **How to Play**), then the game.
- **Games page card logo:** Sword — "VS" — Shield, in the same style as the other game cards.
  - If the viewer has PvP turned off, the card shows the text **"Require PvP"** instead of the logo.
- Opening the game with PvP off shows: **"Requires you to turn on PvP from your profile page"**.
- Quiz screen must not scroll on mobile.
- Stack: React/Vite/Tailwind frontend, Express backend, MongoDB, TMDB for film data.

## 2. Currency rules (existing site rules, unchanged)

- **Net worth** = PP + P-PP (the same total the PP leaderboard uses).
- **Daily PP** = 1 PP per review the user has posted in total.
- **Spending order:**
  - Losses and spending come out of PP first, then P-PP.
  - Money a player receives from this game (steals, fines, refunds) is paid as **P-PP**.
- **Rounding:** every amount rounds **up** to the nearest 1 PP, and is never less than 1 PP.

## 3. Eligibility

| Action | Requirement |
|---|---|
| Take part at all (attack or be attacked) | PvP turned on in profile settings. **PvP is off by default.** |
| Attack | Account at least **12 days** old; balance not negative; following the victim long enough (§4); daily steal not used yet (§5) |
| Be targeted | PvP on; net worth above 0; not capped for the day/week (§5) |
| Buy items from the shop | **5+ reviews** posted; balance not negative |
| Choose a class | PvP on (§9) |

## 4. Following

- "Following" = the existing **Follow** button on a user's profile.
- You must have followed the victim continuously for **72 hours** before you can attack them.
- Unfollowing and re-following restarts the timer from 0.
- **Unfollow penalty (per victim):**
  - Applies only if you have successfully stolen from that person.
  - Each time you then unfollow them, your required follow time for that victim doubles: 3 → 6 → 12 → 21 days.
  - It caps at **21 days** and **never resets**.
- If you never stole from them, unfollowing just resets the timer. There's no doubling.

## 5. Limits and resets

**Attacker**
- **1 attack attempt per day**. Success, failure or fizzle all count. Resets at the daily reset.
- **Each victim once per week**. Success or failure both count. Resets at the weekly reset.

**Victim**
- Can be **successfully** stolen from at most **2 times per day** and **3 times per week**.
- Failed attacks (including fizzles and Neuralyzer) do not count toward the victim's cap.

**Simultaneous attacks**
- If two attacks on the same victim are in progress, the **first to complete** resolves normally.
- Any attack still in progress on that victim then has a **100% failure rate**. There's no explanation shown, and the normal fine applies.

**Example**
1. Monday: you steal from Sam and succeed. You can't attack anyone else today.
2. Tuesday: you attack Tara and fail. You pay the fine.
3. You can't attack Sam or Tara again until next Monday 12:00. On Wednesday you can attack Saga.

## 6. Attack flow

1. **Pick the victim.** The target list shows people you follow, with timer progress. Unavailable targets are greyed out with the reason (follow time not met, already attacked this week, capped, PvP off, net worth 0 or below).
2. **Pick the steal %.** A whole number from **1% to 5%** of the victim's net worth.
3. **Start.** At this moment:
   - **Snapshot:** the steal amount and the potential fine are calculated from the victim's net worth.
   - **Freeze:** both players' balances are frozen until the attack resolves. Neither can spend PP, trade, or bet in other games.
   - **Defender can still swap items.** They can change equipped items until the attacker finishes the quiz.
   - **Attacker items lock.** The attacker can't change items during the attack.
   - **Attacker items lose durability:** each of the attacker's equipped attack items loses 1 durability.
   - **Defender is notified** that an attack has started.
   - **Invisibility Cloak roll:** if the defender has the Invisibility Cloak equipped, there's a 20% chance the attack fizzles here. It counts as a failure with no fine.
4. **Quiz** (§7). Skipped entirely by the Power Stone and the Soul Stone.
5. **Resolve** (§8):
   - The defender's equipped items are read at this moment.
   - Each of the defender's equipped defense items loses 1 durability.
   - The result is shown to both players.
6. **Server-authoritative.** Questions, timers, answer checking and all rolls happen on the server.
   - Refreshing or closing the tab never re-rolls anything.
   - Unanswered questions count as wrong, and the attack still resolves.

## 7. The quiz

### Format

**Length**
- **10 questions**, or 9 if the defender has Motion Sensor.
- There's a **3-second countdown** between questions.

**Timer per question**
- **10 seconds** by default.
- Heist Blueprint: **13s**.
- Time Stone: **5s**, which ignores Heist Blueprint.

**Mix**
- **6 victim questions, 2 math, 2 trivia.** With Motion Sensor, it's 5 victim questions.
- If there aren't enough possible victim questions, the empty slots are filled randomly with math and trivia. A victim with no data gets all math and trivia.

**No repeats**
- The same question (same type + same subject, e.g. "How did they rate X-Men?") never appears twice in one attack.
- When a question type runs out of possible questions, it is removed from the pool **for this attack only**.

**Scoring**
- Each correct answer = **+10% attack rate**.

### Question types

**Victim questions.** These use the victim's site data. Skip any whose requirement isn't met.

| # | Question | Input | Requirement / generation rule |
|---|---|---|---|
| 1 | Their nth most watched genre | Multiple choice (4) | n is within their top 10, or within their genre count if fewer than 10; 2+ genres |
| 2 | How did they rate [movie]? | Multiple choice (4) | 1+ rating |
| 3 | Which of these have they NOT watched? | Multiple choice (4) | 3+ rated movies |
| 4 | Their average rating? | Multiple choice (4, options at least 0.3 apart) | 3+ ratings |
| 5 | Which year have they watched the most films from? | Multiple choice (4) | 3+ movies; release year |
| 6 | Who did they follow most recently? | Multiple choice (4, with avatars) | Follows 1+ person; 3 other users as decoys |
| 7 | How many [genre] movies have they watched? | Number | 1+ movie |
| 8 | Name a movie they rated [x]/5 | Typed | Only uses ratings they've actually given; any matching movie is correct |
| 9 | Which of these is their highest rated? | Multiple choice (4) | 4+ ratings, no tie at the top |
| 10 | Which of these is one of their favourite films? | Multiple choice (4) | Favourites set on profile |
| 11 | Which movie did they review most recently? | Multiple choice (4) | 4+ reviews |
| 12 | How many reviews have they posted? | Number | 1+ review |

**Math questions**

| # | Question | Input | Rule |
|---|---|---|---|
| 13 | Multiplication | Number | Both numbers 1–20 (1–30 with Spinning Top) |
| 14 | Division | Number | Both numbers 1–20 (1–30 with Spinning Top); answer rounded to 2 decimals |

**Trivia questions**

| # | Question | Input | Rule |
|---|---|---|---|
| 15 | Name a country in [continent] | Typed | Any country on that continent |
| 16 | Name a country starting with [letter] | Typed | Only letters with 3+ valid countries |
| 17 | Name a country ending with [letter] | Typed | Only letters with 3+ valid countries |
| 18 | What's the capital of [country]? | Multiple choice (4) | |
| 19 | What year was [movie] released? | Multiple choice (4) | Movie from TMDB |
| 20 | Which of these came out first? | Multiple choice (4) | Movies from TMDB |

### Answer checking

**Number answers**
- Accept `.` or `,` as the decimal separator.
- Trailing zeros are optional: `1.5` = `1.50` = `1,5`, and `1` = `1.0` = `1,00`.
- Division answers are compared at 2 decimals.

**Typed answers**
- Normalise before comparing: lowercase, strip punctuation, ignore a leading "The".
- Correct if **80%+ similar** (90% with Babel Fish) to **any** valid answer.
- Movie titles accept both the English title and the original TMDB title.

**Multiple choice**
- Options are shuffled.
- Funhouse Mirror reshuffles them every 2 seconds.
- Mind Stone replaces one multiple-choice question's text with *"Your mind feels foggy, choose an answer."* The options and the correct answer stay those of the real question.

## 8. Resolution

### 8.1 Success formula

```
Attack  = (10 × correct answers) + attack item bonuses + class bonus      → clamp 0–100
Defense = defense item reductions + (Red Pill: 5 × wrong answers) + class bonus
          → capped at 75 unless an item states otherwise
Success % = max(0, Attack − Defense)
```

**What each part means**
- **correct answers:** questions answered correctly. A correct DeLorean retry counts.
- **wrong answers:** questions answered incorrectly or not answered in time.
- **class bonus:** Mage +5 attack; Warrior +5 defense.
- **Success %:** the chance the steal succeeds.

In plain words:
- attack rate = 10 multiplied by correct answers, plus attack bonuses.
- defense rate = defense bonuses, plus the Red Pill penalty.
- success chance = attack rate minus defense rate.

**Example**
- A Mage gets 8/10 correct and has a Lockpick Set: 80 + 5 + 5 = **90 attack**.
- The defender is a Warrior with Vibranium Shield and Popcorn Bucket Helmet: 10 + 5 + 5 = **20 defense**.
- **Success = 70%.**

### 8.2 Order of checks

1. **Infinity Stones** are checked first (§11). The Power and Soul Stones make the attack an automatic success.
2. **Invisibility Cloak:** 20% fizzle roll at attack start. Counts as a fail, with no fine.
3. **Success roll** using the formula above. A simultaneous-attack loss (§5) is an automatic fail.
4. **Neuralyzer:** on success, a 20% roll turns it into a fail, with no fine.
5. **Crit roll:** on success, 5% chance (8% with Two-Face's Coin). Plot Armor blocks crits; the Space Stone forces a crit.
6. **Payouts** (§8.3 or §8.4).

### 8.3 On success

- **Attempted amount** = ceil(chosen % × victim's snapshot net worth).
- **Victim loses** the attempted amount (PP first, then P-PP). With the Reality Stone, the victim loses nothing.
- **Attacker receives** the attempted amount, adjusted as follows:
  - **Crit:** multiplied by the crit multiplier. Only the victim's loss is the attempted amount; the extra is newly created.

    | Chosen % | 1% | 2% | 3% | 4% | 5% |
    |---|---|---|---|---|---|
    | Crit multiplier | ×2 | ×2.25 | ×2.5 | ×2.75 | ×3 |

  - **Rogue:** +20% of the attacker's final gain, newly created.
- **Wilson:** the victim gets back 25% of what they actually lost, newly created.
- **Caps:** a success counts toward the victim's daily/weekly cap, even with the Reality Stone.
- **Visibility:** every successful steal is posted to a public feed on the game page.
- **Crit notification:** a crit also triggers a gold-bordered site-wide notification, like the slot machine's.

**Crit lore:** *King Loan Shark noticed your talents. He's giving you a little extra for keeping the town lively — good for business. He's "investing in your talents."* Show this text on crits and in How to Play.

### 8.4 On failure

**Fine**
- **Fine %** = 80% of the attempted amount, with additive modifiers:
  - Paint Can Trap: +20%
  - Getaway Car: −30%
  - Rogue: +5%
- For example, Rogue + Paint Can + Getaway Car = 80 + 5 + 20 − 30 = **75%**.
- The defender receives the fine **except the Rogue's extra 5%**, which is removed from the economy.

**Revenge Dagger**
- The attacker also owes the defender **100% of the attempted amount**, added to the same bill as the fine.

**Hattori Hanzo Katana**
- The attacker's equipped items lose 2 extra durability.

**Visibility**
- Only the attacker and the defender see a failed attack.

**No-fine failures**
- Fizzles (Cloak) and Neuralyzer failures charge **no fine** and no Revenge Dagger.

### 8.5 Attacker can't pay (negative balance)

**How the debt works**
- The attacker pays everything they have.
- **25% of the unpaid remainder** (rounded up) becomes a negative balance. The other 75% is forgiven.
- The defender only receives what was actually paid. The debt goes to no one.

**Example**
1. The fine is 81 PP and the attacker has 1 PP.
2. They pay 1 PP and still owe 80 PP.
3. 25% of 80 = 20, so their balance becomes **−20 PP**.

**While the balance is negative, the player:**
- can't attack;
- can't buy items;
- can still play free games (e.g. Double or Nothing);
- can't be targeted.

Daily payouts bring the balance back up. Once King Loan Shark loans exist, borrowing can be used to climb out.

## 9. Classes

The class is chosen when PvP is first turned on. It can be changed **once per week**, resetting at the weekly reset.

| Class | Effect |
|---|---|
| Warrior | +5 defense |
| Mage | +5 attack |
| Rogue | +20% bonus on a successful steal (newly created; the victim doesn't lose extra). Fine is +5% on failure; that extra 5% is removed from the economy, not paid to the defender |

## 10. Items

**Source data:** `steal-and-defend-items.json`. Each entry has `name`, `type` (`defense` or `attack`; Infinity Stones also have `unique: true`), `tier`, `effect`, `durability`, `dailyTickdown`, `priceMultiplier`.

### 10.1 Owning and equipping

- **Inventory:**
  - Own up to **27 items**, Infinity Stones included.
  - With a full inventory you can't buy or receive items until you sell or send one.
- **Equipping:**
  - Equip up to **3 items**. Attack, defense and stone items share these 3 slots.
  - You can't equip two copies of the same item.
  - Effects from different items stack additively.
- **Swapping:**
  - Defenders can swap anytime, including during an attack on them.
  - Attackers can't swap during their own attack.

### 10.2 Prices

- **Price** = ceil(`priceMultiplier` × the buyer's daily PP).
- Each viewer sees their own prices.
- Paid with PP first, then P-PP.
- **Example:** a Legendary (x6) costs 30 PP for a 5-review player and 1,320 PP for a 220-review player.

### 10.3 The shop

**When it refreshes**
- **9 random listings** every day at **12:00**.

**How listings are picked**
- Each listing rolls a tier, then picks an item uniformly at random within that tier:

| Tier | Chance |
|---|---|
| Common | 40% |
| Uncommon | 30% |
| Rare | 20% |
| Epic | 9% |
| Legendary | 1% |

**Buying**
- Every listing is **single-purchase**: the first player to buy it gets it. If Tara buys a listing, Saga can't.
- Sniping cheap items and reselling them is allowed and encouraged.

**Infinity Stones in the shop**
- Legendary rolls only pick stones that don't currently exist anywhere: not owned, and not already listed.
- If all 6 stones exist, the roll becomes Epic.

### 10.4 Durability

- **Attack items** (including attack stones) lose 1 when the attacker **starts** an attack.
- **Defense items** (including defense stones) lose 1 when an attack against the holder **completes**, fizzles included.
- **Hattori Hanzo Katana:** the failed attacker's equipped items lose 2 more.
- **Power Stone:** if the defender has no Infinity Stone equipped, all their equipped items are destroyed.
- **`dailyTickdown: true`** items lose 1 per day at the daily reset, but only while equipped. No current item uses this; keep support for future items.
- **At 0 durability** the item is destroyed and removed. It can't be repaired.

### 10.5 Selling and trading

**Selling back to the shop**
- Sell-back = ceil(original shop price × 0.5 × remaining durability ÷ max durability).
- "Original shop price" is what the first buyer paid the shop. It's stored on the item and stays with it through trades, so items can't be traded at inflated prices and then sold back for created PP.

**Player shop**
- Players list items at a fixed price in PP, and other players buy them.

**Private trade**
- One player sends an offer (items and/or PP, either direction). The other can accept or decline; the sender can cancel.
- While an offer is pending, its contents are held in escrow.
- **Gifts:** items can be sent for free.
- All prices round up to whole PP.

## 11. Infinity Stones

- **Unique:** only **one of each** stone can exist on the site at a time.
- **Returning to the shop pool:** a stone goes back to the pool when it:
  - breaks,
  - is sold back, or
  - belongs to a holder who has been **inactive for 3 months** (no login). It disappears from their inventory.
- **Power and Soul Stones:**
  - The attack is an **absolute** success. There's no quiz, and every non-stone item is ignored.
  - They don't override other stones.
- **All stone effects apply together.** For example:
  - Power or Soul vs the Reality Stone: the attack succeeds, the attacker is paid, and the defender loses nothing.
  - Power vs a defender with a stone equipped: no item destruction.
  - Space vs the Reality Stone: a crit for the attacker, and the defender loses nothing.
- **Space Stone:** forces a crit on success and ignores Plot Armor.
- **Mind and Time Stones** only affect the quiz, so they do nothing against Power or Soul attacks.
- **Soul Stone:** the defender can't attack the Soul Stone user for 1 week.

## 12. PvP toggle

- **Default:** off.
- **Turning on:** takes effect immediately. The player picks a class.
- **Turning off:**
  - Takes effect immediately, but not while an attack involving them is in progress.
  - If they successfully stole from anyone since the last weekly reset, everything they gained from those steals is taken back.
  - Each victim gets back what they lost; the newly created extras (crit, Rogue) are removed.
  - If they can't cover it, the §8.5 negative-balance rule applies.
  - Durability lost on any items stays lost.
- **While PvP is off**, a player can't attack, be attacked or equip items for this game. They can still own, sell and trade items.

## 13. Notifications

| Event | Who is notified |
|---|---|
| Attack started | Defender (live, so they can swap items) |
| Successful steal | Attacker and defender; posted to the public feed |
| Critical Hit | Everyone: gold-bordered site-wide notification |
| Failed attack | Attacker and defender only |

## 14. Admin moderation

The system flags suspicious behaviour and notifies admins. Triggers:

- **Possible alts:** two accounts sharing an IP or device that trade items, or steal from each other.
- **Possible collusion:** the same two players stealing from each other 3+ times in 30 days.
- **Debt pattern:** an account going into debt from failed attacks 3+ times in 30 days.
- **Refund pattern:** 2+ PvP opt-out refunds in 30 days.
- **Suspicious trades:** trades between the same pair at extreme prices (e.g. 1 PP for a Legendary, or 50× the original shop price).

Admin actions:
- **Ban scope:** ban a player from specific actions:
  - Stealing
  - Buying items
  - Trading
  - All games
  - Site-wide
- **Duration:** permanent, or temporary with the admin typing a number of days.
- **Reason:** a required written reason, saved with the ban.
- **Ban List page:** shows active bans with an **Unban** button. Temporary bans expire automatically.
- IP/device logging must be mentioned in the site's privacy policy.

## 15. Pages

- **Games page card** (§1).
- **Intro page:** title, description, Play, How to Play. How to Play explains the rules, classes, items and the King Loan Shark crit lore.
- **Hub:**
  - Class
  - 3 equip slots
  - Inventory (27)
  - Target list
  - Public feed
  - Your attack status for today and this week
- **Shop:** today's 9 listings with the viewer's prices and a countdown to the next refresh.
- **Player market and trades:** listings, offers, inventory.
- **Quiz screen:** no scroll on mobile; big timer; 3s countdown between questions.
- **Result screen:** success, fail or crit, with amounts and the durability changes.
- **Admin:** flag notifications and the Ban List.
