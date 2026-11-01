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

### Changed
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

### Fixed
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
