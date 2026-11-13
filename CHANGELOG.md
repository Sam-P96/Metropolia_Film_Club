# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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

### Changed
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
- The server gzips its responses (the `compression` package): the API's
  JSON and the built site's JS and CSS. The main JS file goes from 1.37 MB
  to 0.39 MB over the wire. Videos, images and responses under 1 KB are
  sent as they are, and the live games' socket.io connection isn't
  affected.

### Fixed
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
- Unused duplicate component `frontend/src/components/about/AboutIntro copy.jsx`.
- Unused images in `frontend/src/assets/` (about 75 MB of GIFs and images).
