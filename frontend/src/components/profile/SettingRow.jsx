// Off | On, in the same dark glass pill as PillToggle, with the gold
// highlight sliding across to the picked side. Both halves are the same
// width, so it slides by exactly its own width.
export function OnOffSwitch({ on, onChange, label }) {
  const text = (active) =>
    `relative px-3 py-1 transition-colors duration-300 ${active ? 'text-ink' : 'text-white/60'}`

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative grid grid-cols-2 rounded-full border border-white/15 bg-ink/60 p-0.5 text-xs font-medium backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-brand-gold transition-transform duration-300 ease-out motion-reduce:transition-none ${
          on ? 'translate-x-full' : ''
        }`}
      />
      <span className={text(!on)}>Off</span>
      <span className={text(on)}>On</span>
    </button>
  )
}

// One on/off setting: what it is on the left, the switch on the right.
// Used by Edit profile and Edit review card.
function SettingRow({ label, description, on, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-white/70">{label}</p>
        <p className="mt-0.5 text-xs text-white/40">{description}</p>
      </div>

      <div className="shrink-0">
        <OnOffSwitch on={on} onChange={onChange} label={label} />
      </div>
    </div>
  )
}

export default SettingRow
