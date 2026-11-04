// The colour of the glow round your best hand (CardAura.jsx), picked in
// Options on Kino Poker's intro page. Blue, the Soul Resonance's, to start
// with; remembered on this device. Only you see it: it's your own hand.
//
// A choice is a key below, 'suit' (black cards blue, red cards purple), or a
// custom colour as '#rrggbb'. Colours are "red green blue", for the CSS.
export const GLOW_COLOURS = [
  { key: 'blue', name: 'Blue', rgb: '79 168 255' },
  { key: 'purple', name: 'Purple', rgb: '184 110 255' },
  { key: 'gold', name: 'Gold', rgb: '250 188 63' },
  { key: 'red', name: 'Red', rgb: '255 72 102' },
  { key: 'green', name: 'Green', rgb: '74 222 128' },
  { key: 'pink', name: 'Pink', rgb: '255 120 200' },
  { key: 'white', name: 'White', rgb: '232 238 255' },
]

export const DEFAULT_GLOW = 'blue'
const KEY = 'poker-glow'
const HEX = /^#[0-9a-f]{6}$/i

const isChoice = (value) => value === 'suit' || HEX.test(value) || GLOW_COLOURS.some((colour) => colour.key === value)

export function loadGlow() {
  try {
    const saved = localStorage.getItem(KEY)
    return saved && isChoice(saved) ? saved : DEFAULT_GLOW
  } catch {
    return DEFAULT_GLOW
  }
}

export function saveGlow(choice) {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    // Private mode: it just won't be remembered.
  }
}

const hexToRgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(' ')
const preset = (key) => GLOW_COLOURS.find((colour) => colour.key === key)?.rgb

// The colour card `code` glows with `choice`, as "red green blue".
export function glowRgb(choice, code = 'As') {
  if (choice === 'suit') return code[1] === 'h' || code[1] === 'd' ? preset('purple') : preset('blue')
  if (HEX.test(choice)) return hexToRgb(choice)
  return preset(choice) ?? preset(DEFAULT_GLOW)
}
