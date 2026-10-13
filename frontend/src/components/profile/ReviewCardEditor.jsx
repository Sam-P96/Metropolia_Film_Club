import BannerPicker from './BannerPicker'

function ReviewCardEditor({ draft, onChange, onSave, onCancel }) {
  const inputClasses =
    'w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'

  const labelClasses = 'mb-2 block text-sm font-medium text-white/70'

  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">

      <h3 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">
        Edit review card
      </h3>

      {/* 1 column on small screens, 2 columns from md (768px) up */}
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">

        {/* Left column: text inputs */}
        <div className="space-y-5">
          <div>
            <label htmlFor="memberTitle" className={labelClasses}>
              Member title
            </label>
            <input
              id="memberTitle"
              type="text"
              maxLength={24}
              placeholder="Member"
              value={draft.memberTitle}
              onChange={(e) => onChange('memberTitle', e.target.value)}
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-white/30">
              {draft.memberTitle.length} / 24
            </p>
          </div>

          <div>
            <label htmlFor="avatarUrl" className={labelClasses}>
              Avatar image URL
            </label>
            <input
              id="avatarUrl"
              type="url"
              placeholder="https://..."
              value={draft.avatarUrl || ''}
              onChange={(e) => onChange('avatarUrl', e.target.value || null)}
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-white/30">
              Leave empty to use the letter circle.
            </p>
          </div>
        </div>

        {/* Right column: banner picker.
            Stacked = divider on top. Side by side = divider on the left. */}
        <div className="border-t border-white/10 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
          <BannerPicker
            banner={draft.reviewCardBanner}
            onChange={(banner) => onChange('reviewCardBanner', banner)}
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

export default ReviewCardEditor