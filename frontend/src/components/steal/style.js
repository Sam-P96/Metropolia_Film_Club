// Steal and Defend's look: dark glass boxes like Double or Nothing's, over a
// purple running into an orange glow, with the club's gold for what matters.
//
// No backdrop blur: all that's behind these boxes is the page's smooth
// gradient, which looks the same blurred or not, and Chrome redraws a blur
// whenever anything next to it moves or glows (the item cards' hover glow,
// a list sliding), which made the boxes flicker along their edges.
export const GLASS = 'rounded-2xl border border-white/10 bg-ink/60 shadow-xl shadow-black/40'

// A subtle hover for anything you can press: it eases up a little over
// 0.4 s on a soft curve (and back down as slowly when the pointer leaves),
// and dips quickly as it's pressed so a click still feels instant. Not
// while disabled, and not with reduced motion.
export const HOVER_EASE = [0.25, 0.8, 0.25, 1]
export const LIFT =
  'transition-[transform,translate,scale,filter,box-shadow,background-color,border-color,color,opacity] duration-400 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:duration-150 disabled:hover:translate-y-0 disabled:active:scale-100 motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100'

export const BUTTON = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 font-bold ${LIFT} hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100`
export const GOLD_BUTTON = `${BUTTON} bg-brand-gold text-ink shadow-[0_0_24px_rgba(250,188,63,0.25)] hover:shadow-[0_6px_28px_rgba(250,188,63,0.45)] disabled:hover:shadow-[0_0_24px_rgba(250,188,63,0.25)]`
export const QUIET_BUTTON = `${BUTTON} border border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:shadow-lg hover:shadow-black/30`
export const DANGER_BUTTON = `${BUTTON} bg-brand-red text-white hover:shadow-[0_6px_24px_rgba(199,37,62,0.45)]`

// The small buttons on item cards, listings and trades.
export const SMALL_BUTTON = `cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold ${LIFT} hover:brightness-110 hover:shadow-md hover:shadow-black/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:shadow-none`

// A list or table that scrolls by itself. Every scrollbar on the site is
// already thin and gold (index.css); this only adds a bit of room so the
// scrollbar doesn't touch the content.
export const SCROLL = 'pr-0.5'

// The page's background colour (components/GameBackdrop.jsx): an orange
// glow in the bottom right.
export const STEAL_FADE = '#C2410C'

// Each tier's colour, Common to Legendary.
export const TIER_COLOURS = {
  Common: '#A1A1AA',
  Uncommon: '#4ADE80',
  Rare: '#60A5FA',
  Epic: '#C084FC',
  Legendary: '#FABC3F',
}

export const tierColour = (tier) => TIER_COLOURS[tier] ?? '#A1A1AA'

// 3 PP, 1 320 PP
export const formatPp = (amount) => `${Number(amount ?? 0).toLocaleString('en-US')} PP`

// "2d 4h", "3h", "12m" until (or since) a moment.
export function formatSpan(ms) {
  const minutes = Math.max(0, Math.ceil(ms / 60000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}
