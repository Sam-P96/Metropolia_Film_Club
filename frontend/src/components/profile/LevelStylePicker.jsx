import {
  DEFAULT_LEVEL_STYLE,
  LEVEL_BACKINGS,
  LEVEL_EFFECTS,
  LEVEL_FONTS,
  LEVEL_SHAPES,
} from '../../utils/levelStyle'

const TEXT_COLORS = [
  '#FFFFFF',
  '#FABC3F',
  '#E85C0D',
  '#C7253E',
  '#FF6AD5',
  '#5CE1E6',
  '#A3E635',
  '#0B0710',
]

const EFFECT_COLORS = [
  '#000000',
  '#FFFFFF',
  '#FABC3F',
  '#C7253E',
  '#FF2DAA',
  '#00E5FF',
  '#8B5CF6',
  '#39FF14',
]

const labelClasses = 'mb-2 block text-sm font-medium text-white/70'

const toggleClasses = (active) =>
  active
    ? 'rounded-md border border-brand-gold/60 bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-gold transition-colors'
    : 'rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white'

function ColorField({ id, label, value, presets, onChange }) {
  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>

      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-white/10 bg-transparent p-1"
        />
        <span className="font-mono text-sm text-white/50">{value}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            aria-label={`Use ${color}`}
            className={
              value.toLowerCase() === color.toLowerCase()
                ? 'h-7 w-7 rounded-full ring-2 ring-brand-gold ring-offset-2 ring-offset-ink'
                : 'h-7 w-7 rounded-full ring-1 ring-white/20 transition-transform hover:scale-110'
            }
          />
        ))}
      </div>
    </div>
  )
}

// How "Level: X" looks when someone hovers over the avatar on this member's
// review card. Every option works with every other.
function LevelStylePicker({ levelStyle, onChange }) {
  const style = { ...DEFAULT_LEVEL_STYLE, ...levelStyle }
  const set = (patch) => onChange({ ...style, ...patch })

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-white">Level text</h4>
          <p className="mt-1 text-xs text-white/30">
            Shows on the left of your banner when someone hovers over your avatar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChange(DEFAULT_LEVEL_STYLE)}
          className={toggleClasses(false)}
        >
          Reset to default
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">

        <div className="space-y-5">
          <div>
            <span className={labelClasses}>Font</span>
            <div className="flex flex-wrap gap-2">
              {LEVEL_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => set({ font: font.id })}
                  className={toggleClasses(style.font === font.id)}
                >
                  <span
                    style={{ fontFamily: font.family, fontWeight: font.weight, fontSize: font.size }}
                  >
                    {font.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={labelClasses}>Effect</span>
            <div className="flex flex-wrap gap-2">
              {LEVEL_EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  type="button"
                  onClick={() => set({ effect: effect.id })}
                  className={toggleClasses(style.effect === effect.id)}
                >
                  {effect.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={labelClasses}>Backing</span>
            <div className="flex flex-wrap gap-2">
              {LEVEL_BACKINGS.map((backing) => (
                <button
                  key={backing.id}
                  type="button"
                  onClick={() => set({ backing: backing.id })}
                  className={toggleClasses(style.backing === backing.id)}
                >
                  {backing.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/30">
              Glass is clear with a shine. Frosted glass is milky and blurs what is behind it.
            </p>
          </div>

          {style.backing !== 'none' && (
            <div>
              <span className={labelClasses}>Shape</span>
              <div className="flex flex-wrap gap-2">
                {LEVEL_SHAPES.map((shape) => (
                  <button
                    key={shape.id}
                    type="button"
                    onClick={() => set({ shape: shape.id })}
                    className={toggleClasses(style.shape === shape.id)}
                  >
                    {shape.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stacked = divider on top. Side by side = divider on the left. */}
        <div className="space-y-5 border-t border-white/10 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
          <ColorField
            id="levelTextColor"
            label="Text colour"
            value={style.textColor}
            presets={TEXT_COLORS}
            onChange={(textColor) => set({ textColor })}
          />

          {style.effect !== 'none' && (
            <ColorField
              id="levelEffectColor"
              label={style.effect === 'glow' ? 'Glow colour' : 'Shadow colour'}
              value={style.effectColor}
              presets={EFFECT_COLORS}
              onChange={(effectColor) => set({ effectColor })}
            />
          )}
        </div>

      </div>
    </div>
  )
}

export default LevelStylePicker
