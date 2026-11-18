import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import MemberAvatar from '../profile/MemberAvatar'
import { CrashLogo } from './CrashChrome'
import { getCurrentUserId } from '../../utils/currentUser'
import { CRASH_RULES } from '../../../../shared/crash/rules.js'

// The stars in the box: always the same ones (a seeded shuffle), so it
// looks the same on every visit. Where each one is, as a share of the
// box's width and height; how big it is in pixels (so it stays round
// whatever the box's shape); how it twinkles; and every fifth one, a
// bright star with a four-point lens flare.
const STARS = (() => {
  let seed = 41
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: 34 }, (_, index) => {
    const flare = index % 5 === 0
    return {
      x: rand() * 100,
      y: rand() * 100,
      size: flare ? 16 + rand() * 14 : 1.5 + rand() * 1.8,
      delay: `${(rand() * 3).toFixed(2)}s`,
      twinkle: `${((flare ? 2.6 : 1.8) + rand() * 2.4).toFixed(2)}s`,
      mint: rand() < 0.5,
      flare,
    }
  })
})()

// A four-point lens flare: two long, thin spikes crossing, fading out to
// their tips, round a soft glowing core. `size` in pixels, tip to tip.
function Flare({ size, colour }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true" className="block overflow-visible">
      <defs>
        <radialGradient id={`crash-flare-${colour.slice(1)}`}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="0.35" stopColor={colour} stopOpacity="0.55" />
          <stop offset="1" stopColor={colour} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="4" fill={`url(#crash-flare-${colour.slice(1)})`} />
      <path d="M0 -10 Q0.45 -0.45 10 0 Q0.45 0.45 0 10 Q-0.45 0.45 -10 0 Q-0.45 -0.45 0 -10Z" fill="#FFFFFF" opacity="0.9" />
    </svg>
  )
}

// The chart going up: a stock line climbing in zigzags to the top, and
// the arrow's point, which only appears once the line has got there. The
// line's pathLength is 1, so the CSS (index.css .crash-live-line) can draw
// it; the point has its own (.crash-live-arrow).
const LINE = 'M4 82 L22 75 L34 79 L52 64 L64 69 L84 52 L97 57 L117 41 L129 46 L150 29 L163 34 L186 17 L198 21 L222 7'
const ARROW = 'M211 7.5 L222 7 L218 18'
const AREA = 'M4 82 L22 75 L34 79 L52 64 L64 69 L84 52 L97 57 L117 41 L129 46 L150 29 L163 34 L186 17 L198 21 L222 7 L222 90 L4 90 Z'

function Chart({ className }) {
  return (
    // In proportion (not stretched), so the line drawing itself keeps to
    // its own length.
    <svg viewBox="0 0 230 90" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="crash-live-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3DFFA8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#3DFFA8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 70 H230" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="4 4" />
      <path d={AREA} fill="url(#crash-live-fill)" className="crash-live-area" />
      <path
        d={LINE}
        pathLength="1"
        fill="none"
        stroke="#3DFFA8"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="crash-live-line drop-shadow-[0_0_6px_rgba(61,255,168,0.8)]"
      />
      <path
        d={ARROW}
        fill="none"
        stroke="#3DFFA8"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="crash-live-arrow drop-shadow-[0_0_6px_rgba(61,255,168,0.8)]"
      />
    </svg>
  )
}

// The galaxy behind it all: deep space green, nebulae drifting, a band of
// light across it like the Milky Way, and twinkling stars, a few of them
// with lens flares.
function Galaxy() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div className="absolute inset-0 bg-[#020F0A]" />
      <div className="absolute inset-0 bg-[linear-gradient(160deg,transparent_30%,rgba(184,255,224,0.07)_45%,rgba(155,92,255,0.08)_55%,transparent_70%)]" />
      <div className="crash-live-nebula absolute -top-1/3 -left-1/4 size-[75%] rounded-full bg-[radial-gradient(circle,rgba(31,209,139,0.42),transparent_65%)] blur-2xl" />
      <div className="crash-live-nebula absolute -right-1/4 -bottom-1/2 size-[80%] rounded-full bg-[radial-gradient(circle,rgba(155,92,255,0.3),transparent_65%)] blur-2xl [animation-delay:-7s]" />
      <div className="crash-live-nebula absolute top-1/4 right-1/5 size-[40%] rounded-full bg-[radial-gradient(circle,rgba(62,232,255,0.2),transparent_65%)] blur-xl [animation-delay:-3s]" />
      {STARS.map((star, index) => (
        <span key={index} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${star.x}%`, top: `${star.y}%` }}>
          <span className={`block ${star.flare ? 'crash-live-flare' : 'crash-live-star'}`} style={{ '--delay': star.delay, '--twinkle': star.twinkle }}>
            {star.flare ? (
              <Flare size={star.size} colour={star.mint ? '#3DFFA8' : '#9FE8FF'} />
            ) : (
              <span
                className="block rounded-full"
                style={{ width: star.size, height: star.size, background: star.mint ? '#B8FFE0' : '#FFFFFF', boxShadow: `0 0 ${star.size * 2}px rgba(184,255,224,0.6)` }}
              />
            )}
          </span>
        </span>
      ))}
    </div>
  )
}

// "Sam", "Sam and Alex", "Sam, Alex and 3 more", as links.
function Names({ players }) {
  const shown = players.slice(0, players.length > 3 ? 2 : 3)
  const more = players.length - shown.length
  return shown.map((player, index) => (
    <Fragment key={player.userId}>
      {index > 0 && (index === shown.length - 1 && more === 0 ? ' and ' : ', ')}
      <Link to={`/users/${player.userId}`} className="font-semibold text-white hover:text-brand-gold">
        {player.user?.username ?? 'A member'}
      </Link>
      {index === shown.length - 1 && more > 0 && ` and ${more} more`}
    </Fragment>
  ))
}

const PLAY = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-gold px-5 font-bold text-ink transition hover:brightness-110'
const SPECTATE = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 font-semibold text-white backdrop-blur-sm transition hover:bg-white/20'

// An open Box Office Crash room, at the top of everyone's Notifications
// while anyone's in it (backend: games/crash/rooms.js lobbyView, kept live
// by hooks/useCrashLobby.js): who's playing and watching, whether a round
// is on, and the ways in, to play or to spectate (pages/Crash.jsx follows
// the link into the room). Green galaxy glass, its rim fading between green
// and red, a chart climbing, and the status flashing (index.css
// .crash-live).
export default function CrashLive({ room }) {
  const myId = String(getCurrentUserId())
  const players = room.players
  const spectators = room.spectators ?? []
  const here = [...players, ...spectators].some((player) => player.userId === myId)
  const link = (as) => `/games/crash?room=${room.id}&as=${as}`

  return (
    <article aria-label="Box Office Crash, live" className="crash-live relative overflow-hidden rounded-2xl border-2 p-5 sm:p-6">
      <Galaxy />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CrashLogo size={22} />
            <h2 className="font-['Bebas_Neue'] text-xl tracking-[0.2em] text-[#B8FFE0]">Box Office Crash</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1FD18B] px-2 text-[11px] font-semibold text-ink uppercase">
              <span className="relative flex size-1.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-1.5 rounded-full bg-white" />
              </span>
              Live
            </span>
          </div>
          <p className="crash-live-status font-['Bebas_Neue'] text-4xl leading-none tracking-wide">{room.playing ? 'Game in progress' : 'Waiting for game'}</p>

          <div className="mt-3 flex items-center gap-3">
            {players.length > 0 && (
              <div className="flex shrink-0 -space-x-3" aria-hidden="true">
                {players.slice(0, 4).map((player) => (
                  <span key={player.userId} className="rounded-full ring-2 ring-[#020F0A]">
                    <MemberAvatar user={player.user} size="sm" />
                  </span>
                ))}
              </div>
            )}
            <p className="min-w-0 text-white/90">
              {players.length === 0 ? (
                <>Nobody&apos;s playing yet: take a seat.</>
              ) : room.playing ? (
                <>
                  <Names players={players} /> {players.length === 1 ? 'is' : 'are'} playing right now.
                </>
              ) : (
                <>
                  <Names players={players} /> {players.length === 1 ? 'is' : 'are'} in the room. Jump in before the next round.
                </>
              )}
            </p>
          </div>
          <p className="mt-1 text-sm text-white/55 tabular-nums">
            {players.length}/{CRASH_RULES.roomSize} players{spectators.length > 0 && ` · ${spectators.length} watching`}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {here ? (
              <Link to="/games/crash" className={PLAY}>
                Back to the room
              </Link>
            ) : (
              <>
                {room.full ? (
                  <span className={`${PLAY} cursor-default opacity-50`}>Full</span>
                ) : (
                  <Link to={link('play')} className={PLAY}>
                    Play
                  </Link>
                )}
                <Link to={link('spectate')} className={SPECTATE}>
                  Spectate
                </Link>
              </>
            )}
          </div>
        </div>
        <Chart className="h-20 w-full shrink-0 sm:h-28 sm:w-56" />
      </div>
    </article>
  )
}
