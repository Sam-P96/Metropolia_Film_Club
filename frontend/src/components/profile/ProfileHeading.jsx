import { useState } from 'react'

import FollowButton from './FollowButton'
import SettingRow from './SettingRow'
import { setBans } from '../../services/users'
import { BAN_RIGHTS, lostRights } from '../../utils/bans'

// The Ban Hammer's switches: on takes that right away from the member. Each
// one saves straight away, showing the change before the server answers.
function BanPanel({ profileUser, onChange }) {
  const [error, setError] = useState(null)
  const bans = profileUser.bans ?? {}

  const toggle = async (right, on) => {
    const before = bans
    onChange({ bans: { ...before, [right]: on } })
    setError(null)

    try {
      onChange(await setBans(profileUser._id, { [right]: on }))
    } catch (err) {
      onChange({ bans: before })
      setError(err.message)
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-brand-red/40 bg-brand-red/10 p-5 backdrop-blur-sm">
      <h2 className="text-sm font-semibold tracking-widest text-brand-red uppercase">Ban Hammer</h2>
      <p className="mt-1 mb-5 text-xs text-white/50">
        On takes the right away from {profileUser.username}. Each switch saves straight away.
      </p>

      <div className="space-y-4">
        {BAN_RIGHTS.map((right) => (
          <SettingRow
            key={right.key}
            label={right.label}
            description={right.description}
            on={Boolean(bans[right.key])}
            onChange={(on) => toggle(right.key, on)}
          />
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-brand-red">{error}</p>}
    </div>
  )
}

// A member's name with the Follow button beside it, and for moderators and
// admins who outrank them, the Ban Hammer: its switches open above the name.
// `onChange` merges follow and ban changes into the profile.
function ProfileHeading({ name, profileUser, isOwner, onChange }) {
  const [banning, setBanning] = useState(false)
  const lost = lostRights(profileUser.bans).length

  return (
    <>
      {banning && profileUser.canBan && <BanPanel profileUser={profileUser} onChange={onChange} />}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{name}</h1>

        {!isOwner && <FollowButton profileUser={profileUser} onChange={onChange} />}

        {profileUser.canBan && (
          <button
            type="button"
            onClick={() => setBanning(!banning)}
            aria-expanded={banning}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
              banning
                ? 'border-brand-red bg-brand-red/20 text-white'
                : 'border-brand-maroon bg-brand-maroon/40 text-white hover:bg-brand-maroon/70'
            }`}
          >
            {banning ? 'Put the hammer down' : 'Ban Hammer'}
          </button>
        )}

        {lost > 0 && (
          <span className="rounded-full border border-red-400/40 bg-red-500/15 px-2.5 py-0.5 text-xs text-red-200">
            Banned from {lost} {lost === 1 ? 'thing' : 'things'}
          </span>
        )}
      </div>
    </>
  )
}

export default ProfileHeading
