const STYLES = [
  { id: 'glass', label: 'Glass' },
  { id: 'translucent', label: 'Translucent' },
  { id: 'opaque', label: 'Opaque' },
]

const PRESET_COLORS = [
  '#821131',
  '#C7253E',
  '#E85C0D',
  '#FABC3F',
  '#2D1B47',
  '#1A1024',
  '#14532D',
  '#1E3A5F',
]

function BannerPicker({ banner, onChange }) {
  const set = (patch) => onChange({ ...banner, ...patch })

  const labelClasses = 'mb-2 block text-sm font-medium text-white/70'

  const toggleClasses = (active) =>
    active
      ? 'rounded-md border border-brand-gold/60 bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-gold transition-colors'
      : 'rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white'

  return (
    <div className="space-y-5">

      <div>
        <span className={labelClasses}>Banner</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set({ type: 'color' })}
            className={toggleClasses(banner.type === 'color')}
          >
            Colour
          </button>
          <button
            type="button"
            onClick={() => set({ type: 'image' })}
            className={toggleClasses(banner.type === 'image')}
          >
            Image
          </button>
        </div>
      </div>

      {banner.type === 'color' ? (
        <div>
          <label htmlFor="bannerColor" className={labelClasses}>
            Colour
          </label>

          <div className="flex items-center gap-3">
            <input
              id="bannerColor"
              type="color"
              value={banner.color}
              onChange={(e) => set({ color: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded-md border border-white/10 bg-transparent p-1"
            />
            <span className="font-mono text-sm text-white/50">{banner.color}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => set({ color })}
                style={{ backgroundColor: color }}
                aria-label={`Use ${color}`}
                className={
                  banner.color.toLowerCase() === color.toLowerCase()
                    ? 'h-7 w-7 rounded-full ring-2 ring-brand-gold ring-offset-2 ring-offset-ink'
                    : 'h-7 w-7 rounded-full ring-1 ring-white/20 transition-transform hover:scale-110'
                }
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="bannerImage" className={labelClasses}>
            Image URL
          </label>
          <input
            id="bannerImage"
            type="url"
            placeholder="https://..."
            value={banner.imageUrl || ''}
            onChange={(e) => set({ imageUrl: e.target.value || null })}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10"
          />
          <p className="mt-1 text-xs text-white/30">
            A wide image works best. Animated GIFs are fine.
          </p>
        </div>
      )}

      <div>
        <span className={labelClasses}>Finish</span>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => set({ style: style.id })}
              className={toggleClasses(banner.style === style.id)}
            >
              {style.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/30">
          Glass blurs what is behind it. Translucent lets the card show through.
          Opaque is solid.
        </p>
      </div>

    </div>
  )
}

export default BannerPicker