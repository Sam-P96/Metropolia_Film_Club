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
- Members can like reviews on the review page, and everyone sees the like
  count (`PUT /api/reviews/:id/like`). Each member can like a review once.
- Review cards have a like button next to "Read more". The review lists
  (`GET /api/reviews`, `/api/films/:tmdbId/reviews`, `/api/users/:id/reviews`)
  now include `likedByMe` for a logged-in member.
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
- A Recent / Top toggle beside the reviews title. Top shows the most liked
  reviews first (`GET /api/reviews?sort=top`).
- A "Movies with club reviews only" filter on Browse films. It works with
  every other filter and sort (`GET /api/films/reviewed`, which takes the
  same filters as `/api/tmdb/discover`).
- With that filter on, a "Sort by club ratings" box beside it sorts the
  films from the highest club rating to the lowest, in place of "Sort by"
  (`GET /api/films/reviewed?byClubRating=1`).

### Changed
- The bio limit is 300 characters (was 280 in the form, 500 on the server).
- Favourite films on a profile link to their film pages.
- The film title on a review card links to the film's page.
- The About section hides "Create an account" for logged-in members.
- "See all reviews" on the Movie Reviews page opens Browse films with
  "Movies with club reviews only" turned on.
- Browse films' rating filter is now "Minimum TMDB rating" and goes in stars
  out of 5, like club ratings (★ 2.5 to ★ 4.0 and up), instead of out of 10.

### Fixed
- An expired login (after 3 days) logs the member out, instead of the site
  showing them as logged in while anything that needs a login fails.
- The poster on a review card keeps its shape on narrow screens instead of
  being cropped at the sides.

### Removed
- Unused duplicate component `frontend/src/components/about/AboutIntro copy.jsx`.
- Unused images in `frontend/src/assets/` (about 75 MB of GIFs and images).
