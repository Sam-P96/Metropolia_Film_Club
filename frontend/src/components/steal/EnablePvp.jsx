import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { GLASS, GOLD_BUTTON, QUIET_BUTTON } from './style'
import { updateMe } from '../../services/users'

const EASE = [0.22, 1, 0.36, 1]
// How long "PvP is on" shows before the page loads again, with Play.
const RELOAD_SECONDS = 3

// Steal and Defend's "Enable PvP" (pages/StealAndDefend.jsx): what turning
// PvP on means, then a confirm. It's the same PVP switch as Edit profile's
// (PATCH /users/me { pvp: true }), so the server does everything it does
// there: notes the device for the alt-account check, counts their
// dislikes, and tells every member. Once it's on, a 3 second countdown,
// then the page loads again and says Play.
export default function EnablePvp({ onCancel }) {
  const [step, setStep] = useState('ask')
  const [error, setError] = useState('')
  const [left, setLeft] = useState(RELOAD_SECONDS)

  const turnOn = async () => {
    setStep('saving')
    setError('')
    try {
      await updateMe({ pvp: true })
      setStep('on')
    } catch (problem) {
      setError(problem.message)
      setStep('ask')
    }
  }

  useEffect(() => {
    if (step !== 'on') return undefined
    if (left <= 0) {
      window.location.reload()
      return undefined
    }
    const timer = setTimeout(() => setLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [step, left])

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: EASE }}
      role="alertdialog"
      aria-labelledby="enable-pvp-title"
      className={`${GLASS} flex flex-col gap-4 p-6`}
    >
      {step === 'on' ? (
        <div role="status" className="flex flex-col gap-1">
          <p id="enable-pvp-title" className="font-['Bebas_Neue'] text-3xl tracking-wide text-brand-gold">
            PvP is on
          </p>
          <p className="text-white/75">
            Taking you back to Play in {Math.max(left, 0)}…
          </p>
        </div>
      ) : (
        <>
          <h2 id="enable-pvp-title" className="font-['Bebas_Neue'] text-3xl tracking-wide text-white">
            Turn on PvP?
          </h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-white/75">
            <li>Steal and Defend opens up: you can try to steal from members you follow, and other members with PvP on can try to steal from you.</li>
            <li>Dislikes go both ways: you can dislike reviews, comments and cuts by members with PvP on, and they can dislike yours.</li>
            <li>Every member gets a notification that you&apos;ve turned PvP on.</li>
            <li>
              A hash of your IP address and of a random id for this browser is kept for 90 days, to spot one person playing from two accounts. Never the
              IP itself.
            </li>
            <li>
              You can turn it off again with the PVP switch in Edit profile, though not while an attack you&apos;re in is being played, and turning it off
              takes back this week&apos;s steals.
            </li>
          </ul>
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={turnOn} disabled={step === 'saving'} className={`${GOLD_BUTTON} min-h-12 flex-1`}>
              {step === 'saving' ? 'Turning PvP on…' : 'Turn on PvP'}
            </button>
            <button type="button" onClick={onCancel} disabled={step === 'saving'} className={`${QUIET_BUTTON} min-h-12 flex-1`}>
              Cancel
            </button>
          </div>
        </>
      )}
    </motion.section>
  )
}
