// Kino Kasino's background colour: the jade green the page fades into as it
// opens (GameBackdrop on pages/SlotMachine.jsx), and that glows at the
// bottom of the machine. Change it here; any CSS colour works.
export const KASINO_FADE = '#00A86B'

// The machine's own background: the same club purple running into the
// colour above, but only glowing at the bottom edge, so the controls down
// there stay easy to read.
export const SCREEN_BACKGROUND = `linear-gradient(160deg, #0B0710 10%, #1A1024 35%, #2D1B47 68%, ${KASINO_FADE} 195%)`
