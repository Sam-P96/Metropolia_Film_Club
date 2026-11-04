// Kino Poker's buttons: the site's gold and glass, with the same slow,
// soft hover lift as Steal and Defend's (components/steal/style.js).
const LIFT =
  'transition-[translate,scale,filter,box-shadow,background-color,border-color] duration-400 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:duration-150 disabled:hover:translate-y-0 motion-reduce:hover:translate-y-0'

export const BUTTON = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold ${LIFT} disabled:cursor-not-allowed disabled:opacity-50`
export const GOLD = `${BUTTON} bg-brand-gold text-ink shadow-[0_0_18px_rgba(250,188,63,0.3)] hover:shadow-[0_6px_24px_rgba(250,188,63,0.45)]`
export const QUIET = `${BUTTON} border border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/15`
export const RED = `${BUTTON} bg-brand-red text-white hover:shadow-[0_6px_22px_rgba(199,37,62,0.45)]`
export const GLASS = 'rounded-2xl border border-white/10 bg-ink/70 shadow-xl shadow-black/40'

// The page's background: the club's purple into wine red.
export const POKER_FADE = '#722F37'

// How the table settles into a new size (sitting down, the window turning,
// the controls changing): every seat, card, bet and the felt itself glide
// there together. CSS transitions of `props`, or none for reduced motion.
export const glide = (reduce, ...props) => (reduce ? 'none' : props.map((prop) => `${prop} 0.7s cubic-bezier(0.25, 0.8, 0.25, 1)`).join(', '))
