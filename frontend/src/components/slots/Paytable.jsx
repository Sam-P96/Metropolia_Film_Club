import { SLOTS } from '../../../../shared/slots/config.js'
import PaylineDiagram from './PaylineDiagram'
import { SymbolTile } from './SymbolArt'

const RARITY_COLOUR = {
  Common: 'text-white/50',
  Uncommon: 'text-emerald-300',
  Rare: 'text-sky-300',
  Epic: 'text-fuchsia-300',
  Legendary: 'text-brand-gold',
}

const times = (pay) => `${pay.toLocaleString('en-US')}×`

// What 5 in a row pays: the jackpot for the logo.
function FivePays({ symbol, compact }) {
  if (!symbol.jackpot) return times(symbol.pays[2])
  return (
    <span className="font-['Bebas_Neue'] tracking-wide text-brand-gold drop-shadow-[0_0_8px_rgba(250,188,63,0.6)]">
      {compact ? 'Jackpot' : `Jackpot · ${times(SLOTS.jackpotMultiplier)}`}
    </span>
  )
}

// The paylines, each drawn (with its name, unless `named` is false).
export function Paylines({ width = 56, named = true, className = 'gap-x-4 gap-y-2' }) {
  return (
    <ul className={`flex flex-wrap justify-center ${className}`}>
      {SLOTS.paylines.map((line) => (
        <li key={line.key} className="flex flex-col items-center gap-1">
          <PaylineDiagram rows={line.rows} name={line.name} width={width} />
          {named && <span className="text-[0.65rem] tracking-wider text-white/50 uppercase">{line.name}</span>}
        </li>
      ))}
    </ul>
  )
}

// The full paytable, common to legendary, for How to Play.
export default function Paytable() {
  return (
    <table className="w-full text-left tabular-nums">
      <thead className="text-xs tracking-widest text-white/50 uppercase">
        <tr>
          <th className="py-1 font-medium">Symbol</th>
          <th className="py-1 text-right font-medium">3</th>
          <th className="py-1 text-right font-medium">4</th>
          <th className="py-1 text-right font-medium">5</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {SLOTS.symbols.map((symbol) => (
          <tr key={symbol.key}>
            <td className="py-2">
              <span className="flex items-center gap-2.5">
                <SymbolTile symbolKey={symbol.key} size={36} />
                <span className="min-w-0">
                  <span className="block text-white">{symbol.name}</span>
                  <span className={`block text-[0.65rem] tracking-widest uppercase ${RARITY_COLOUR[symbol.rarity]}`}>
                    {symbol.rarity}
                    {symbol.key === SLOTS.link.by && ' · links Maps & Rings'}
                  </span>
                </span>
              </span>
            </td>
            <td className="py-2 text-right text-white/80">{times(symbol.pays[0])}</td>
            <td className="py-2 text-right text-white/80">{times(symbol.pays[1])}</td>
            <td className="py-2 text-right font-semibold text-white">
              <FivePays symbol={symbol} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// The simplified paytable on the machine: what 3, 4 and 5 pay, the
// Gauntlet link, and the lines. Small enough for one phone screen.
export function CompactPaytable() {
  return (
    <div className="flex flex-col gap-2.5">
      <table className="w-full tabular-nums">
        <thead className="text-[0.65rem] tracking-widest text-white/50 uppercase">
          <tr>
            <th className="pb-1 text-left font-medium">
              <span className="sr-only">Symbol</span>
            </th>
            <th className="pb-1 text-right font-medium">×3</th>
            <th className="pb-1 text-right font-medium">×4</th>
            <th className="pb-1 text-right font-medium">×5</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {SLOTS.symbols.map((symbol) => (
            <tr key={symbol.key} className="border-t border-white/5">
              <td className="py-px">
                <span className="flex items-center gap-2">
                  <SymbolTile symbolKey={symbol.key} size={24} />
                  <span className="sr-only">{symbol.name}</span>
                </span>
              </td>
              <td className="py-px text-right text-white/80">{times(symbol.pays[0])}</td>
              <td className="py-px text-right text-white/80">{times(symbol.pays[1])}</td>
              <td className="py-px text-right font-semibold text-white">
                <FivePays symbol={symbol} compact />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-center text-[0.7rem] leading-snug text-white/55">
        Pays left to right on {SLOTS.paylines.length} lines, times your bet. 5 logos: {times(SLOTS.jackpotMultiplier)}. The Gauntlet links
        Maps and Rings (both: a CRITICAL HIT! when it pays as Rings); 3+ Gauntlets alone: INFINITY.
      </p>
      <Paylines width={36} named={false} className="gap-x-2.5 gap-y-1.5" />
    </div>
  )
}
