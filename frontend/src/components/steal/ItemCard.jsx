import { SwordArt, ShieldArt } from './StealLogo'
import { tierColour } from './style'

// A colour as rgba, from "#RRGGBB" and an opacity from 0 to 1.
function rgba(hex, alpha) {
  const value = parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

// The card's glass, tinted the colour of the item's tier (grey, green,
// blue, purple, gold) over the dark of the page: strongest in the top-left
// corner and fading out, with a thin light edge along the top, like light
// catching glass. Kept dim, so a shelf of Legendaries doesn't glare. It's
// a tint, not a real backdrop blur: these cards slide around, and a moving
// blur flickers.
//
// Hovering over it makes it glow its tier's colour, and its edge brighten.
// The edge and the shadows are CSS variables (`--edge`, `--rest` and their
// hover versions) so the card's classes can ease between them; a plain
// inline style would win over any hover.
function glass(colour, { stone, highlight }) {
  const inner = `inset 0 1px 0 ${rgba(colour, 0.28)}, inset 0 0 22px ${rgba(colour, 0.06)}`
  const equipped = highlight ? `, 0 0 18px ${rgba('#FABC3F', 0.35)}` : ''
  const glow = `, 0 0 22px ${rgba(colour, stone ? 0.5 : 0.4)}, 0 0 4px ${rgba(colour, 0.35)}`
  return {
    '--edge': rgba(colour, stone ? 0.75 : 0.4),
    '--edge-hover': rgba(colour, stone ? 0.95 : 0.75),
    '--rest': `${inner}${equipped}`,
    '--glow': `${inner}${glow}${equipped}`,
    backgroundColor: 'rgba(11, 7, 16, 0.55)',
    backgroundImage: `linear-gradient(145deg, ${rgba(colour, stone ? 0.24 : 0.18)} 0%, ${rgba(colour, 0.07)} 55%, ${rgba(colour, 0.02)} 100%)`,
  }
}

// One Steal and Defend item: what it is, its tier and type, what it does,
// how much durability it has left, and whatever buttons go with it
// (`children`). `compact` for the equip slots.
export default function ItemCard({ item, children, compact = false, highlight = false }) {
  const colour = tierColour(item.tier)
  const max = item.maxDurability ?? item.durability
  const left = item.durability ?? max
  const share = max ? Math.max(0, Math.min(1, left / max)) : 1

  return (
    <article
      className="flex h-full flex-col gap-2 rounded-xl border p-3 [border-color:var(--edge)] [box-shadow:var(--rest)] transition-[box-shadow,border-color] duration-400 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:[border-color:var(--edge-hover)] hover:[box-shadow:var(--glow)]"
      style={glass(colour, { stone: item.unique, highlight })}
    >
      <div className="flex items-start gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-dice-ivory" aria-hidden="true">
          {item.type === 'attack' ? <SwordArt size={22} /> : <ShieldArt size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-white" title={item.name}>
            {item.name}
          </h3>
          <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: colour }}>
            {item.tier}
            {item.unique ? ' · Infinity Stone' : ''} · {item.type === 'attack' ? 'Attack' : 'Defense'}
          </p>
        </div>
      </div>

      {!compact && <p className="text-xs leading-snug text-white/70">{item.effect}</p>}

      {item.maxDurability !== undefined && (
        <div className="mt-auto">
          <div className="flex justify-between text-[11px] text-white/50">
            <span>Durability</span>
            <span className="tabular-nums">
              {left}/{max}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${share * 100}%`, background: colour }} />
          </div>
        </div>
      )}

      {children && <div className={`${item.maxDurability === undefined ? 'mt-auto' : ''} flex flex-wrap gap-2 pt-1`}>{children}</div>}
    </article>
  )
}
