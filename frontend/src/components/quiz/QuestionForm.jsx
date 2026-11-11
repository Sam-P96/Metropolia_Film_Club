import { useState } from 'react'
import { QUIZ } from '../../../../shared/quiz/config.js'

const FIELD =
  'w-full rounded-lg border border-white/15 bg-ink/70 px-3 py-2 text-white placeholder:text-white/30 focus:border-brand-gold focus:outline-none'
const GOLD = 'cursor-pointer rounded-lg bg-brand-gold px-4 py-2 text-center font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-50'
const QUIET = 'cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-center font-semibold text-white transition hover:border-brand-gold/60 disabled:opacity-50'

const LETTERS = ['A', 'B', 'C', 'D']

// One question, written or edited: the question, four answers, and a tick
// box by each to mark the right one (ticking one unticks the others).
// `initial` is { text, answers, correct } to edit, or nothing for a new
// one. `onSave(question)` resolves to an error message, or null.
export default function QuestionForm({ initial = null, saveLabel = 'Add to the queue', onSave, onCancel, extra = null }) {
  const [text, setText] = useState(initial?.text ?? '')
  const [answers, setAnswers] = useState(initial?.answers ?? ['', '', '', ''])
  const [correct, setCorrect] = useState(initial?.correct ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const ready = text.trim() && answers.every((answer) => answer.trim()) && correct !== null

  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    const problem = await onSave({ text: text.trim(), answers: answers.map((answer) => answer.trim()), correct })
    setBusy(false)
    setError(problem)
    if (!problem && !initial) {
      setText('')
      setAnswers(['', '', '', ''])
      setCorrect(null)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 text-left">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
        Question
        <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={QUIZ.custom.maxQuestion} rows={2} placeholder="Who directed Jaws (1975)?" className={FIELD} />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-white/80">Answers: tick the right one</legend>
        {answers.map((answer, i) => (
          <div key={LETTERS[i]} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={correct === i}
              onChange={() => setCorrect(correct === i ? null : i)}
              aria-label={`Answer ${LETTERS[i]} is the right one`}
              className="size-5 shrink-0 cursor-pointer accent-brand-gold"
            />
            <span className="w-4 shrink-0 text-sm font-semibold text-white/50">{LETTERS[i]}</span>
            <input
              value={answer}
              onChange={(event) => setAnswers(answers.map((old, j) => (j === i ? event.target.value : old)))}
              maxLength={QUIZ.custom.maxAnswer}
              placeholder={`Answer ${LETTERS[i]}`}
              aria-label={`Answer ${LETTERS[i]}`}
              className={FIELD}
            />
          </div>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy || !ready} className={GOLD}>
          {busy ? 'Saving…' : saveLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={QUIET}>
            Cancel
          </button>
        )}
        {extra}
      </div>
    </form>
  )
}
