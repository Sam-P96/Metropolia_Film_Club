import { useState } from 'react'
import { Link } from 'react-router-dom'

import useApi from '../hooks/useApi'
import { getUser, updateMe } from '../services/users'
import { getCurrentUserId } from '../utils/currentUser'

// Every picture in assets/SECRETpfp, found when the site is built, so adding
// one to the folder adds a card. Nothing links here: it's only at /SECRETpfp.
const IMAGES = import.meta.glob('../assets/SECRETpfp/*.{png,jpg,jpeg,gif,webp}', {
  eager: true,
  import: 'default',
})

// A profile only takes web links (http:// or https://), so a picture's built
// path ("/assets/...") gets this site's address in front.
const linkTo = (src) => new URL(src, window.location.origin).href

// { name, src, url } for each, A to Z. The name is the file name without its
// extension; `url` is what's saved on a profile.
const PICTURES = Object.entries(IMAGES)
  .map(([path, src]) => ({ name: path.split('/').pop().replace(/\.[^.]+$/, ''), src, url: linkTo(src) }))
  .sort((a, b) => a.name.localeCompare(b.name))

// Filled gold for the one in use, outlined otherwise, like Attend.
const buttonClasses = (chosen) =>
  `rounded-md border px-3 py-2 text-center text-xs font-medium transition-colors disabled:cursor-default ${
    chosen
      ? 'border-brand-gold bg-brand-gold text-ink'
      : 'border-brand-gold/60 text-brand-gold hover:bg-brand-gold/10'
  }`

// A card with a review card's look and proportions, but standing upright
// (5 wide to 7 tall): the picture in a circle, its name along the bottom,
// and buttons to make it your profile picture or banner. `me` is the
// logged-in member's profile (undefined while it loads, or when logged
// out); `onSaved` gets it back after a change. Logged-out visitors are sent
// to log in first, then back here.
function PictureCard({ name, src, url, me, isAuthenticated, onSaved }) {
  // null, 'avatar' or 'banner'.
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState(null)

  const isAvatar = me?.avatarUrl === url
  const isBanner = me?.reviewCardBanner?.type === 'image' && me.reviewCardBanner.imageUrl === url

  // The banner keeps their colour and style; only the image changes.
  const save = async (kind) => {
    setSaving(kind)
    setError(null)

    try {
      const changes =
        kind === 'avatar'
          ? { avatarUrl: url }
          : { reviewCardBanner: { ...me.reviewCardBanner, type: 'image', imageUrl: url } }
      onSaved(await updateMe(changes))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const options = [
    { kind: 'avatar', label: 'Make profile picture', chosenLabel: '✓ Profile picture', chosen: isAvatar },
    { kind: 'banner', label: 'Make banner', chosenLabel: '✓ Banner', chosen: isBanner },
  ]

  return (
    <article className="flex aspect-5/7 w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-plum/40 text-white shadow-xl shadow-black/40 backdrop-blur-md">
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <img
          src={src}
          alt={name}
          className="aspect-square w-full rounded-full bg-white object-cover shadow-xl shadow-black/40 ring-4 ring-white/20"
        />
      </div>

      <div className="border-t border-white/10 bg-ink/40 px-5 py-4 text-center">
        <p className="truncate font-semibold">{name}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {options.map((option) =>
            isAuthenticated ? (
              <button
                key={option.kind}
                type="button"
                onClick={() => save(option.kind)}
                disabled={!me || saving !== null || option.chosen}
                aria-pressed={option.chosen}
                className={`${buttonClasses(option.chosen)} ${saving === option.kind ? 'opacity-60' : ''}`}
              >
                {saving === option.kind ? 'Saving…' : option.chosen ? option.chosenLabel : option.label}
              </button>
            ) : (
              <Link
                key={option.kind}
                to="/login"
                state={{ from: '/SECRETpfp' }}
                className={buttonClasses(false)}
              >
                {option.label}
              </Link>
            )
          )}
        </div>

        {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}
      </div>
    </article>
  )
}

function SecretPfp({ isAuthenticated }) {
  const myId = isAuthenticated ? getCurrentUserId() : null

  // Their own profile: which picture and banner are in use now, and the
  // banner colour and style to keep.
  const { data: me, setData: setMe } = useApi(() => getUser(myId), [myId], { enabled: Boolean(myId) })

  return (
    <section className="text-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <h1 className="sr-only">Secret profile pictures</h1>

        {/* One a row on phones, two on tablets, three from 1024px up. */}
        <div className="grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PICTURES.map((picture) => (
            <PictureCard
              key={picture.name}
              {...picture}
              me={me}
              isAuthenticated={isAuthenticated}
              onSaved={setMe}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default SecretPfp
