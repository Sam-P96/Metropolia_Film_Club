// Says what kind of event it is, styled like its days on the calendar: a club
// activity is filled with the muted gold, a member screening outlined.
function EventTypeTag({ official, className = '' }) {
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 align-middle text-[10px] font-medium tracking-wide text-brand-gold uppercase ${
        official ? 'border-transparent bg-brand-gold/15' : 'border-brand-gold/60'
      } ${className}`}
    >
      {official ? 'Club activity' : 'Member screening'}
    </span>
  )
}

export default EventTypeTag
