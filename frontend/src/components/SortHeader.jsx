// A table column's heading that sorts the table by that column: click it
// to sort by it, again to turn the order round. The column sorted by is
// gold, with an arrow for which way. For a member's film list and the
// Resonance comparison page.
function SortHeader({ label, column, sortBy, sortDir, onSort, className }) {
  const active = sortBy === column

  return (
    <th
      className={className}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={
          active
            ? 'flex items-center gap-1.5 text-left text-xs font-semibold tracking-widest text-brand-gold uppercase'
            : 'flex items-center gap-1.5 text-left text-xs font-semibold tracking-widest text-white/40 uppercase transition-colors hover:text-white'
        }
      >
        {label}
        <span className={active ? 'text-brand-gold' : 'text-white/20'}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

export default SortHeader
