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
- Moderators and admins can mark a review as containing spoilers, or remove
  the mark, from the review page (`PUT /api/reviews/:id/spoilers`).
- Members can change their username from Edit profile. Names are 1–30
  characters and must be unique, ignoring case.

### Changed
- The bio limit is 300 characters (was 280 in the form, 500 on the server).
- Favourite films on a profile link to their film pages.
- The About section hides "Create an account" for logged-in members.

### Removed
- Unused duplicate component `frontend/src/components/about/AboutIntro copy.jsx`.
- Unused images in `frontend/src/assets/` (about 75 MB of GIFs and images).
