import { useEffect, useId, useRef, useState } from 'react'

// Changing something already posted (a cut, or a comment), right where it
// was: its words in a box, with the cursor at the end, how long they are,
// and Save and Cancel (Escape cancels too). `save(text)` sends the trimmed
// text and resolves to what was saved, which `onSaved` gets. Saving it
// unchanged just closes it. If saving fails, the box stays, with what they
// wrote and why.
function EditText({ initial, maxLength, rows = 3, label, save, onSaved, onCancel, className = '' }) {
  const [text, setText] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const id = useId()
  const box = useRef(null)
  const trimmed = text.trim()

  useEffect(() => {
    const end = box.current.value.length
    box.current.focus()
    box.current.setSelectionRange(end, end)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!trimmed || saving) return

    if (trimmed === initial) {
      onCancel()
      return
    }

    setSaving(true)
    setError(null)

    try {
      onSaved(await save(trimmed))
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        ref={box}
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !saving) onCancel()
        }}
        className="w-full resize-y rounded-md border border-white/15 bg-ink/70 px-4 py-3 text-sm leading-relaxed text-white outline-none backdrop-blur-sm transition-colors focus:border-brand-gold/60"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-xs text-white/40">
          {text.length} / {maxLength}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-md border border-white/20 bg-white/5 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            disabled={saving || !trimmed}
            className="rounded-md bg-brand-red px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
    </form>
  )
}

export default EditText
