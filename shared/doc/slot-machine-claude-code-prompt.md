# Build the Kino Kaveri slot machine

You are adding a slot machine game to the Kino Kaveri website (React + Vite + Tailwind frontend, Express backend, MongoDB). Before writing any code, explore the repo and learn how the existing pieces work: the games page, the PP / P-PP wallet, the daily PP grant, the PP leaderboard, reviews, notifications, auth, and the site's styling tokens (especially the brand gold). Follow the existing patterns and conventions everywhere.

Then write a short implementation plan and show it to me before you start. If something in this spec conflicts with how the codebase works, or you would need new infrastructure (a new realtime system, a new library, a new database), stop and ask me first.

A design prototype is attached as `docs/slots-prototype.html`. Port its look and feel: the colors, the marquee-bulb reel frame, the reel spin and settle animation, the lever physics, the sounds, the mute button and the haptics. Do **not** port its slide-out menu or the paytable inside that menu. That was a placeholder for the real nav bar.

---

## 🚫 Hard rule: do not touch the navigation bar

- Do not edit, restyle, wrap, rename, reorder or add anything to the site's nav bar or any of its files, components or styles.
- The slot pages show the existing nav bar exactly the way every other page does.
- If anything in this spec seems to require a nav change, find another way or ask me. This rule has no exceptions.

---

## 1. Page flow

1. **Games page:** add an entry called "Slot Machine" (final name TBD, so keep the name in one constant). Selecting it opens the slot intro page.
2. **Intro page:** title, a short game description, a **Play** button and a **How to Play** button.
3. **How to Play:** the rules section fades in and slides down below the buttons. It contains:
   - how the controls work (bet, MAX, lever, add credits, cash out)
   - the 5 paylines, drawn as small diagrams
   - the full paytable (below), with symbols listed in rarity order (Common → Legendary)
   - **no** percentages, RTP figures, symbol weights or anything about the luck system (see section 6)
4. **Play:** everything on the intro page fades out, then the slot machine fades and slides in.
5. Respect `prefers-reduced-motion` for all of these transitions.

---

## 2. Slot screen layout (mobile first, must not scroll)

- The slot screen fits exactly in the viewport (`100dvh` minus the existing nav). **It must never scroll on mobile.** Lock page scrolling while the slot screen is open, and make sure iOS Safari doesn't rubber-band.
- Layout, top to bottom:
  - **Top row:** mute button (left), and next to it a **paytable button** that opens a simplified paytable overlay. The existing nav bar stays where it normally is.
  - **Reels:** 5 reels × 3 rows inside the marquee frame.
  - **Status line** under the reels ("Pull the lever", "Win +12.5", "Add credits first", and so on).
  - **Credits box:** machine balance (large), last win, and two buttons: **Add credits** and **Cash out**.
  - **Bet row:** **−**, bet amount, **+**, **MAX**.
  - **Lever:** to the right of the credits box and bet row.
- **Simplified paytable overlay:** symbols with their 3 / 4 / 5 pays and the 5 payline shapes. It must fit on one screen with no scrolling at 360×640. Close it by tapping outside or with a close button.
- Keep all the prototype's extras: bet readout, last-win readout, status line, winning-cell highlight, sounds, mute.

---

## 3. Controls

- **Bet:** steps of 1 PP. Minimum 1 PP, maximum = the current machine balance.
  - **Press and hold** − or + to change the bet rapidly. Start repeating after about 400 ms and speed up the longer it's held.
  - The bet can never exceed the machine balance. If the balance drops below the bet, clamp the bet down.
- **MAX = ALL IN:** sets the bet to the entire machine balance (decimals included) and pulls the lever automatically.
- **Lever:**
  - **PC:** a click plays a full pull animation, then spins.
  - **Mobile:** drag the knob down. On release, it flicks back up with a spring and a small bounce off the top stop (it doesn't snap). The reels spin only if it was pulled at least about 72% of the way.
  - The lever is locked while the reels are spinning.
- **Add credits:** opens a small sheet where the player picks an amount from their wallet (number input plus quick buttons like +10, +50 and All). It moves PP first, then P-PP, from the wallet into the machine.
- **Cash out:** see section 5.

---

## 4. Game math (high volatility, base RTP ≈ 101%)

### Paylines (5)
Pays count from the leftmost reel, consecutive matches only. Each line is evaluated separately and the wins are added together. The bet covers all 5 lines, and pays are multiples of the total bet.

```
Row 1        Row 2        Row 3        V            Inverted V
X X X X X    . . . . .    . . . . .    X . . . X    . . X . .
. . . . .    X X X X X    . . . . .    . X . X .    . X . X .
. . . . .    . . . . .    X X X X X    . . X . .    X . . . X
```

### Base paytable and symbol weights
Each of the 15 cells is drawn independently using these weights. Symbol art is a placeholder for now: use a simple labelled tile or emoji per symbol, and keep the art path in the symbol config so I can swap in images later.

| Rarity | Symbol | Base weight | 3 in a row | 4 in a row | 5 in a row |
|---|---|---|---|---|---|
| Common | Movie Ticket | 25% | 2× | 5× | 15× |
| Common | Popcorn | 21% | 2.5× | 8× | 20× |
| Uncommon | Clapperboard | 16% | 4× | 12× | 40× |
| Uncommon | Hogwarts Logo | 12% | 6× | 20× | 75× |
| Rare | Lightsaber | 8% | 10× | 40× | 150× |
| Rare | The One Ring | 6% | 15× | 75× | 400× |
| Epic | Infinity Gauntlet | 5% | 25× | 150× | 1,000× |
| Legendary / Jackpot | Club Logo | 7% | 20× | 100× | **JACKPOT: 28,500×** |

- There are no 2-in-a-row wins.
- The jackpot is 5 Club Logos on any payline and pays 28,500 × the bet.
- At base weights this gives about 77% from normal wins plus about 24% from the jackpot, so about 101% in total. Wins happen on about 1 in 7 spins.

### Computing RTP exactly
Don't rely on simulation for RTP. The jackpot is too rare for a simulation to converge. Compute it exactly instead: every cell is independent, so for a symbol with weight q on a single line,

- P(exactly n in a row from the left) = qⁿ × (1 − q) for n = 2, 3, 4
- P(5 in a row) = q⁵

Line EV = the sum of P × pay over all symbols and lengths. RTP = 5 × line EV, because expectation adds across lines even though the lines share cells. Write a small script (`scripts/slots-rtp.js` or similar) that prints the RTP for any weight table, and use it to check all your numbers. Use simulation only to check hit rate and feel.

---

## 5. Money rules

### Two currencies inside the machine
- The machine holds two sub-balances, **PP** and **P-PP**, but the UI shows only their sum, labelled "PP".
- **Bets** spend machine PP first, then machine P-PP.
- **Winnings** are always added as P-PP.

### Cash out
- PP goes back to the wallet as PP, and P-PP goes back as P-PP.
- Each currency is **rounded down** to a whole number. The fractions stay in the machine.
- **Daily cash-out cap on P-PP:** 3 × the richest player's leaderboard total at the daily 12:00 snapshot. Example: if the richest player has 300, the cap is 900 P-PP per player per day, but if someone's final bet lands them anywhere more than that cap, they can keep they won. The cap resets at 12 PM lunch time, Helsinki.
  - The cap counts P-PP **winnings** cashed out (P-PP out minus P-PP the player added from their wallet that day), so a player can always take back what they put in.
  - P-PP over the cap **stays in the machine** and can be cashed out on later days.
  - The day runs from 12:00 to 12:00 Europe/Helsinki time, remember, resets happen at 12 PM at lunch. 
  - Show the remaining cap for today in the cash-out confirmation.

### Persistence
- The machine balance (both sub-balances) is stored **on the server per user**. It survives refreshes, closed tabs and other devices.
- Machine balances do **not** count toward the PP leaderboard or the cap calculation. Only wallet balances do.

---

## 6. Luck system (hidden from players)

Each player's effective RTP depends on their leaderboard rank. This is **never shown to players**: no RTP figures, multipliers, weights or luck labels in the UI, in API responses or in client code. The client only ever receives the spin result.

### Active players
- A player is **active** if they posted at least 1 review in the last 30 days (rolling window).
- Check this live at each spin. Posting a review makes a player active immediately. There are no special rules for new accounts.

### Rank
- Use the **existing PP leaderboard** (wallet PP + P-PP total) in exactly the order it already shows, including how it breaks ties. Don't change the leaderboard.
- Take a **snapshot of the leaderboard order every day at 12:00 Europe/Helsinki**, right after the daily PP grant. Use the snapshot all day.
- Everyone is included: admin and test accounts are treated as regular players.

### Target RTP per player
- Order the players who are currently **active** by their position in today's snapshot.
- r = the player's rank among those active players (1 = richest), and N = the number of active players.
- p = (N − r) / (N − 1), so the richest active player has p = 1 and the poorest has p = 0.
- **Active player:** target RTP = 101% × (1.10 − 0.20 × p). That ranges from about 111% for the poorest active player to about 91% for the richest.
- **Only one active player:** target RTP = 101%.
- **Inactive player:** target RTP = 95%.
- A player who wasn't in today's snapshot (a brand-new account) is placed by their current balance.
- Keep 1.10, 0.20, 101% and 95% as named config constants so I can tune them.

### How to apply it
- **Don't scale payouts.** Wins must always match the paytable exactly.
- Change the **symbol weights** instead. Keep the paytable fixed and precompute weight tables for target RTPs from 88% to 114% in 1% steps, tuned with the exact RTP script. Shift weight between the common symbols and the higher ones (including the Club Logo) so that the order of rarity never changes.
- At spin time, use the weight table nearest the player's target RTP.
- Save the tables and the tuning script in the repo. Add a test that checks every table is within ±0.3% of its target and that the rarity order holds.

---

## 7. Spins are server-authoritative

- All randomness, balance changes and win evaluation happen **on the server**, using a crypto-quality RNG. The client sends "spin with bet X" and gets back the final grid, the winning lines and cells, the win amount and the new balance. It then animates the reels landing on that grid.
- Balance updates must be **atomic**: a conditional MongoDB update with `$inc`, so double taps or parallel requests can't overspend. Reject a spin if the balance is below the bet.
- Rate-limit the spin endpoint, and make it idempotent with a client-generated spin ID.
- Log each spin (user, bet, result, win, target-RTP bucket) so I can check the real RTP later. Keep the luck data out of anything the client can read.

---

## 8. Feedback: haptics, sounds and win levels

### Haptics
Port them from the prototype: the Vibration API on Android, and the iOS 18 switch-checkbox fallback.

- Any button press: 10 ms tap.
- Touching the lever: 8 ms tap.
- Lever reaches the bottom of its travel: 35 ms thud. It fires again only after the lever leaves the bottom.
- Lever hits the top stop after flicking back: double tap, 15 ms on, 70 ms off, 15 ms on.
- Normal win: 3 slow buzzes, 120 ms on with 280 ms gaps.
- **Big win (20× the bet or more):** 12 rapid buzzes, 40 ms on with 40 ms gaps.
- **Jackpot:** the big-win pattern plus the jackpot celebration below.

### Site-wide announcements
These go to everyone on the website, with a glowing brand-gold border (use the site's existing brand gold token):

1. **Tripled session:** a session starts when the machine goes from 0 to a positive balance through Add credits, and ends when it returns to 0 or the player cashes out everything. Session input = the total credits added during the session. When the machine balance first reaches 3 × the session input, announce "[Player] tripled their credits on the Slot Machine!". Announce only once per session.
2. **Jackpot:** announce "[Player] hit the JACKPOT on the Slot Machine! +[amount] PP". The jackpot winner also gets a full-screen gold celebration on their own screen.

Use the site's existing notification system if there is one. If there isn't, or it can't reach every online user, ask me before adding new infrastructure.

---

## 9. Done means

- [ ] The nav bar files are unchanged (check with `git diff`).
- [ ] The slot screen fits without scrolling at 360×640, 390×844 and on desktop, and the paytable overlay fits too.
- [ ] Lever drag, flick and spin work on touch; click-to-pull works with a mouse.
- [ ] Press-and-hold works on − and +; MAX goes all in and spins.
- [ ] The balance survives refresh and a closed tab, and two quick taps can't overspend.
- [ ] Cash out rounds down per currency, applies the daily cap correctly and keeps the excess in the machine.
- [ ] The RTP script confirms the base table is about 101%, and every luck table is within ±0.3% of its target.
- [ ] No RTP, weights or luck data appear in client code or API responses.
- [ ] Triple and jackpot announcements reach other logged-in users with the gold border.
- [ ] Tests cover payline evaluation (including multiple lines winning at once), the cap, rounding and rank-to-RTP mapping.
