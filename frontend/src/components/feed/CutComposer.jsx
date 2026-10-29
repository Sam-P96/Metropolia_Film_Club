import { useState } from 'react'

import { postCut } from '../../services/cuts'

// Matches the server's limit (backend/controllers/cutController.js).
const MAX_LENGTH = 280

// Light on the GIF and the purple, dark on white, like the rest of the page.
const LOOKS = {
  dark: {
    box: 'border-white/10 bg-black/35',
    label: 'text-brand-gold',
    input:
      'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10',
    muted: 'text-white/40',
  },
  light: {
    box: 'border-ink/10 bg-black/5',
    label: 'text-brand-red',
    input: 'border-ink/15 bg-white text-ink placeholder:text-ink/40 focus:border-brand-red/60',
    muted: 'text-ink/50',
  },
}

// The box at the very top of Notifications for posting a cut: a short post
// that goes to your followers' Notifications and your own, where any web
// addresses in it become links. `onPosted` runs once it's saved.
function CutComposer({ light = false, onPosted }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const look = light ? LOOKS.light : LOOKS.dark

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    setSaving(true)
    setError(null)

    try {
      await postCut(text.trim())
      setText('')
      onPosted()
    } catch (err) {
      // Keep what they wrote.
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`mb-12 rounded-2xl border p-5 backdrop-blur-[6px] sm:p-6 ${look.box}`}
    >
      <label
        htmlFor="cut"
        className={`text-sm font-semibold tracking-widest uppercase ${look.label}`}
      >
        Post a cut
      </label>
      <textarea
        id="cut"
        rows={3}
        maxLength={MAX_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's on your mind? Links become clickable."
        className={`mt-3 w-full resize-y rounded-md border px-4 py-3 leading-relaxed outline-none transition-colors ${look.input}`}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <span className={`text-xs ${look.muted}`}>
          {text.length} / {MAX_LENGTH} · goes to your followers' Notifications
        </span>

        <button
          disabled={saving || !text.trim()}
          className="rounded-md bg-brand-red px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Posting…' : 'Post cut'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
    </form>
  )
}

export default CutComposer
