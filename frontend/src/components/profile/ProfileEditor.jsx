const BIO_LIMIT = 280

const PRIVACY_OPTIONS = [
  {
    id: 'public',
    label: 'Public',
    description: 'Anyone can see your profile, reviews and favourites.',
  },
  {
    id: 'friends',
    label: 'Friends only',
    description: 'Not built yet — this currently behaves exactly like Private.',
  },
  {
    id: 'private',
    label: 'Private',
    description: 'Only you can see your profile. Your reviews still appear on the site.',
  },
]

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
          <span className={labelClasses}>Who can see your profile</span>

          <div className="space-y-2">
            {PRIVACY_OPTIONS.map((option) => {
              const active = draft.privacy === option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange('privacy', option.id)}
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