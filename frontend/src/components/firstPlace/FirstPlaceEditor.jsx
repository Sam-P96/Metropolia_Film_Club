import '@fontsource/bebas-neue'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import StyledUsername from '../cosmetics/StyledUsername'
import { OnOffSwitch } from '../profile/SettingRow'
import FirstPlaceName from './FirstPlaceName'
import StoneControls from './StoneControls'
import { refreshFirstPlace, setFirstPlaceSettings } from './firstPlaceStore'
import { saveFirstPlaceSettings } from '../../services/firstPlace'
import { defaultFirstPlaceFx } from '../../../../shared/firstPlace/config.js'

const BUTTON =
  'cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-default disabled:opacity-50'
const GOLD = 'cursor-pointer rounded-lg bg-brand-gold px-5 py-2 text-sm font-bold text-ink transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60'
const CLOSE_AFTER_MS = 3000

// The name as it'll look with these settings (`draft`): the First Place
// effect while it's on, their Black Market name style (or the plain name)
// while it's off.
function Preview({ name, draft, titles, styleId }) {
  const shown = (className) => (
    <span className={className}>
      {draft.enabled ? <FirstPlaceName name={name} settings={draft} titles={titles} /> : <StyledUsername name={name} styleId={styleId} />}
    </span>
  )
  return (
    <div className="grid place-items-center gap-6 overflow-hidden rounded-xl border border-white/10 bg-[#07070c] px-4 py-10 text-center">
      {shown('max-w-full text-4xl font-bold text-white sm:text-5xl')}
      <div className="flex w-full max-w-sm items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-left">
        <span className="w-6 text-right text-lg font-bold text-brand-gold tabular-nums">1</span>
        {shown('min-w-0 font-medium text-white [overflow-wrap:anywhere]')}
      </div>
    </div>
  )
}

// A holder's First Place effect editor, from the ∞ on their own profile:
// the titles they hold, a live preview of their name, the effect on or off,
// the stones (StoneControls), and Save or Cancel. Nothing is saved until
// Save. If they've lost every title by then, it says so and closes.
export default function FirstPlaceEditor({ user, firstPlace, onClose }) {
  const [draft, setDraft] = useState(firstPlace.settings)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const { settings } = await saveFirstPlaceSettings(draft)
      setFirstPlaceSettings(user._id, settings)
      onClose()
    } catch (failure) {
      if (failure.status === 403) {
        setMessage({ gone: true, text: "You're not in first place any more, so there's nothing to save. Win a title back and your saved settings will be waiting." })
        // Then the ∞ goes, as the new holders come in.
        setTimeout(() => {
          onClose()
          refreshFirstPlace({ force: true })
        }, CLOSE_AFTER_MS)
      } else {
        setMessage({ text: failure.message })
        setSaving(false)
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-place-heading"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink/95 text-white shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <h2 id="first-place-heading" className="flex items-center gap-2 font-['Bebas_Neue'] text-3xl leading-none tracking-wide">
            <span className="fp-infinity font-sans text-2xl font-bold" aria-hidden="true">
              ∞
            </span>
            First <span className="text-brand-gold">Place</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 cursor-pointer place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            {firstPlace.titles.map((title) => (
              <span key={title} className="rounded-full border border-brand-gold/50 bg-brand-gold/15 px-3 py-1 text-xs font-bold tracking-wide text-brand-gold">
                {title}
              </span>
            ))}
            <span className="text-xs text-white/50">Your name looks like this everywhere a Black Market name style shows, while you hold a title.</span>
          </div>

          <Preview name={user.username} draft={draft} titles={firstPlace.titles} styleId={user.cosmetics?.name} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm font-semibold">
              Effect on
              <OnOffSwitch on={draft.enabled} onChange={(enabled) => setDraft({ ...draft, enabled })} label="First Place effect" />
            </span>
            {!draft.enabled && <span className="text-xs text-white/50">Off: your Black Market name style (or plain name) shows instead.</span>}
          </div>

          <StoneControls value={draft} onChange={setDraft} />

          <div>
            <button type="button" onClick={() => setDraft(defaultFirstPlaceFx())} className={BUTTON}>
              Reset everything to default
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 px-5 py-3">
          {message && (
            <p role={message.gone ? 'status' : 'alert'} className={`mr-auto text-sm ${message.gone ? 'text-white/80' : 'text-red-300'}`}>
              {message.text}
            </p>
          )}
          <button type="button" onClick={onClose} disabled={saving && !message?.gone} className={BUTTON}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className={GOLD}>
            {saving && !message ? 'Saving…' : 'Save'}
          </button>
        </div>
      </motion.section>
    </motion.div>
  )
}
