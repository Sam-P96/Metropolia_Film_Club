import { Link } from 'react-router-dom'
import useApi from '../../hooks/useApi'
import { getStealStatus, getTakebackPreview } from '../../services/steal'
import { STEAL } from '../../../../shared/steal/config.js'
import { formatPp } from './style'

// Under Edit profile's PVP switch, which is also Steal and Defend's (spec
// §12): with PVP on, their class and what's noted about their device; and
// before saving PVP off, what that would take back. `on` is the switch as
// it is in the form, before Save.
export default function StealPvpNote({ on }) {
  const status = useApi(getStealStatus, [])
  const savedOn = Boolean(status.data?.pvp)
  const turningOff = savedOn && !on
  const preview = useApi(getTakebackPreview, [turningOff], { enabled: turningOff })

  if (turningOff) {
    const steals = preview.data?.steals ?? 0
    return (
      <p className="rounded-md border border-brand-red/40 bg-black/30 px-3 py-2 text-xs text-white/70">
        {steals > 0
          ? `Saving with PVP off also takes back your ${steals} Steal and Defend steal${steals === 1 ? '' : 's'} since Monday's reset: ${formatPp(preview.data.owed)} comes out of your points (into debt if you can't cover it), and each victim gets back what they lost.`
          : "Saving with PVP off takes you out of Steal and Defend: nobody can steal from you, you can't attack, and your items are unequipped (you keep them)."}{' '}
        It can&apos;t be turned off while an attack you&apos;re in is being played.
      </p>
    )
  }

  if (!on) return null

  const playerClass = STEAL.classes[status.data?.playerClass ?? STEAL.defaultClass]
  return (
    <p className="text-xs text-white/40">
      You&apos;re in{' '}
      <Link to="/games/steal-and-defend" className="underline hover:text-white">
        Steal and Defend
      </Link>{' '}
      as a {playerClass?.label ?? 'Warrior'} (change class there once a week). With PVP on, a hash of your IP address and of a random id for this
      browser is kept for 90 days, to spot one person playing from two accounts. Never the IP itself.
    </p>
  )
}
