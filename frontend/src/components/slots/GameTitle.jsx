import { SLOTS } from '../../../../shared/slots/config.js'

// The game's name with its last word in brand gold, like Kino Farkle's.
export default function GameTitle() {
  const words = SLOTS.name.split(' ')
  const last = words.pop()
  return (
    <>
      {words.length > 0 && `${words.join(' ')} `}
      <span className="text-brand-gold">{last}</span>
    </>
  )
}
