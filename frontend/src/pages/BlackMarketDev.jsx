import '@fontsource/bebas-neue'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import PillToggle from '../components/PillToggle'
import ProfileHeading from '../components/profile/ProfileHeading'
import ReviewCard from '../components/reviews/ReviewCard'
import LeaderboardRow from '../components/leaderboard/LeaderboardRow'
import { edgeOf } from '../components/leaderboard/edges'
import StyledAvatar from '../components/cosmetics/StyledAvatar'
import StyledUsername from '../components/cosmetics/StyledUsername'
import { CosmeticsStill } from '../components/cosmetics/stillCosmetics'
import StoneControls from '../components/firstPlace/StoneControls'
import { FirstPlacePreview } from '../components/firstPlace/firstPlaceStore'
import { OnOffSwitch } from '../components/profile/SettingRow'
import CoinIcon from '../components/wallet/CoinIcon'
import useApi from '../hooks/useApi'
import { checkDevAccess } from '../services/blackMarket'
import { ALL_ITEMS, BORDER_ITEMS, CATEGORIES, NAME_ITEMS } from '../../../shared/cosmetics/catalogue.js'
import { defaultFirstPlaceFx } from '../../../shared/firstPlace/config.js'

const PANEL = 'rounded-2xl border border-white/10 bg-ink/60 p-4 shadow-xl shadow-black/40 backdrop-blur-xl sm:p-5'
const HEADING = 'text-xs font-semibold tracking-widest text-white/50 uppercase'
const FIELD = 'w-full rounded-lg border border-white/15 bg-ink/70 px-3 py-2 text-sm text-white focus:border-brand-gold focus:outline-none'

const GLOWS = [
  { value: 'none', label: 'None' },
  { value: 'friend', label: 'Friends glow' },
  { value: 'soul', label: 'Soul glow' },
]
const BANNERS = {
  default: { type: 'color', color: '#2D1B47', imageUrl: null, style: 'opaque' },
  light: { type: 'color', color: '#F4EBD6', imageUrl: null, style: 'opaque' },
  dark: { type: 'color', color: '#0B0710', imageUrl: null, style: 'opaque' },
}
const BANNER_OPTIONS = [
  { value: 'default', label: 'Default banner' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const FAKE_NAMES = [
  'Kaveri', 'King Loan Shark', 'popcornqueen', 'Bret Maverick', 'ReelTalk', 'a', 'NoirNerd', 'jumpscare_jenny', 'CinemaSins_Fan_2009',
  'mo', 'FinalGirl', 'taranamagkapela', 'creditsroller', 'SubtitleSnob', 'ozu', 'dollyzoom', 'Kubrickstare', 'ghibliheart', 'lensflare',
  'MidnightMatinee', 'cutToBlack', 'theusualsuspect', 'X', 'Sakura_no_Hana', 'filmgrainfiend', 'TwistEnding', 'boxofficebomb', 'Rewinder',
  'LongTakeLarry', 'mcguffin', 'directorscut', 'slowburn', 'deep_focus', 'crashzoom', 'establishingshot', 'b-movie-baron', 'TechnicolorDream',
  'fadeout', 'macguffinhunter', 'StopMotionSam', 'nitrate', 'cineast', 'Overture', 'popcornpatrol', 'quietplace', 'montageman', 'TheThirdMan',
  'Clapper', 'reelmeal', 'TrailerTrash',
]
const BANNER_COLOURS = ['#2D1B47', '#821131', '#1F5C3A', '#24225C', '#5C3A1F', '#3A1F5C', '#0B5563', '#4A2040']
// Titles the test member can pretend to hold, for the First Place effect's
// tooltip (the real ones are in backend/utils/firstPlace.js).
const TEST_TITLES = ['#1 PP', '#1 Critic', '#1 Controversial', '#1 Level']

const fakeUser = (i, name, banner) => ({
  _id: `preview-${i}`,
  username: name,
  memberTitle: i === 0 ? 'Test subject' : 'Member',
  avatarUrl: null,
  reviewCardBanner: banner ?? { type: 'color', color: BANNER_COLOURS[i % BANNER_COLOURS.length], imageUrl: null, style: 'opaque' },
  levelStyle: { textColor: '#FFFFFF', effect: 'shadow', effectColor: '#000000', backing: 'none', shape: 'round', font: 'default' },
  pvp: false,
  showRank: true,
  rank: i === 0 ? 1 : null,
  level: 12,
  bans: {},
  canBan: false,
  cosmetics: { name: null, border: null },
})

const randomOf = (items) => items[Math.floor(Math.random() * items.length)].id
const byCategory = (items) => CATEGORIES.map((category) => [category, items.filter((item) => item.category === category)])
const label = (item) => (item.price ? `${item.name} · ${item.price.toLocaleString('en-US')} P-PP · ${item.reviews} reviews` : `${item.name} · free`)

// A picker of every name style or every border, grouped by category, with
// each one's price and review requirement.
function Picker({ id, title, items, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80" htmlFor={id}>
      {title}
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={FIELD}>
        {byCategory(items).map(([category, list]) => (
          <optgroup key={category} label={category}>
            {list.map((item) => (
              <option key={item.id} value={item.id}>
                {label(item)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

function Toggle({ checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-brand-gold" />
      {children}
    </label>
  )
}

// Every name style and border, each labelled, at the size they're shown on
// a leaderboard.
function Gallery({ name }) {
  const me = fakeUser(0, name)
  return (
    <section className={PANEL} aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
        Gallery
      </h2>
      <p className="mt-1 text-sm text-white/60">Every item, at leaderboard size: names in the row&apos;s font, borders round a 40px picture.</p>
      {[
        ['Name styles', NAME_ITEMS],
        ['Borders', BORDER_ITEMS],
      ].map(([title, items]) => (
        <div key={title} className="mt-5">
          <h3 className={HEADING}>
            {title} ({items.length})
          </h3>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="flex min-w-0 flex-col gap-2 rounded-xl border border-white/10 bg-plum/40 p-3">
                <div className="flex min-h-16 items-center justify-center rounded-lg bg-ink/70 px-3 py-4">
                  {item.type === 'name' ? (
                    <span className="max-w-full text-center font-medium text-white">
                      <StyledUsername name={name} styleId={item.id} />
                    </span>
                  ) : (
                    <StyledAvatar borderId={item.id} user={me} />
                  )}
                </div>
                <p className="flex items-center justify-between gap-2 text-xs text-white/60">
                  <span className="font-semibold text-white">{item.name}</span>
                  <span className="flex shrink-0 items-center gap-1 tabular-nums">
                    {item.price ? (
                      <>
                        <CoinIcon kind="ppp" size={12} />
                        {item.price.toLocaleString('en-US')} · {item.reviews}r
                      </>
                    ) : (
                      'Free'
                    )}
                  </span>
                </p>
                <p className="font-mono text-[0.65rem] text-white/40">{item.id}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

// The Black Market's developer test tool (admins only: the server says so),
// from the Black Market page. Made-up members only: it reads and writes
// nothing. The previews are the site's real leaderboard row, review card and
// profile heading, on the site's own background, wearing whatever's picked.
export default function BlackMarketDev() {
  const access = useApi(() => checkDevAccess(), [])
  const [nameId, setNameId] = useState('name.fire.classic')
  const [borderId, setBorderId] = useState('border.fire.classic')
  const [testName, setTestName] = useState('taranamagkapela')
  const [resonance, setResonance] = useState(true)
  const [glow, setGlow] = useState('none')
  const [banner, setBanner] = useState('default')
  const [rowCount, setRowCount] = useState(10)
  const [randomised, setRandomised] = useState({})
  const [still, setStill] = useState(false)
  // The First Place effect on the test member, as if they held `fpTitles`.
  const [fpOn, setFpOn] = useState(false)
  const [fpTitles, setFpTitles] = useState(['#1 PP'])
  const [fpSettings, setFpSettings] = useState(defaultFirstPlaceFx)

  const name = testName.trim() || 'Member'
  const cosmetics = { name: nameId, border: borderId }
  const me = useMemo(() => ({ ...fakeUser(0, name, BANNERS[banner]) }), [name, banner])
  const firstPlace = fpOn && fpTitles.length > 0 ? { [me._id]: { titles: TEST_TITLES.filter((title) => fpTitles.includes(title)), settings: fpSettings } } : {}

  const rows = Array.from({ length: rowCount }, (_, i) => {
    if (i === 0) return { user: me, cosmetics, resonancePercent: resonance ? 93 : undefined }
    const user = fakeUser(i, FAKE_NAMES[(i - 1) % FAKE_NAMES.length])
    return { user, cosmetics: randomised[i] ?? { name: null, border: null } }
  })

  function randomise() {
    const next = {}
    for (let i = 1; i < 50; i++) next[i] = { name: randomOf(NAME_ITEMS), border: randomOf(BORDER_ITEMS) }
    setRandomised(next)
  }

  if (access.loading) return <section className="px-8 py-24 text-center text-white/50">Loading…</section>
  if (access.error) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-12 text-white/70">
        {access.error.status === 403 ? 'This page is for admins.' : "Couldn't load it. Try refreshing the page."}
      </section>
    )
  }

  const review = {
    _id: 'preview-review',
    filmTitle: 'Dune: Part Two',
    filmYear: 2024,
    rating: 4.5,
    text: 'The sound design alone is worth the ticket. Bring earplugs and a friend who likes sand.',
    createdAt: new Date().toISOString(),
    likeCount: 0,
    dislikeCount: 0,
    user: me,
  }
  const resonancePercent = resonance ? 93 : undefined

  return (
    <CosmeticsStill.Provider value={still}>
      <FirstPlacePreview.Provider value={firstPlace}>
        <section className={`mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 text-white sm:py-12 ${still ? 'cos-still' : ''}`}>
          <header>
            <Link to="/games/loan-shark/black-market" className="text-sm text-white/60 hover:text-white">
              ← Black Market
            </Link>
            <h1 className="mt-2 font-['Bebas_Neue'] text-5xl leading-none tracking-wide">
              Developer <span className="text-sky-300">test tool</span>
            </h1>
            <p className="mt-2 max-w-3xl text-white/60">
              Every cosmetic on the site&apos;s real leaderboard row, review card and profile heading, with made-up members. Nothing here reads or writes
              anyone&apos;s data. {ALL_ITEMS.length} items in the catalogue.
            </p>
          </header>

          <section className={`${PANEL} grid gap-4 sm:grid-cols-2`} aria-label="Controls">
            <Picker id="name-style" title="Name style" items={NAME_ITEMS} value={nameId} onChange={setNameId} />
            <Picker id="border-style" title="Border" items={BORDER_ITEMS} value={borderId} onChange={setBorderId} />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
              Test username
              <input value={testName} onChange={(event) => setTestName(event.target.value)} className={FIELD} placeholder="Type a short or a very long name" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
              Leaderboard rows: {rowCount}
              <input type="range" min="5" max="50" value={rowCount} onChange={(event) => setRowCount(Number(event.target.value))} className="accent-brand-gold" />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white/80">Review card glow</span>
              <PillToggle options={GLOWS} value={glow} onChange={setGlow} label="Review card glow" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white/80">Test member&apos;s banner</span>
              <PillToggle options={BANNER_OPTIONS} value={banner} onChange={setBanner} label="Test member's banner" />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:col-span-2">
              <Toggle checked={resonance} onChange={setResonance}>
                Resonance icon (Soul Resonance: 93%)
              </Toggle>
              <Toggle checked={still} onChange={setStill}>
                Reduce motion
              </Toggle>
              <button type="button" onClick={randomise} className="rounded-lg bg-brand-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-white">
                Randomise all rows
              </button>
              {Object.keys(randomised).length > 0 && (
                <button type="button" onClick={() => setRandomised({})} className="text-sm text-white/60 hover:text-white">
                  Clear
                </button>
              )}
            </div>
          </section>

          <section className={`${PANEL} flex flex-col gap-4`} aria-labelledby="first-place-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="first-place-heading" className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
                  First Place <span className="fp-infinity font-sans">∞</span> effect
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  The test member as if they held a First Place title: it takes their name style&apos;s place on the leaderboard, review cards and
                  profile below. Off, or with no title, the name style shows again.
                </p>
              </div>
              <Toggle checked={fpOn} onChange={setFpOn}>
                Test member holds a title
              </Toggle>
            </div>
            {fpOn && (
              <>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {TEST_TITLES.map((title) => (
                    <Toggle
                      key={title}
                      checked={fpTitles.includes(title)}
                      onChange={(on) => setFpTitles(on ? [...fpTitles, title] : fpTitles.filter((held) => held !== title))}
                    >
                      {title}
                    </Toggle>
                  ))}
                  <span className="flex items-center gap-2 text-sm text-white/80">
                    Effect on
                    <OnOffSwitch on={fpSettings.enabled} onChange={(enabled) => setFpSettings({ ...fpSettings, enabled })} label="First Place effect" />
                  </span>
                  <button type="button" onClick={() => setFpSettings(defaultFirstPlaceFx())} className="text-sm text-white/60 hover:text-white">
                    Reset to default
                  </button>
                </div>
                <StoneControls value={fpSettings} onChange={setFpSettings} />
              </>
            )}
          </section>

          <section aria-labelledby="leaderboard-heading">
            <h2 id="leaderboard-heading" className={HEADING}>
              Leaderboard
            </h2>
            <ol className="mt-3 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
              {rows.map((row, i) => (
                <LeaderboardRow
                  key={row.user._id}
                  user={row.user}
                  position={i + 1}
                  edge={edgeOf(i, rows.length)}
                  cosmetics={row.cosmetics}
                  resonancePercent={row.resonancePercent}
                  score={
                    <p className="flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums text-emerald-300">
                      <CoinIcon kind="pp" size={16} />
                      {(12480 - i * 211).toLocaleString('en-US')} PP
                    </p>
                  }
                />
              ))}
            </ol>
          </section>

          <section aria-labelledby="review-heading">
            <h2 id="review-heading" className={HEADING}>
              Review card
            </h2>
            <div className="mt-3 max-w-xl">
              <ReviewCard review={review} cosmetics={cosmetics} glow={glow} resonancePercent={resonancePercent} />
            </div>
          </section>

          <section aria-labelledby="profile-heading">
            <h2 id="profile-heading" className={HEADING}>
              Profile page
            </h2>
            <div className="mt-3 flex flex-col gap-8 lg:flex-row lg:items-start">
              <div className="w-120 max-w-full shrink-0">
                <ReviewCard review={review} cosmetics={cosmetics} glow={glow} resonancePercent={resonancePercent} />
              </div>
              <div className="min-w-0 flex-1">
                <ProfileHeading name={name} profileUser={me} isOwner cosmetics={cosmetics} resonancePercent={resonancePercent} />
                <p className="mt-1 text-sm text-brand-gold">{me.memberTitle}</p>
                <p className="mt-4 text-sm text-white/40">Member since November 2026</p>
              </div>
            </div>
          </section>

          <Gallery name={name} />
        </section>
      </FirstPlacePreview.Provider>
    </CosmeticsStill.Provider>
  )
}
