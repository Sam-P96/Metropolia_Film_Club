import BannerFill from './BannerFill'

// What the banner fades into: the row's colour. A leaderboard list is
// bg-list (index.css), and a row under the pointer sets --strip-fade to its
// hover colour; a card with a colour of its own passes `fade`.
const ROW_COLOUR = 'var(--strip-fade, var(--color-list))'

// A member's review card banner behind the left of a list row: as long as a
// card, 15% longer on desktop, fading out on the right. The row needs
// `relative isolate` so this sits behind its content. `className` rounds
// its corners, for a list's first or last row (LeaderboardRow).
//
// Kept light for phones, where a list can hold many of these: no blur, and
// the fade is a gradient to the row's colour laid over it rather than a
// mask. Animated banners play as the server's small video (BannerFill).
function BannerStrip({ banner, className = '', fade = ROW_COLOUR }) {
  return (
    <div className={`pointer-events-none absolute inset-y-0 left-0 -z-10 w-120 max-w-full overflow-hidden lg:w-138 ${className}`}>
      <BannerFill banner={banner} />
      <div className="absolute inset-0 bg-ink/30" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent 60%, ${fade})` }} />
    </div>
  )
}

export default BannerStrip
