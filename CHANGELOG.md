# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Catflix No Chill (Games → Catflix No Chill, `/games/catflix`), the pet
  game: every member hatches one magical egg cat from a free egg (100 taps;
  the server picks the cat) and looks after it. Cats are gender neutral and
  don't breed.
  - Meters: happiness, hunger, confidence and love, kept on the server and
    caught up an hour at a time (`backend/utils/catflix/pets.js`). Three
    feeds (or hunger at 100) keep a cat full for 24 hours; below 15 hunger
    it loses 1 happiness an hour. It poops every 8 hours (5 at most), and
    each poop left costs 1 happiness every 2 hours. The owner's love drops 1
    an hour while happiness is under 50, other members' love under 25, and a
    cat only grows love for other members while its happiness is under 50.
  - Care at home (feed, brush, scoop, scold, praise) as often as you like;
    on someone else's pet, once an hour each. Scold then praise: +2 love,
    +2 happiness, a little less confidence. Scold alone: +2 confidence, a
    little less happiness.
  - The Room Room (the School to start, six maps): your cat and 6 others,
    picked again every visit, each a friend's half the time. Play (+1
    happiness for both), Pet (+2 happiness, +1 confidence for theirs) or
    Bully, once an hour per pet, or go on a Play Date to their room. The
    weather changes every 4 hours (6 times a day), the same for everyone;
    none indoors, and the Christmas map only ever has sun or snow.
  - The shop, all for PP (never real money): card packs (including the
    Black & Gold pack, 7 cards for 200,000 PP), food (3 servings for 100
    PP, 100 at most), room styles (500 PP each; Cozy is free; picking one
    you haven't bought asks in a window on the page first), and aura
    crystals (500,000 PP, Rain Cloud 800,000; Black Friday prices apply).
    Packs are opened, cards forged and cast on the server
    (`backend/utils/catflix/shop.js`).
  - Toys, in the shop's Pet supplies: pixel-art balls, one of each kind at
    a time: a Beach ball (1,000 PP, lasts 10 knocks), Soccer ball (2,000
    PP, 20), Basketball (3,000 PP, 30) and Yarn ball (10,000 PP, 100). In a
    pet room (yours, or on a Play Date) pick 🎾 Toy and a ball, and tap the
    floor to drop it (tapping its button again takes it back, with the
    knocks it has left): the pets there chase it and knock it about, and each
    knock is +5 happiness for the pet that made it and one knock off the
    ball. Worn out, the ball is gone and another can be bought. The server
    counts the knocks, at most one a second each player
    (`backend/utils/catflix/toys.js`, `POST /api/catflix/toy/knock`).
  - A friend's cat that loves you (80 love or more, earned by caring for it
    on Play Dates): once a day, from 12:00, it has a 5% chance of stealing
    5% of its owner's PP (never P-PP) and giving it to you as P-PP. You get
    a notification with the cat's happy animation; its owner is told too
    (`backend/utils/catflix/gifts.js`).
  - Your pet on the Games page card (before it hatches, or logged out, the
    game's logo: the first registered form's idle animation), on your
    profile above Stats with "Visit Pet" (a Play Date in their pet's room,
    or your own), and on the leaderboards' top 3 rows, on their banners,
    from tablet width.
  - The game is Pet Forge's page played for real (`/api/catflix/app/`),
    shown in a frame filling the screen, with no title of its own over its
    tabs; the site draws pets itself with
    `components/catflix/PetSprite.jsx`. Its tabs: Explore (the Room Room),
    Kitty Race, Ruin Run, Pet and Shop. On Explore, Kitty Race and Ruin Run
    the screen holds still (no scrolling while you play): the game sits at
    the top, between the tabs and the bottom of the screen, and everything
    else opens in a pop-up window over it (Explore's places, Kitty Race's
    bets, races and results). Explore's auras switch and place button
    ("Explore: 🏫 School") are under the game window. In the Pet room, the
    room picker and auras switch are in their box at the bottom of the page.
  - Ruin Run (its tab in Catflix No Chill; not a card of its own on the
    Games page): your pet runs through a ruined
    city, 2% faster every second and 25% faster after each enemy pet. Like
    Forrest Bounce, a menu over the game picks the bet: 1, 10, 30, 50, 100
    or any amount up to 10,000 PP (PP first, then P-PP). Swipe up or down
    to change lane and tap to jump, or use the buttons under the game: lane
    up over lane down, centred between the left edge and JUMP, on the right
    (held for a bigger jump);
    every 1% of speed above 100% when the run ends pays back 2% of the bet,
    with no cap (150%: the bet back; 200%: twice it). Like Forrest Bounce,
    three runs a play day can be cashed out (or thrown away to keep the
    cash-out), then it's free play until 12:00, and what a run loses goes
    to the Box Office Scratch jackpots. Every run gives your pet +1
    confidence. The run is a fixed-step engine shared by the page and the
    server (`backend/public/pet-forge/ruin-engine.js`): the server picks
    the seed and plays the run again from what the player pressed, so the
    speed it pays for is its own.
  - Nekomusume: Kitty Race (its tab in Catflix No Chill; not a card of its
    own on the Games page): ten cats race,
    yours among them, on a track picked at random. Bet up to 5,000 PP;
    every cat has the same chance,
    and yours winning pays 10 times the bet (the bet back, the rest in
    P-PP). 90% of every bet lost goes to the Box Office Scratch jackpots.
    Race straight away against nine house cats, or open a race your friends
    (members who follow each other) can join with their own bets; it starts
    when the host says, or by itself after 5 minutes, and leaving before
    the start gives the bet back. The server picks the winner and the whole
    finishing order and pays out at the start; every page plays the same
    race from its seed.

- Pet Forge (Admin panel → Pet Forge, `/admin/pet-forge`), for making the
  pets of Catflix No Chill, from the prototype in `shared/prototype/`.
  Upload a base form's animations (idle, sad, angry, love, walk; GIFs or PNG
  strips), resize each one on its own (width × height in art pixels, ▼ ▲,
  Sync to keep them in proportion, ↺; a 256 px animation set to 64 px
  matches 64 px ones, and the cat is that size everywhere), recolour its fur
  with one shared palette and coats, and register
  named forms with a rarity. Base forms, their animation files and
  registered forms are saved on the server, admins only, every save checked
  (`backend/utils/petForge.js`); the files are kept in the database. The
  Room, Race, Run, Pet, Shop and Profile tabs are a sandbox for trying them
  out, kept in the admin's browser only: nothing done there touches the
  real site. The page is served by the server (`backend/public/pet-forge/`)
  and shown in a frame, so it works under the site's security rules.
- Forrest Bounce (Games → Forrest Bounce, `/games/forrest-bounce`): tap to
  drop one buddy from a branch onto a seesaw and launch the other up to the
  far tree, through floating fruit (higher is worth more, up to a x100
  jackpot fruit) and past shurikens (one hit ends the run, unless a heart
  you caught saves you), across six stages from the Orchard to the Void.
  - Entries of 10, 20, 30, 50 or 100 PP (PP first, then P-PP); fruit
    counts x1 to x10 with the entry. A run's score is worth 5 to 1 PP:
    cash it out (the entry back in its own coins, the rest in P-PP) or
    throw it away to keep the cash-out. Three cash-outs a play day; then
    free play (x2) until 12:00, never cashed out.
  - The server picks each run's seed and plays the run again from the taps
    the page sends (`shared/forrest/engine.js`, run the same in the browser
    and in Node), so the score that's paid is the server's; a run that
    played faster than the clock doesn't count.
  - Play with the frog and the rabbit, or any animal (or animal's head)
    bought as a piece in the Infinite Gomoku shop.
  - A cash-out goes to the player's followers on the Notifications page,
    with what they won or lost; one paying 5x the entry or more goes to
    every member as a big win (glowing, in every filter). A new personal
    best or site record goes to every member too (best runs count fruit
    before the multiplier); a site record shows in every filter. The
    notices are bark brown and moss green.
  - The start page has Play and How to Play, your buddies and the best
    runs; Play opens the game on a screen of its own
    (`/games/forrest-bounce/play`) that fills the window under the nav bar
    and can't be scrolled, on a computer or a phone.
  - A rainforest green glow behind the page, and the site's best runs
    under the game.
- Infinity Stone names: holding an Infinity Stone in Steal and Defend gives
  your name that stone's effect everywhere a Black Market name style (or
  the First Place effect) shows: leaderboards, review cards, the Resonance
  list and profiles. Space: a turning Tesseract portal pulling in stardust,
  and every few seconds the name teleports. Mind: golden psychic rings and
  swaying letters. Reality: the name in churning red Aether that warps it,
  now and then rewritten. Power: purple lightning and a shockwave blast.
  Time: green spell rings, motes drifting backwards and a rewind. Soul: a
  breathing orange glow, rising embers and a rippling reflection. Each has
  a lens flare in its colour; reduce motion holds them still. A stone up
  for sale or held in a trade is still yours.
  - With more than one to show (two or more stones, or a stone and a First
    Place title), a Name effect picker under your name on your own profile
    chooses which; it shows at once and is kept for when you have it again.
    Without a pick: First Place, then the stones in order. Turning First
    Place's effect off lets your stone show.
  - `shared/stoneNames/config.js`, `components/stoneNames/` (from
    `shared/prototype/Infinity Stone Username Effects.html`); stone holders
    and picks come with `GET /api/first-place`, and `PUT
    /api/first-place/name-effect` saves a pick (`nameEffect` on accounts).
- Taste charts on the Resonance comparison page (yours with a member, and
  /SECRETresonance's for any pair): every rating as a scatter (your star
  rating across, theirs up, films on the same spot as one bigger dot, the
  same rating dashed and within half a star shaded; hover or tap a dot for
  its films), a radar of each one's average star rating in the six genres
  with the most ratings between them (theirs dashed), and the films you
  agree on most and disagree on most (by how far apart the ratings are), each as two
  dots on a 0.5 to 5 track. A Difference / True difference toggle switches
  all three between the ratings as given and the true difference: both
  members' ratings on the scale they share (half a star and 5 never move,
  each average goes to the middle of the two), so how far apart two ratings
  sit is what Resonance counts and nothing goes past 0.5 or 5, and the
  dumbbell ranks by that instead. Switching, everything
  glides into place over 0.6s (dots, rings, the dashed shape and the
  scales, and dumbbell rows sliding to their new rank), or switches at once
  with reduce motion on. You in the site's gold,
  them in Soul Resonance blue, a legend on each; plain SVG, scaling to a
  phone with no sideways scrolling (`components/resonance/Taste*.jsx`,
  `tasteChart.js`). The comparison pages, and /SECRETresonance, sit on a
  darker background, a black layer at 30% over the site's own, from under
  the nav bar down (the nav bar as it always is;
  `components/resonance/DarkerBackdrop.jsx`).
  The comparison now has
  `genres`: each genre both have rated 2+ films in, with each one's
  average star rating there from all their films.
- /SECRETresonance: a box to type a name (any part, any case) for every
  pair with that member, beside the dropdown, which still picks one
  member's pairs (both together: that member's pair with them). Each
  pair's score opens their ratings side by side
  (`/SECRETresonance/:userA/:userB`, moderators and admins only), with the
  score worked out now, as the list has it.
- Box Office Crash on the Notifications page: a cash-out at 10x or more is
  big news for every member (in every filter, glowing); any other round,
  win or lose, goes to the player's followers, with the multiplier and how
  much they won or lost.
- Lord Gang Orca (Games → Gang Orca, `/games/lord-gang-orca`; "Gang Orca"
  on the Games page, Lord Gang Orca once you're in his office), King
  Loan Shark's rival. Monday to Friday, 16:00 to 23:59 (Helsinki), ask
  him for PP: half your daily PP a beg (in PP, within your PP cap), three
  a day an hour apart. Now and then he asks a question instead: answer right
  for the same again in P-PP. Beg enough (a secret amount for each member)
  and he wants favours: three jobs, four new each day at 00:00 (get a member
  to challenge another to Farkle or Gomoku, post a review, or like or
  dislike a review), before he pays again. Closed, Goon Dolphine (weekdays)
  or Kaveri (weekends) has a story for you. Narration and speech bubbles,
  shown step by step with Skip; all his words in one file
  (`backend/data/lordGangOrcaScripts.js`). His picture and Goon Dolphine's are placeholders.
- Lord Gang Orca at Kino Poker: half the time he takes Bret Maverick's seat
  (never both), plays calm and patient, and when King Loan Shark is at the
  table too, the two trade insults.
- The Games page's order: Loan Shark, Kino Farkle, Box Office Scratch, Infinite
  Gomoku, 8 Ball Pool, Box Office Crash, Kino Kasino, Kino Poker, Double or
  Nothing, Lord Gang Orca, Steal and Defend.
- Box Office Crash (Games → Box Office Crash, `/games/crash`; a "STONKS"
  chart for a logo): a live multiplier that starts at
  0.99x and moves up and down like a stock chart until it crashes to 0,
  hits 25x or runs 60 seconds. Cash out any time (even under 1x) for your
  bet times the multiplier when the server gets it, or set an auto
  cash-out target beforehand; at 25x or 60 seconds everyone still in is
  cashed out. It's a fair random walk, worked out a tick at a time on the
  server from a secure random source and kept for replays: every way of
  cashing out returns about 99% on average (`npm run sim:crash` checks).
  - Bets from 1 up to a quarter of your daily PP, PP first, then P-PP; the
    stake comes back in the same coins and profit is P-PP. Payouts are whole
    points, rounded down.
  - Rounds a day (from 12:00) go by how many players a round starts with,
    to encourage playing together: 3 alone, 6 with 2 players, 12 with 3, 24
    with 4 and 25 with 5 or more, all counting together (3 rounds alone
    still leave 22 to play with 5 or more). A round of 5 or more is
    protected: everyone who loses gets half of what they lost back (whole
    points, rounded down).
  - Rooms of up to 30 members (three rooms at once), live: everyone ready
    starts one shared round at once; otherwise the first one ready starts
    a 15 second countdown and the round starts with whoever's ready (the
    rest watch, and play the next). Anyone who's played every round they
    can in a round that size sits it out. "Play alone" starts a private
    round. Players who leave mid-round stay in it, auto cash-out and all.
  - Once a member's rounds alone are used up, a glowing "Play One More Time
    All In" offer from Lord Gang Orca turns up (explained nowhere on the
    page): once a play day, one more round alone with every point they
    have on it, past the usual biggest bet. Not while they've points
    anywhere else they could get back (Kino Kasino credits, poker chips,
    loan offers or money lent out, stakes in games still going, trade
    offers: `backend/utils/pointsElsewhere.js`).
  - The game screen fits one phone screen: the live chart, a big
    multiplier, a Cash out button (Space too), everyone's pictures riding
    the line, popping off where they cash out and falling grey on a crash,
    and a summary with the best cash-out in gold.
  - Behind the chart the scene follows the multiplier: flames below 1x,
    calm green, then stars, nebulae, sparkles and spiral galaxies as it
    climbs, and a flash and a fade to grey on a crash. Fewer particles on a
    phone; with reduced motion, no shake or shooting stars.
- 8 Ball Pool (Games → 8 Ball Pool, `/games/pool`): Play For Fun (vs
  Clanker on Easy or Hard, played on the device, or vs Player) or Play For
  PP (vs Player, betting PP and P-PP), with challenges, counters and three days a shot (or the game goes
  to the other player), like Infinite Gomoku. To shoot, press and hold
  towards where the shot goes: the power builds the longer you hold and
  never drops, and letting go shoots. A line shows where the cue ball goes,
  up to the first ball it hits, which is ringed in its colour with a short
  line the way it will be knocked. On a computer the table takes 90% of
  the page width; on a phone it stands upright, keeping its shape. The emerald table has a
  mahogany and gold frame under two lamps, and the balls roll, their
  stripes and numbers turning as they go; every ball the cue ball hits
  throws sparks in its colour (purple for the 8 ball), and so do the first
  three hits between any two balls in a shot, harder hits throwing more. Shots are worked
  out on the server and played back identically on every screen
  (`shared/pool/physics.js`, `rules.js`).
- 8 Ball Pool's Shop (the Shop button on its page), for points, PP first,
  then P-PP, kept for good:
  - 22 cues. Classic is free; Standard 100, Fine 250, Luxury 500; six
    Glowing ones at 1,000 glow on the table (breathing, flickering like a
    flame, light running down them, or every colour going round); and four
    Sabers (Red, Blue and Green at 2,000, Crossguard at 3,000) that aren't cues at
    all: a humming blade of light with a thick white core, lighting the
    cloth, on a metal hilt. The Crossguard Saber has two crackling side
    blades, and all three of its blades come to sharp points.
  - 12 Ignitions: what flies off when balls collide on your shots. Classic
    Sparks are free; the others (Embers, Bubbles, Snowfall, Petals, Pixels,
    Stars, Hearts, Confetti, Lightning, Coin Burst, Nebula; 100 to 1,000)
    throw their own particles, twice the size.
  - The shop's previews are still pictures, so the page stays calm.
  - Test, at the top, opens a table to shoot on with what you use, or
    with anything you Try from the shop.
  Everyone at your table sees your cue and your Ignition; Clanker picks
  both at random each game.
- A Particles on / off toggle on 8 Ball Pool's game pages (and the shop's
  Test table): off, no sparks or Ignitions fly when balls collide.
  Remembered on the device.
- On the Games page, "Pool" in 8 Ball Pool's name is the club's gold, like
  the other games' names.
- Live pool: both players and anyone watching see each shot as it's
  played, and the other player's cue as they line up. Members who follow
  either player get a notification when a game starts, can watch it, and
  can bet on who wins: a bet shows on the game's page for everyone, goes
  through when someone backs the other player for the same amount (the
  winner's backer takes both, in P-PP), and can be taken back until then;
  bets nobody took are handed back when the game ends.
- Infinite Gomoku: a Classic stones toggle beside the sound toggle on the
  game pages (Play Local, vs Clanker, online games). On, every piece on the
  board and in the players bar shows as a plain black stone (whoever moved
  first) or white stone, so the game stays easy to read; shockwaves, boards
  and grids stay. Remembered on the device; the shop's preview board
  always shows the real items.
- Infinite Gomoku's Deluxe items, 1,000 points each: 17 pieces (six
  energy orbs, six coloured glass stones, three neon rings, Eclipse and
  Ember Stone, all glowing), four shockwaves made of layered particle
  effects (Supernova, Black Hole, Fireworks, Prism:
  `frontend/src/components/gomoku/deluxeShockwave.js`), three moving boards
  (Starfield, Synthwave, Aurora) and two moving grids (Neon Pulse, Laser).
- The Black Friday Sale: from Black Friday (the day after the fourth
  Thursday of November) to the end of that Sunday, Helsinki time, every
  Black Market name style and border is half price (rounded up), except the
  Jackpot name style and border. The page shows the sale prices and a
  banner, and everyone gets a white notification when it starts.
- Box Office Scratch's Double Prize Weekend: every Saturday and Sunday,
  Helsinki time, cards bought then pay double prizes (Straight to DVD pays
  the price back and once more in P-PP); the jackpots stay as they are.
  The game page shows a rainbow banner and the doubled prize table, its
  Games page card gets a rainbow edge and glow with its logo breathing a
  rainbow glow, and everyone gets a rainbow notification when it starts.
  Both events come from `shared/events.js`; their notifications are sent
  once each (`utils/siteEvents.js`, `jobs/siteEvents.js`, new `siteevents`
  collection, `doublePrizes` on scratch cards).
- README with setup instructions, API overview, and project layout.
- CONTRIBUTING with branch, commit, and pull request conventions.
- CHANGELOG.
- `.editorconfig` and `.gitattributes`.
- `MONGO_URI` and `SECRET` in `backend/.env.example`.
- Added a movie wheel page (`Wheel.jsx`) where anyone can add movie
  suggestions and spin the wheel to pick what the club watches next, with
  confetti for the winner.
- Added a `/api/wheel` endpoint (`routes/wheel.js`, `wheelController.js`,
  `WheelEntry.js`) to store the wheel entries. No login required for now.
- Members can like or dislike a review (one or the other, not both) with
  thumbs up and thumbs down buttons beside "Read more" on review cards and on
  the review page. Each shows its count and share of the votes, and a thin
  green and red line just under the buttons shows the ratio
  (`PUT /api/reviews/:id/vote`). The review lists (`GET /api/reviews`,
  `/api/films/:tmdbId/reviews`, `/api/users/:id/reviews`) include
  `likeCount`, `dislikeCount` and, for a logged-in member, `myVote`.
- Comments on the review page. Any member can comment, and like or dislike
  comments the same way as reviews. A Recent / Oldest toggle sorts them. The
  author, and moderators and admins, can delete a comment after confirming
  (`GET`/`POST /api/reviews/:id/comments`, `PUT /api/comments/:id/vote`,
  `DELETE /api/comments/:id`). Deleting a review deletes its comments.
- A Critics Leaderboard at the bottom of the Movie Reviews page: the top 4
  members by likes on their reviews (Top) or by dislikes (Controversial),
  and "Show top 10" lengthens it to 10 (`GET /api/reviews/critics`).
- A Report button on review pages, with a confirmation. Members can report
  5 reviews a day, not their own and not twice while open. Open reports
  sit at the top of every moderator's and admin's Notifications with the
  review and who reported it, until one of them clicks Addressed or
  Dismiss (`POST /api/reviews/:id/report`, `PUT /api/reviews/:id/reports`).
- The Ban Hammer: moderators and admins can stop a member posting
  reviews, disliking reviews, commenting, disliking comments, or
  reporting, each on its own, from a button beside their name. Moderators
  can ban members; admins can ban members and moderators
  (`PUT /api/users/:id/bans`).
- A Banned list for moderators and admins, beside Edit profile on their
  own profile: everyone with a ban, A to Z, with the rights they've lost
  (`GET /api/users/banned`).
- Admins can delete someone else's review from its page, after confirming
  twice. Its comments and notifications go with it; the author's rating
  stays in their film list (`DELETE /api/reviews/:id`).
- Moderators and admins can mark a review as containing spoilers, or remove
  the mark, from the review page (`PUT /api/reviews/:id/spoilers`).
- Members can mark an upcoming event as Attend or Interested, and the event
  page lists who's attending and who's interested
  (`PUT /api/events/:id/rsvp`). Members with a private profile are counted
  but not named.
- Pressing Attend or Interested on an event tells the members who follow
  you, on their Notifications page (under All and Events): "is going to" or
  "is interested in" the event, on your banner, with when and where it is
  and the event's picture. Changing your mind replaces it (so it never
  piles up), pressing the same one again doesn't send it again, and taking
  your RSVP back takes it back. It goes as far as your profile's privacy
  lets it: every follower for a public profile, only friends for
  friends-only, and nobody for a private one.
- Member screenings: any member can host an event of their own, listed in a
  new Member screenings section on the club events page (and with every
  other event on the All events page). The member who made one can edit and delete it until
  it's made official. Moderators and admins can promote a member screening
  to an official club event and demote it back
  (`PUT /api/events/:id/official`). On calendars, member screenings are
  outlined in the same gold that fills official event days, which look as
  before. A selected calendar day tags each event as a club activity or a
  member screening. "See all events" counts member screenings too.
- Members can change their username from Edit profile. Names are 1–30
  characters and must be unique, ignoring case.
- The scrolling reviews on the home and Movie Reviews pages have round ← and
  → buttons at the bottom left. A click skips two reviews; pressing and
  holding scrolls that way at 5× the usual speed until let go. The first
  review starts in the middle of the screen.
- A Recent / Top / Controversial toggle beside the reviews title. Top shows
  the most liked reviews first, and Controversial the most disliked
  (`GET /api/reviews?sort=top`, `?sort=controversial`).
- A "Movies with club reviews only" filter on Browse films. It works with
  every other filter and sort (`GET /api/films/reviewed`, which takes the
  same filters as `/api/tmdb/discover`).
- With that filter on, a "Sort by club ratings" box beside it sorts the
  films from the highest club rating to the lowest, in place of "Sort by"
  (`GET /api/films/reviewed?byClubRating=1`).
- GDPR: members must agree to the privacy policy to sign up, and that
  consent is recorded on the account.
- GDPR: members can download everything held about them as JSON from their
  profile (`GET /api/users/me/export`).
- GDPR: members can delete their account from their profile. This removes
  their profile, reviews (with the comments under them), comments and film
  logs, and their likes and dislikes on other reviews and comments
  (`DELETE /api/users/me`). The data download includes their comments.
- A privacy policy page at `/privacy`, linked from the footer and signup.
- Moderators and admins can add a "Theatre Screening Link" when creating or
  editing an event. The event page shows it as a "Purchase Tickets" button
  until the event starts.
- At an event with a ticket link, members attending can enter their row and
  seat beside their name in the Attending list, and change it by clicking it
  (`PUT /api/events/:id/seat`). Moderators and admins can remove anyone's
  seat, after confirming (`DELETE /api/events/:id/seats/:userId`). Leaving
  the Attending list clears the member's seat.
- The Film box on the event form suggests films from TMDB as you type.
  Picking one fills in the TMDB id, which can still be edited.
- Member levels: reviews / 20 + likes / 5 − dislikes / 3 on their reviews,
  with reviews making up at most 75% of the total, rounded down and never
  below 0. Hovering over the avatar on a review card fades in "Level: X" on
  the left of the banner. Profiles and review lists include `level`.
- Edit review card has a Level text section: font, text colour, a shadow or
  glow in any colour, and a backing (none, glass or frosted glass) that's
  round, rounded or sharp, all mixed freely
  (`levelStyle` on `PATCH /api/users/me`). The fonts are bundled with the
  site through Fontsource rather than loaded from Google.
- Profile stats have a second row with Likes received and Level.
- The top 3 on the Critics Leaderboard (Top) get a gold, silver or bronze
  ring around their avatar on their review cards. A Ranking switch in Edit
  review card turns it off, and says where they stand. Review lists and
  profiles include `rank` (1–3 or null) and `showRank`.
- The Critics Leaderboard shows each member's level after their title, with
  their review card banner behind the left of their row, as long as a card
  (15% longer on desktop) and fading out to the right.
- A PVP switch in Edit profile, off by default. Disliking reviews and
  comments only works between members who both have it on; otherwise the
  thumbs down shows an alert saying why. Every review card keeps both
  buttons and the bar, but with PVP off a member's dislikes count as 0 (so
  their bar is all green), don't count towards their level, and leave them
  off the Controversial reviews and Controversial critics lists. The server
  refuses those dislikes too (403).
- A dislike only counts while the member who gave it has PVP on. Turning PVP
  off takes their dislikes out of every total (review cards, levels, the
  Critics Leaderboard, Controversial); they're kept, and count again if PVP
  goes back on. The server recounts dislikes when it starts, so ones given
  before PVP existed stop counting until their giver turns PVP on.
- Replies to comments on the review page, nested Reddit-style under the
  comment they answer, with a line down each thread. Deleting a comment
  keeps its replies under a "[deleted]" stand-in
  (`POST /api/reviews/:id/comments` takes `parent`).
- Following: a Follow / Unfollow button beside a member's name, in brand
  red with a small pop. Members who follow each other are friends, which
  makes the "Friends only" profile setting work. Profile stats gain a row
  with Followers and Following, opening paged lists in the Critics
  Leaderboard's style; a new Edit profile setting makes them public,
  friends only, or nobody (friends then see only themselves)
  (`PUT`/`DELETE /api/users/:id/follow`, `GET /api/users/:id/followers`,
  `GET /api/users/:id/following`).
- A Notifications page for logged-in members, behind a bell icon beside Account
  in the nav bar (and "Notifications" in the menu on narrower screens):
  likes and dislikes on your reviews (grouped per review, with everyone who
  voted, in a translucent green or red box), replies to your reviews and
  comments, new reviews from members you follow, and reviews from others
  passing 5 likes as trending. The newest 100, 10 at a time; notifications
  are deleted after 90 days (`GET /api/feed`). New and trending reviews sit
  centred on light glass, black for new and brand gold for trending.
  Someone following you shows too, with a Follow back button; unfollowing
  quietly removes it. Clicking the bell while on the page loads it again
  from the top.
- New events on the Notifications page, laid out like the homepage's Next
  Event. A club event goes to every member, its poster included, as a
  white card with a glowing brand gold border; a member screening goes to
  its host, their followers, and every moderator and admin, on black glass
  with a brand gold border. They show the event as it is now, a promoted
  screening reaches everyone who hadn't heard yet, and deleting an event
  removes them.
- When a member turns PvP on, everyone else is told on their
  Notifications page: the member's banner inside a glowing red border,
  one of ten lines nodding to films and games ("Here comes a new
  challenger: X!", "Heeere's X!", ...), and plainly that X has enabled
  PvP. Turning PvP off quietly removes it, and switching back and forth
  never leaves more than one.
- A Notifications background setting in Edit profile: Default (the Upcoming
  events glow under dark glass, fixed while the page scrolls), White, or
  Dark (the site's usual purple).
- A "Comments on your reviews" switch in Edit profile, and a Turn off
  comments button on the author's own review page for one review
  (`PUT /api/reviews/:id/allow-comments`). Turned-off comments are hidden,
  not deleted, and can't be added to; the comments endpoints answer 403.
- "Forgot password?" on the login page. The member enters their email and,
  if there's an account, is emailed a link (sent with Resend) to choose a new
  password. The link carries a one-time token that expires in 20 minutes;
  opening it leads to a page in the signup page's style where they set the
  password and are logged in. The reply is the same whether or not the email
  has an account, so it can't be used to tell who's a member
  (`POST /api/password-resets`, `POST /api/password-resets/complete`).
  Without `RESEND_API_KEY` set, the link is logged to the server console
  instead of emailed, for local development. Requesting a link shares the
  login rate limit.
- "Reset Locally" on "Forgot password?", beside "Send reset link", with an
  i that explains it on hover or tap ("Reset password locally, send a
  request to an admin to reset password in person"). The request is pinned
  at the top of the moderators' and admins' Notifications as "X has
  requested to change passwords", with Approve and Dismiss, and lights the
  bell. Moderators decide members' requests, only admins a moderator's,
  another admin an admin's, and nobody their own. The member's page checks
  every few seconds and, once it's approved, moves on by itself to choosing
  the new password, then logs them in. A request times out after 20
  minutes, and so does an approval (`POST /api/password-resets/local`,
  `POST /api/password-resets/status`, `PUT /api/password-resets/:id`).
  Unlike the emailed link, it says when there's no account with the email;
  it shares the login rate limit.
- Admins can delete a member's or moderator's account from the Ban Hammer,
  after three confirmations. It removes the same things as a member
  deleting their own account (`DELETE /api/users/:id`).
- A Promote button on an upcoming event's page, for whoever can edit it. It
  sends the event to the top of Notifications again: every member's for a
  club event, the host's and their followers' for a member screening. The
  copy they had before goes, so it only ever shows once
  (`POST /api/events/:id/repost`).
- Cuts: short posts of up to 280 characters that any member can write, in
  a box at the top of the Notifications page. A cut goes to its author's followers and to
  the author, on the author's banner under "X posted their cut", with web
  addresses in it as links. The author, and moderators and admins, can
  delete it from there, which takes it out of everyone's Notifications;
  deleting an account deletes its cuts (`POST /api/cuts`,
  `DELETE /api/cuts/:id`). The Ban Hammer can take away posting cuts.
- Cuts have likes and dislikes, like comments (dislikes only between
  members with PvP on); they don't count towards levels
  (`PUT /api/cuts/:id/vote`). Members can reply to a cut, and to each
  other's replies, the same way as comments on a review: "N replies" opens
  the thread inside the cut, replies have likes and dislikes, and the cut's
  author (or whoever was replied to) is told on their Notifications page.
  "View reply" opens the cut on its own page, `/cuts/:id`
  (`GET /api/cuts/:id`, `GET`/`POST /api/cuts/:id/replies`). Replies are
  comments, so they vote and delete through `/api/comments`, and the
  Commenting and Disliking comments bans cover replies and cut dislikes.
  Deleting a cut deletes its replies. A cut with an image banner that grows
  past about half the screen (with its replies open) stops the picture
  there and fades it into the picture's most common colour for the rest
  of the card, instead of stretching the picture to fill it.
- Viral takes: the like that takes a cut to 5 makes it viral. It goes out
  once to every member's Notifications, at the top, in place of the copy
  its author and their followers had. A viral cut has a glowing brand gold
  border and a "Viral take" label ("Your cut went viral" for its author)
  wherever it shows, and stays viral if likes drop again.
- "Show all cuts" on the Notifications page for moderators and admins: an
  Off | On switch beside the heading swaps the list for every member's
  cuts, newest first, where they can delete any of them
  (`GET /api/cuts`).
- Make profile picture and Make banner buttons on every picture on the
  /SECRETpfp page. A banner keeps the member's colour and style, and the
  ones in use show as ticked. Logged-out visitors are sent to log in, then
  back.
- Double or Nothing on the Games page (`/games/double-or-nothing`): one
  shared pot for the whole site. Match the pot's bet and play up to 3
  rounds of rock, paper, scissors against the house: 2 wins pays double the
  bet in P-PP (plus the bonus pot once the bet is 4x the week's seed), a
  lost round puts you on the Ban List and 2 draws on the Waiting List, and
  either way the pot doubles for the next player. The pot resets every
  Monday at 12:00 Helsinki time, half of what's left going to the bonus pot
  (up to 3 000) and half burned. Every move runs in a MongoDB transaction,
  so MongoDB has to be a replica set (see the README)
  (`GET /api/double-or-nothing/status`, `POST /api/double-or-nothing/start`,
  `POST /api/double-or-nothing/round`).
- Double or Nothing notifications: a game that isn't won goes to the
  player's followers, and a win goes to every member, on black glass with a
  glowing emerald border.
- An All | Events | Reviews | Games toggle on the Notifications page, in
  place of "Show all cuts" (`GET /api/feed?filter=`). Club events and big
  news (trending reviews, viral cuts, jackpots, Double or Nothing wins) show
  under every one of them.
- Each game page has its own background: the club's purple fading into
  green (Double or Nothing), blue (Box Office Scratch) or red (Kino Farkle).
  The Farkle lobby fades and slides in as it opens.
- "Challenge a friend" in the Farkle lobby: friends (mutual follows), the
  most points first, five at a time, each with a Challenge button that opens
  the challenge form on them (`GET /api/farkle/friends`).
- A member's PP and P-PP in a small pill beside Stats on their profile,
  where the rest of the profile shows.
- Kino Kasino, a slot machine (`/games/slots`, a new card on the Games
  page; the name is one constant in `shared/slots/config.js`). An intro with Play and How
  to Play (the controls, the eleven paylines, the Infinity Gauntlet and the
  paytable), then a machine
  that fills the screen under the nav without scrolling: 5 reels by 3 rows
  in a marquee-bulb frame, a status line, the credits with Add credits and
  Cash out, the bet (− and + hold to repeat, MAX goes all in and pulls),
  and a lever you click or drag, with the prototype's sounds (mute
  remembered), haptics and a simplified paytable. Eight symbols, commonest
  first: Movie Ticket, Popcorn, Clapperboard, Film Strip, The Marauder's
  Map, The One Ring, the Infinity Gauntlet, and the Kino Kaveri logo
  (the favicon), whose 5 in a row is the 2,000x jackpot. Lines pay from 1x
  the bet up. The Infinity Gauntlet links Maps and Rings: a line starting
  with 3+ of them, with a Gauntlet among them, pays as Maps (rainbow
  fireworks from the Gauntlets) or Rings (rainbow lightning from the
  Gauntlets and Rings); with both, a coin flipped on the server decides,
  and Rings is a CRITICAL HIT!. 3+ Gauntlets alone are INFINITY (lightning).
  A line pays its best reading. The effects play on the spinner's screen
  only, the words flash over the reels, linked Gauntlets glow rainbow, and
  with reduced motion only the words and highlights show. Each effect has
  its own synthesised sound, timed to it (a whoosh and pops for fireworks,
  a crack and rumble for each lightning strike, a stinger for CRITICAL
  HIT!, a ringing chord for INFINITY), all mixed through one compressor,
  with the volumes and pitches in `SOUND_FX` in
  `frontend/src/components/slots/feedback.js`. In development only
  (`npm run dev`), an FX button in the slot screen's corner plays any
  effect on demand.
  Every spin happens on the server with a crypto RNG, is logged, can't
  spend the same credits twice and is played once however often it's sent
  (`GET /api/slots`, `POST /api/slots/credits`, `POST /api/slots/spins`,
  rate limited, `GET`/`POST /api/slots/cash-out`). The machine's credits
  are kept on the server. Add credits moves PP, then P-PP, from the wallet;
  bets take PP first; wins are P-PP; cashing out rounds each down to whole
  points, and P-PP cashed out each 12:00-to-12:00 day is capped at 3x the
  richest member's total at 12:00 (plus what was put in that day), the
  rest waiting in the machine. Tripling a session's credits and hitting the
  jackpot are announced to every member in Notifications with a glowing gold
  border, and the jackpot fills the winner's screen with gold.
  Hidden from players, how often symbols land depends on where they stand
  on a snapshot of the PP Leaderboard taken at 12:00 after the payout:
  97% RTP for the richest member who has reviewed in the last 30 days, up
  to 103% for the poorest, 101% for the only one, and 95% for everyone else
  (`backend/games/slots/`, tables from 92% to 109% made by
  `npm run slots:tune` and checked exactly, by reading every possible line,
  by `npm run slots:rtp` and the tests). Wins always pay the paytable.
- Resonance, a 0 to 100% taste match between two members from their film
  ratings (`backend/utils/resonance.js`, with the weights at the top):
  the films both rated and how alike their ratings are once each member's
  usual rating is taken out (50%, scaled down below 10 shared films), how
  they rate each genre (25%), and how much of what they rate shares genres
  (20%), decades (2.5%) and US age ratings (2.5%). 80% or more is a Soul
  Resonance, 50% or more a Resonance, and below that a Dissonance, shown the
  other way round ("Dissonance: 60%" for a 40% match; `shared/resonance.js`).
  Members need 20 rated films. Every pair is worked out again at 04:00
  Helsinki time, and on starting up if the last run was over a day ago or
  used different scoring settings, so changing a weight and restarting is
  enough (`jobs/resonanceSweep.js`, stored once per pair in
  `models/resonanceModel.js` with the settings' fingerprint). Settings, privacy and friendships are checked
  each time it's asked for, so changes show straight away: private profiles
  never appear, friends-only ones only to friends, and members who turn
  Resonance off in Edit profile drop out of everyone's lists (and see none
  themselves) until they turn it back on, there, with the same switches
  at the top of the Resonance page, or with its "Turn on Resonance?"
  (`GET /api/resonance/me`,
  `/suggestions`, `/ranking`, `/soul`). The home page's hero is now a
  carousel: the welcome, with Post Reviews and Play Games, and for members
  with a 75%+ match a random one of their best matches on a Resonance card,
  with Show more and Find more friends; arrows on a computer, a swipe and
  dots on a phone. The Resonance page (`/resonance`, linked from the hero,
  your profile and Members) ranks everyone you may see, Resonance and
  Dissonance, with a name search (each keeping their rank) and each
  member's card opening on hover or tap. A blue
  Resonance icon follows the names of your Soul Resonances around the site,
  with "Soul Resonance: 87%" on hover or tap (an Edit profile setting turns
  it off both ways), and their review cards and Resonance cards glow blue
  with a glass edge, the Resonance card's profile picture too. "Soul
  Resonance" itself is white with a blue glow and a drop shadow, and the
  icon after names breathes a blue glow. Film logs now keep the US age rating from TMDB, and
  `npm run backfill:certifications` fills it in for older entries;
  `npm run resonance:sweep` works everyone out again straight away.
  `/SECRETresonance` (linked from nowhere, admins only,
  `GET /api/resonance/all`) lists every pair worked out live with the
  current weights and all five factors, whatever members' settings, for
  members with 20 rated films or any, or one member's pairs.
- A Level view on the Critics Leaderboard (Top | Controversial | Level):
  members by level, highest first, ties to whoever has more likes
  (`GET /api/reviews/critics?sort=level`).
- Friends' review cards glow a softer purple, the same glass edge as a Soul
  Resonance's blue (which wins for a friend who's both). The friend list
  comes from `GET /api/users/me/friends`, shared by every card and asked
  for again after following or unfollowing someone. Account
  deletion removes a member's matches, and the data download includes them.
- "Update Resonance now" on `/SECRETresonance` works everyone's Resonance
  out again straight away, with when it was last worked out; the 04:00
  run still happens (`POST /api/resonance/update`, moderators and admins,
  sharing the nightly run's one-at-a-time guard).
- An Edit review button on your own review's page, which comes back to the
  review after saving.
- Clicking the star rating you've already chosen when writing or editing a
  review takes the rating off. Saving with no rating and no text removes
  both from a film you'd rated or reviewed, and the film stays on your list
  as watched.
- Steal and Defend, a PvP game on the Games page (spec and build notes in
  `shared/doc/steal-and-defend/`). Members with PVP on (the same switch
  as for dislikes, off by default; it can't be turned off mid-attack, and
  turning it off takes back the week's steals) are in, everyone as a
  Warrior until they change class once a week. They can try to steal 1, 2,
  3, 4, 5, 10, 20, 30, 40 or 50% of the net worth of someone they've
  followed for 72 hours, by winning a timed quiz about them, with math and
  trivia.
  Everything is decided on the server: questions, timers, answers, rolls,
  fines, debt and durability. Defenders use items from a daily shop of 9
  single-purchase listings at 12:00; items can be equipped (3), sold back,
  sold on a player market, traded with escrow, or given away. Six unique
  Infinity Stones. A live alert, notifications for both players, a public
  feed of steals and a gold site-wide notice on a Critical Hit. Admins get
  flags (possible alts, collusion, debt and refund patterns, extreme
  trades), scoped, timed bans with a reason and a Ban List, and a "Reset
  steal timer for everyone" button (two confirmations) that starts every
  steal limit over, so everyone can steal and be stolen from again.
  Item data is `backend/data/steal-and-defend-items.json`; every other
  number is in `shared/steal/config.js` (`/api/steal`, `jobs/stealSweep.js`).
- Kino Poker, 5-Card Draw, on the Games page (`/games/poker`, then
  `/games/poker/table`). One live table for up to 6, played over the same
  socket.io connection as Farkle's Play Live (`backend/games/poker/`). The
  first member to sit down gets three bots (King Loan Shark, Kaveri and
  Bret Maverick, each with their own style of play, lines and picture;
  Kaveri's is one of three, picked each time Kaveri sits down). Newcomers
  sit down between hands, with a bot getting up to make room, and once the
  bots are gone anyone past 6 waits in a queue. Bots come back below 4
  players, and the table starts over when the last member leaves. No-limit
  with 1/2 blinds, one draw of up to 3 cards, side pots, turn timers, and a
  20-second grace for a dropped connection. The server deals with a crypto
  shuffle, checks every action, and sends each player only their own cards.
  Buy-ins (20 to 300) spend PP first, then P-PP. Cashing out gives back
  the PP (less losses) and pays everything won in P-PP. Chips won from a
  bot pay half, like Farkle against Clanker. The table is drawn in 3D:
  cards flying out of the deck and flipping, chip stacks, the pot sliding
  to the winner, speech bubbles and emoji reactions (four presets or any
  one emoji). The cards of your best hand glow like a Soul Resonance, blue
  unless you pick another colour (a preset, your own, or by suit) in
  Options on the intro page, fading in slowly, with one or two small bolts
  of lightning crackling round them now and then (VFX turns it off).
  Sound effects for the deal, flips, the draw, chips, checks, folds, wins,
  your turn and its last seconds, the glow and its lightning (synthesised,
  with a mute button), and haptics on a phone for tapping cards and
  buttons, your turn and a win. In Notifications: while members are
  playing, the table shows at the top beside the Farkle games, with who's
  there and a Join button; and a member leaving the table ahead is a win
  every member hears about (`pokerWin`: how much, hands won, best hand).
  Every number is in `shared/poker/config.js` and every bot
  line in `shared/poker/lines.js`. Chips at the table are kept in
  `PokerSeat` and refunded if the server restarts.
- The server logs every request that takes over 500 ms, as
  `SLOW 812ms GET /api/...`, to find out what's slow at 12:00 when everyone
  opens the site at once for the daily resets.
- First Place: a name effect for whoever is #1 on the PP Leaderboard, the
  Critics Leaderboard's Top or Controversial view, or by level (furthest
  along within the level, so only an exact tie ties). A tie for #1, or a #1
  at 0, and nobody holds that title; only #1 ever gets it. One member can
  hold several and it's still one effect, and a new #1 takes over by
  itself. The name glows in six stone colours, each pulsing with a vertical
  lens flare, with a sheen when all six are on; it replaces their Black
  Market name style (which comes back without a title, or with the effect
  off) on leaderboards, the Resonance list, review cards and profiles, and
  hovering it lists the titles. A holder's own profile has a rainbow ∞ by
  their name that opens an editor: effect on or off, which stones, their
  order (drag or arrows), Random or a left-to-right wave, and each stone's
  interval, with a live preview. Settings are kept for good, title or not
  (`GET /api/first-place`, `PUT /api/first-place/settings`; titles in
  `backend/utils/firstPlace.js`, stones in `shared/firstPlace/config.js`).
  The Black Market's developer test tool can preview it.
- A "Page not found" page for addresses the site doesn't have (an old link
  or a typo), with links home and to the films, instead of an empty page.
- Each page has its own name in the browser tab, history and bookmarks
  ("Kino Farkle · Kino Kaverit", "Wallet · Kino Kaverit"), from one table in
  `frontend/src/utils/pageTitles.js`. Home and the SECRET pages stay
  "Kino Kaverit".
- Link previews: a link to the site shared in WhatsApp, Discord and the like
  shows the club's name and a line about it, and a link to an event shows
  the event's own title, date, time and place, the start of its description
  and its image (`backend/utils/linkPreview.js` puts them in the page the
  server sends, since preview bots don't run the site's JavaScript).
- Two wheels on the Club Events page. Local Wheel (the one it opens on) is
  your own, kept on this device. The Club Wheel is the same for everyone:
  moderators and admins add films, set each film's weight, take films off one
  at a time and clear it. An admin can open it so every member can add films
  too, and set how much weight each member can add in all (1 by default, up
  to no limit), over one film or several; adding a film that's already on
  it adds to its weight. A film's slice, and its chance, is as big as its
  weight (1 by default) on both wheels. Under the Club Wheel, a public
  activity box shows who added, removed or reweighed what and who cleared
  it, 3 lines at a time with "Show more" (`GET`/`POST`/`DELETE /api/wheel`,
  `PATCH`/`DELETE /api/wheel/:id`, `PUT /api/wheel/settings`; new
  `wheelsettings` and `wheelactivities` collections, and `weight`,
  `addedBy` and `backers` on wheel entries, which films from before count
  as weight 1).

### Changed
- Film Browser: open a film from a search or filtered list and press Back,
  and every film you'd loaded is there straight away, scrolled to where you
  were (no loading page one again and clicking "Load more" back down). The
  last list on show is kept for the browser tab; arriving any other way, or
  changing the search, loads afresh.
- Resonance's true difference puts both members' ratings on a scale they
  share (`shared/resonanceScale.js`): half a star and 5 never move, each
  one's average goes to the middle of the two, and the ratings in between
  stretch or squeeze to fit. It used to slide one member's ratings by the
  gap between the averages, so a half star could count as below 0 and a 5
  as above 5 or below it; now a 5 is a 5 and half a star is half a star
  whoever gives it, the same top or bottom rating from both is no gap at
  all without a special rule, and nothing lands past either end. The Movies
  factor, the Genre factor, the comparison table's True difference and the
  taste charts all count it this way. A change of scoring: restarting the
  server works everyone out again.
- Kino Kasino has six symbols: the Clapperboard is gone. With fewer symbols
  lines match more often, so every prize is lower (3 Tickets now pay 0.6x
  the bet and 3 Popcorns 0.7x, softening a losing spin; the jackpot is
  still 2,000x), and the odds are retuned so it still pays back what it
  did: 99% to 115%, and 95% / 110% to 120% in its happy hour (new tables
  from `scripts/tune-slots.js`). Old spins with a Clapperboard still show
  it. The machine also has a new hidden rule (`games/slots/luck.js`).
- The Notifications page's Events filter is strictly events: club events,
  member screenings, and the members you follow going to or interested in
  one, with promoted events still at the top. The big news (trending
  reviews, viral cuts, jackpots, wins), Box Office Crash rooms and the
  Black Friday and Double Prize Weekend notices no longer show there.
  Forrest Bounce, its big wins and site records included, shows only under
  All and Games, no longer under Events, Reviews or Cuts.
- Kino Casino (the Slot Machine) pays back more: from 99% for the richest
  active player to 115% for the poorest (was 98.5% to 105%). In its happy
  hour, the richest gets 95% and everyone else 110% to 120%. New weight
  tables for 111% to 120% (`scripts/tune-slots.js`).
- Loan Shark: a borrower who hasn't paid King Loan Shark for a week gets a
  new set of jobs. The ones not done yet close (jobs done keep what they
  took off), and the week starts again from each payment or new set
  (`refreshStaleJobs` in `utils/loanShark/jobs.js`, run by the loan sweep
  every 10 minutes; new `round` on jobs and `jobsDealtAt` on loans).
- The Resonance page has a blue underglow: the Soul Resonance blue rising
  from the bottom of the screen, breathing slowly (still with Reduce Motion).
- Double or Nothing: at the Monday reset, everything left in the pot goes
  to the bonus pot (was half), and the bonus pot holds up to 95,000 (was
  3,000); whatever doesn't fit is burned.
- The Box Office Scratch jackpots also grow from what's lost elsewhere:
  75% of a stake lost to Clanker at Kino Farkle (beaten, resigned, left or
  timed out), 50% of everything King Loan Shark takes (repayments and
  Kaveri's collections), 90% of what a Box Office Crash round loses (bets
  ridden to the crash, less a protected round's half back; Lord Gang Orca's
  all in too) and everything a Forrest Bounce run loses (the entry, less
  what its cash-out paid; all of it for a run thrown away, let go when a
  new one starts, not counted, or never finished), each rounded up, shared
  15% Standard, 35% Premium and 50% VIP (`backend/config/jackpotFeed.js`,
  `utils/jackpotFeed.js`). Forrest Bounce runs nobody comes back to finish
  are let go every 10 minutes (`jobs/forrestSweep.js`).
- Box Office Scratch has a new hidden rule for the Golden Ticket
  (`backend/games/happyHours.js`).
- Box Office Scratch: 90% of what every ticket costs goes into its own
  jackpot: 9 a Standard ticket, 18 a Premium, 27 a VIP (was 1, 2 and 3;
  `jackpotShare` in `shared/scratch/config.js`).
- Double Prize Weekend starts on Friday at 16:00 (was Saturday at 00:00)
  and still runs to Sunday at midnight. While it's on, only a member's
  first 15 cards of each ticket a day are doubled (Helsinki days, so Friday
  evening is Friday's); any more they buy are ordinary cards, never
  refused. The Buy buttons say how many doubled cards are left today, then
  "normal prizes" (`GET /api/scratch/limits`). Its notification goes out at
  Friday 16:00.
- The hidden rules of Box Office Scratch, Kino Farkle and the Slot Machine
  have changed (`backend/games/happyHours.js`). When a jackpot has grown
  very big, one member now and then hears about a Golden Rush, pinned to
  the top of their Notifications while it lasts (`jobs/goldenRush.js`).
- Double or Nothing: the bonus pot also grows by 500 on its own every day
  at 12:00 Helsinki time, up to its 95,000 cap.
- Lord Gang Orca and members in the red (P-PP below 0, from a Steal and
  Defend fine they couldn't pay): he's open around the clock for begging,
  and has 10 jobs for them, the same kinds as his favours. Each job's slot
  gets a new one 2 days after it was handed over, done or not. Each job
  done forgives a tenth of the lowest they've been since going into the red
  (down to -1,000 and back up to -500: still 100 a job), never past 0. Out
  of the red, the jobs left are cancelled and his usual hours are back
  (`utils/orca/debt.js`; the wallet keeps its lowest as `debtLow` while in
  the red).
- Loan Shark: King Loan Shark lends up to 30x a member's daily PP (was 5x),
  missed payments double his rate up to 320% (was 160%), and Kaveri starts
  collecting well before the top. Where he starts is set in
  `backend/config/loanShark.js` (`collectorRate`) and, like before, never
  shown on the page: members find out when he arrives. While he collects
  below the top, missed payments still double the rate, and the page still
  warns when a payment is due. Each job done takes 15.6% of what was borrowed
  off the debt, rounded up (was 20%), and the daily minimum payment is 3.6% of what
  was borrowed, rounded up (was 5%).
- Profile Stats: Average rating shows how many films the member has rated
  at each star (rounded up, so 3.5 counts as 4), and Expand splits it into
  half stars. Most watched genre shows their top 5 genres with a bar each,
  coloured round the colour wheel from green, and Expand shows every genre
  they've watched, down to red; a film in two genres counts once in each.
  Both now come from the member's film list, so films rated without a
  review count too. The Reviews card opens their full list. Expanded bars
  slide open and fade in (and back out), the counts count to their new
  numbers, and the three boxes are always as tall as the tallest.
- Deleting from a review's page: the author's "Delete review" now deletes
  their rating too (the film stays on their list as watched). Moderators
  and admins get a Delete menu instead, with Delete review, Delete rating
  and Delete review and rating, on anyone's review; moderators couldn't
  delete other people's reviews before (`DELETE /api/reviews/:id?remove=`
  `review`, `rating` or `both`; `review` is the default).
- `/SECRETresonance` is for moderators as well as admins, and the
  Resonance icon in the Resonance page's heading links to it for them
  (for everyone else it isn't a link).
- Double or Nothing's page fades from the club's purple into golden yellow
  (was green).
- Scrollbars across the site, the page's own and any box that scrolls, are
  thin and brand gold instead of the browser's grey (`index.css`).
- For Steal and Defend: P-PP can go below 0 as a debt from a fine (the next
  P-PP or 12:00 payout pays it off first), and a wallet in an attack is
  frozen against spending until it's over (`utils/wallet.js`). Logins are
  dated (`lastLoginAt`). Every request sends a random browser id
  (`X-Device-Id`); only Steal and Defend players' are kept, hashed with
  their IP, for 90 days. An admin's "All games" ban stops the other games
  being played (cash-outs still work), and a site-wide ban stops logging in
  (downloading or deleting your data still works). TMDB lookups also bring
  a film's original title.
- The full navigation bar shows from 1280px wide; narrower screens get the
  menu button. With the bell added, the search box was squeezed too narrow
  to use below about 1200px.
- The bio limit is 300 characters (was 280 in the form, 500 on the server).
- Favourite films on a profile link to their film pages.
- The film title on a review card links to the film's page.
- The About section hides "Create an account" for logged-in members.
- "See all reviews" on the Movie Reviews page opens Browse films with
  "Movies with club reviews only" turned on.
- Browse films' rating filter is now "Minimum TMDB rating" and goes in stars
  out of 5, like club ratings (★ 2.5 to ★ 4.0 and up), instead of out of 10.
- Every page but the home page is a file of its own, loaded the first time
  it's opened, instead of the whole site coming in one 1.37 MB file. The
  home page needs about 0.6 MB of JavaScript now (the main file is 0.36 MB).
  A small gold spinner shows while a page loads.
- The server gzips its responses (the `compression` package): the API's
  JSON and the built site's JS and CSS. The main JS file goes from 1.37 MB
  to 0.39 MB over the wire. Videos, images and responses under 1 KB are
  sent as they are, and the live games' socket.io connection isn't
  affected.
- The looping backgrounds (the reviews section on the home and Movie
  Reviews pages, Upcoming Events, Notifications, About, Plan to Watch, and
  the log in, sign up and password reset pages) are short MP4 videos instead
  of GIFs: the same picture at about 0.8 MB for all four instead of 30.8 MB
  (the home page alone drops from 17.4 MB to 0.3 MB). Anyone who has asked
  for reduced motion sees the first frame, standing still, instead of no
  background, and the video isn't downloaded for them.
- Kino Farkle against Clanker pays more when the die says Clanker starts:
  double the stake (bet 10, get 20) instead of the stake plus half (bet 10,
  get 15), which is still what a win pays when you start. The stake picker
  shows both, and the game shows both until the die lands.
- Stakes go up to 1,500: against Clanker in Kino Farkle (from 500), with
  1,000 and 1,500 quick stakes, and 1,000 and 1,500 quick stakes for games
  between members in Kino Farkle and Infinite Gomoku (still up to what the
  poorer of the two has).
- A new review starts with its author's own like. Liking or disliking your
  own review no longer counts towards your level, the Critics Leaderboard
  (Top and Controversial) or First Place: only other members' votes do.
  `npm run reviews:self-like` (in `backend/`) gives existing reviews their
  author's like; it only counts until it's run with `--apply`.
- Banners are much lighter on phones. A banner picture is turned into a
  small looping MP4 about 552px wide (or, for a still picture, a small
  JPEG) by the server when it's saved, and existing ones when the server
  starts; leaderboards, the Resonance list, follower and banned lists, the
  Farkle and Gomoku player cards, review cards, Resonance cards and
  Notifications play that instead of the original GIF, which phones decode
  in hardware, pause off screen and hold still for reduce motion. It needs
  ffmpeg on the server (on the PATH, or `FFMPEG_PATH` in `.env`); without
  it banners stay as their pictures. The files live in `backend/media/`
  and are served at `/api/banner-media/` (`backend/utils/bannerMedia.js`).
  The server only fetches pictures from the public internet.
- Every banner is opaque: the Glass and Translucent finishes are gone.
- The banners behind list rows have no blur, and fade into the row with a
  gradient instead of a mask; leaderboard lists are an opaque colour (no
  blur behind them), so a row is the same on both sides; hovering a row
  washes it lighter, banner and all, wiping in from the right.

### Fixed
- Catflix No Chill: the Wallet page names its receipts (shop buys, Ruin Run
  and Kitty Race bets and wins), and a member's pet, things, runs and races
  are in their data export and go when they delete their account.
- Catflix No Chill and Pet Forge on a phone: the pet room's columns stack,
  and pickers with many buttons (the six places) wrap instead of cutting off.
- Review card banners with a picture came up empty (leaderboards, review
  cards, profiles, Resonance, Notifications) when the server didn't have
  its small copies of them on disk: the database said the copies were
  there, so every banner pointed at a file the server answered with 404.
  Each copy is now checked once per page load, and a banner whose copy
  doesn't load (picture or video) shows its original picture instead
  (`hooks/useBannerMedia.js`). With ffmpeg on the server, a restart makes
  the copies again.
- Box Office Crash's Invite box (and the prompt to join a smaller game)
  stays in the space under the nav bar however long the friends list grows
  with "Load more": its title and close button stay put at the top and the
  list scrolls inside it. It used to grow up behind the nav bar, out of
  reach of the close button, on a computer and a phone.
- Scrolling games on a phone: a finger going up or down a Box Office
  Scratch card scrolls the page instead of scratching it (rub sideways to
  scratch; a tap does nothing). On 8 Ball Pool a swipe across the table on
  your turn scrolls the page and never shoots: a shot needs the finger held
  still a moment first (and off your turn the table scrolls like the rest
  of the page). A Box Office Crash room taller than a short phone scrolls,
  from a finger on the chart too, and leaving it always lets the page
  scroll again. Lord Gang Orca's chat, scrolled to its end, hands the swipe
  on to the page.
- Finishing the Daily Quiz on the home page shows the Full Quiz Leaderboard
  button straight away, and the hero's slides can be changed again, instead
  of both waiting for a refresh.
- On phones and tablets, a black bar no longer flashes at the bottom when
  the address bar slides away: the site's background, every game page's,
  the Notifications GIF, and the full-screen Kino Poker table and Steal
  and Defend quiz all run on 10% past the bottom of the screen there
  (under 1024px wide; desktops are unchanged).
- The Notifications page's GIF background and the sign-up page's starfield
  show again: the dark base colour that stops phones flashing white at the
  bottom now sits under the body's gradient, instead of on `<html>`, where
  it hid backgrounds placed behind pages.
- Deleting an account also takes the member off every event's Attending
  and Interested lists and seat plan, and removes their password reset
  requests.
- An expired login (after 3 days) logs the member out, instead of the site
  showing them as logged in while anything that needs a login fails.
- The poster on a review card keeps its shape on narrow screens instead of
  being cropped at the sides.

### Removed
- The old Movie Wheel page (`/wheel`, `Wheel.jsx`); its wheel lives on the
  Club Events page.
- Unused duplicate component `frontend/src/components/about/AboutIntro copy.jsx`.
- Unused images in `frontend/src/assets/` (about 75 MB of GIFs and images).
