import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import FollowButton from './FollowButton'
import SettingRow from './SettingRow'
import { deleteUser, setBans } from '../../services/users'
import { BAN_RIGHTS, lostRights } from '../../utils/bans'

// Admins deleting a member's account, at the bottom of the Ban Hammer. It
// asks three times, right where the button was, then goes to the members page.
function DeleteMember({ profileUser }) {
  const navigate = useNavigate()
  // 0: the button. 1 to 3: the confirmations.
  const [step, setStep] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const name = profileUser.username

  const confirmations = [
    { text: `Delete ${name}'s account?`, button: 'Yes, delete' },
    {
      text: `This deletes their profile, reviews (with the comments under them), comments, film list and follows, and takes back every like and dislike they've given. It can't be undone.`,
      button: 'I understand',
    },
    { text: `Last chance: delete ${name} for good?`, button: 'Delete for good' },
  ]

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      await deleteUser(profileUser._id)
      navigate('/members', { replace: true })
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  const cancel = () => {
    setStep(0)
    setError(null)
  }

  if (step === 0) {
    return (
      <button
        type="button"
        onClick={() => setStep(1)}
        className="rounded-md border border-brand-red/60 bg-brand-red/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-red hover:bg-brand-red/20"
      >
        Delete account
      </button>
    )
  }

  const { text, button } = confirmations[step - 1]
  const last = step === confirmations.length

  return (
    <div role="alertdialog" aria-label={`Delete ${name}'s account`} className="rounded-xl border border-brand-red/60 bg-ink/60 p-4">
      <p className="text-xs font-semibold tracking-widest text-red-300 uppercase">
        Confirmation {step} of {confirmations.length}
      </p>
      <p className="mt-2 text-sm text-white">{text}</p>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={deleting}
          className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={last ? handleDelete : () => setStep(step + 1)}
          disabled={deleting}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : button}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  )
}

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

      {profileUser.canDelete && (
        <div className="mt-6 border-t border-brand-red/30 pt-5">
          <h3 className="text-sm font-semibold text-white">Delete account</h3>
          <p className="mt-1 mb-4 text-xs text-white/50">
            Admins only. Removes {profileUser.username} and everything they've posted.
          </p>
          <DeleteMember profileUser={profileUser} />
        </div>
      )}
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
