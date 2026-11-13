import { Link } from 'react-router-dom'
import BannerStrip from '../profile/BannerStrip'
import ResonanceIcon from '../resonance/ResonanceIcon'
import StyledAvatar from '../cosmetics/StyledAvatar'
import StyledUsername from '../cosmetics/StyledUsername'
import { useFirstPlaceShown } from '../firstPlace/firstPlaceStore'

// The corners of the list's first and last rows. The lists don't hide their
// overflow (that would cut off the particles of the cosmetics in their top
// and bottom rows), so those rows round their own highlight and banner.
// (edges.js edgeOf says which.)
const EDGES = {
  first: { row: 'rounded-t-xl', banner: 'rounded-tl-xl' },
  last: { row: 'rounded-b-xl', banner: 'rounded-bl-xl' },
  only: { row: 'rounded-xl', banner: 'rounded-l-xl' },
}

// One member on a leaderboard (the PP Leaderboard, the Critics Leaderboard,
// and future game leaderboards): their place, picture, name, the line under
// it (`subtitle`, their title unless told), and `score` on the right, over
// their banner, linking to their profile. The top 3 get gold, silver and
// bronze rings, unless they wear a border, which takes the ring's place.
//
// The name wears the member's name style and the picture their border
// (`cosmetics`, from the server's member summary; the developer test tool
// passes its own), or the First Place effect if they hold a title. Long
// names show in full and wrap, styled or not, so wearing a style never
// moves anything. `resonancePercent` shows the Resonance icon for a
// made-up member (the developer test tool).
export default function LeaderboardRow({ user, position, subtitle, score, edge = null, cosmetics = user.cosmetics, resonancePercent }) {
  const firstPlace = useFirstPlaceShown(user._id)
  const styledName = Boolean(cosmetics?.name) || firstPlace
  const styled = styledName || Boolean(cosmetics?.border)
  const corners = EDGES[edge] ?? { row: '', banner: '' }

  return (
    <li>
      <Link
        to={`/users/${user._id}`}
        className={`group relative isolate flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5 ${corners.row} ${styled ? 'z-10' : ''}`}
      >
        <BannerStrip banner={user.reviewCardBanner} className={corners.banner} />

        <span className={`w-6 shrink-0 text-right text-lg font-bold tabular-nums ${position <= 3 ? 'text-brand-gold' : 'text-white/40'}`}>
          {position}
        </span>

        <StyledAvatar borderId={cosmetics?.border} user={user} rank={position} />

        <div className="min-w-0 flex-1">
          <p
            className={`flex min-w-0 items-center gap-1.5 font-medium transition-colors group-hover:text-brand-gold ${styledName ? '' : 'drop-shadow'}`}
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">
              <StyledUsername name={user.username} styleId={cosmetics?.name} userId={user._id} />
            </span>
            <ResonanceIcon userId={user._id} percent={resonancePercent} />
          </p>
          <p className="truncate text-xs text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{subtitle ?? user.memberTitle}</p>
        </div>

        {score}
      </Link>
    </li>
  )
}
