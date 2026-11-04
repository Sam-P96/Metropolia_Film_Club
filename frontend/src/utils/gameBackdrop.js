// A game page's background (components/GameBackdrop.jsx): the club's dark
// ink and purple, running into the game's own colour (`to`) towards the
// bottom right. Also used by a screen that needs it as its own background
// (Steal and Defend's quiz, which sits over the page).
export function backdropImage(to) {
  return `linear-gradient(160deg, #0B0710 0%, #1A1024 35%, #2D1B47 58%, ${to} 100%)`
}
