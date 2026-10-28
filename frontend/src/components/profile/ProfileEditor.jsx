import SettingRow from './SettingRow'
import PillToggle from '../PillToggle'

// Match the limits in backend/controllers/userControllers.js.
const USERNAME_LIMIT = 30
const BIO_LIMIT = 300

const PRIVACY_OPTIONS = [
  {
    id: 'public',
    label: 'Public',
    description: 'Anyone can see your profile, reviews and favourites.',
  },
  {
    id: 'friends',
    label: 'Friends only',
    description:
      'Only friends (members you follow who follow you back) can see your profile. Your reviews still appear on the site.',
  },
  {
    id: 'private',
    label: 'Private',
    description: 'Only you can see your profile. Your reviews still appear on the site.',
  },
]

// Matches FOLLOW_PRIVACY_OPTIONS in backend/controllers/userControllers.js.
const FOLLOW_PRIVACY_OPTIONS = [
  {
    id: 'public',
    label: 'Public',
    description: 'Anyone can open your Followers and Following lists.',
  },
  {
    id: 'friends',
    label: 'Friends only',
    description: 'Only your friends can open them.',
  },
  {
    id: 'nobody',
    label: 'Nobody',
    description: 'Hidden from everyone. A friend who opens them only sees their own name.',
  },
]

// Matches FEED_BACKGROUNDS in backend/controllers/userControllers.js.
const FEED_BACKGROUNDS = [
  { value: 'default', label: 'Default' },
  { value: 'white', label: 'White' },
  { value: 'dark', label: 'Dark' },
]

const FEED_BACKGROUND_NOTES = {
  default: 'The glowing background from Upcoming events, under a dark glass.',
  white: 'Plain white.',
  dark: 'The dark purple the rest of the site uses.',
}

// A stack of options with one picked, each with a line saying what it means.
function ChoiceList({ label, options, value, onChange }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-white/70">{label}</span>

      <div className="space-y-2">
        {options.map((option) => {
          const active = value === option.id

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={
                active
                  ? 'w-full rounded-md border border-brand-gold/60 bg-white/10 px-4 py-3 text-left transition-colors'
                  : 'w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-white/25 hover:bg-white/10'
              }
            >
              <span
                className={
                  active
                    ? 'block text-sm font-medium text-brand-gold'
                    : 'block text-sm font-medium text-white'
                }
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-white/40">
                {option.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProfileEditor({ draft, onChange, onSave, onCancel }) {
  const labelClasses = 'mb-2 block text-sm font-medium text-white/70'

  const bioLength = draft.bio ? draft.bio.length : 0

  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">

      <h3 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">
        Edit profile
      </h3>

      <div className="space-y-6">

        <div>
          <label htmlFor="username" className={labelClasses}>
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            maxLength={USERNAME_LIMIT}
            value={draft.username || ''}
            onChange={(e) => onChange('username', e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10"
          />
        </div>

        <div>
          <label htmlFor="bio" className={labelClasses}>
            Bio
          </label>
          <textarea
            id="bio"
            rows={4}
            maxLength={BIO_LIMIT}
            placeholder="A line or two about what you watch."
            value={draft.bio || ''}
            onChange={(e) => onChange('bio', e.target.value)}
            className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10"
          />
          <p className="mt-1 text-xs text-white/30">
            {bioLength} / {BIO_LIMIT}
          </p>
        </div>

        <div className="border-t border-white/10 pt-5">
          <ChoiceList
            label="Who can see your profile"
            options={PRIVACY_OPTIONS}
            value={draft.privacy}
            onChange={(privacy) => onChange('privacy', privacy)}
          />
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-white/10 pt-5">
          <div>
            <p className="text-sm font-medium text-white/70">Notifications background</p>
            <p className="mt-0.5 text-xs text-white/40">
              {FEED_BACKGROUND_NOTES[draft.feedBackground ?? 'default']}
            </p>
          </div>

          <div className="shrink-0">
            <PillToggle
              options={FEED_BACKGROUNDS}
              value={draft.feedBackground ?? 'default'}
              onChange={(feedBackground) => onChange('feedBackground', feedBackground)}
              label="Notifications background"
            />
          </div>
        </div>

        <div className="border-t border-white/10 pt-5">
          <ChoiceList
            label="Who can see your followers and following"
            options={FOLLOW_PRIVACY_OPTIONS}
            value={draft.followPrivacy ?? 'public'}
            onChange={(followPrivacy) => onChange('followPrivacy', followPrivacy)}
          />
        </div>

        <div className="space-y-5 border-t border-white/10 pt-5">
          <SettingRow
            label="PVP"
            description={
              draft.pvp
                ? 'You can like and dislike. Other members with PVP on can dislike your reviews and comments.'
                : "You can only like, and dislikes you've given stop counting. Nobody can dislike your reviews or comments, and dislikes you already have don't count."
            }
            on={draft.pvp}
            onChange={(on) => onChange('pvp', on)}
          />

          <SettingRow
            label="Comments on your reviews"
            description={
              draft.allowComments
                ? 'Members can comment on your reviews. You can still turn them off for one review from its page.'
                : 'Comments under all your reviews are hidden, not deleted. Turning this back on brings them back.'
            }
            on={draft.allowComments}
            onChange={(on) => onChange('allowComments', on)}
          />
        </div>

      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onSave}
          className="rounded-md bg-brand-red px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
        >
          Cancel
        </button>
      </div>

    </div>
  )
}

export default ProfileEditor