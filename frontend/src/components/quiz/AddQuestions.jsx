import { useState } from 'react'
import { Link } from 'react-router-dom'
import QuestionForm from './QuestionForm'
import { addQuizQuestion, addQuizQuestions } from '../../services/quiz'
import { BULK_TEMPLATE, QUIZ } from '../../../../shared/quiz/config.js'

const CARD = 'rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
const GOLD = 'cursor-pointer rounded-xl bg-brand-gold px-4 py-2.5 text-center font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-50'
const QUIET = 'cursor-pointer rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-center font-semibold text-white transition hover:border-brand-gold/60 hover:bg-white/10'
const PICKED = 'cursor-pointer rounded-xl border border-brand-gold bg-brand-gold/15 px-4 py-2.5 text-center font-semibold text-brand-gold'

const TEMPLATE = JSON.stringify(BULK_TEMPLATE, null, 2)

// Many questions at once: the template to copy, then the JSON pasted in or
// chosen as a file, as long as it needs to be.
function Bulk({ onAdded }) {
  const [json, setJson] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(TEMPLATE)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setMessage({ error: true, text: 'Couldn’t copy: select the template and copy it instead.' })
    }
  }

  const readFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    file.text().then(setJson)
  }

  const upload = async () => {
    let list
    try {
      list = JSON.parse(json)
    } catch {
      setMessage({ error: true, text: "That isn't valid JSON. Start from the template: square brackets round the list, quotes round the words." })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const result = await addQuizQuestions(list)
      setMessage({ text: `Added ${result.added} question${result.added === 1 ? '' : 's'} to the end of the queue.` })
      setJson('')
      onAdded?.()
    } catch (failure) {
      setMessage({ error: true, text: failure.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="text-sm text-white/70">
        A list of questions, each with its <code className="text-brand-gold">question</code>, exactly 4{' '}
        <code className="text-brand-gold">answers</code>, and <code className="text-brand-gold">correct</code>: which answer is right, 1 to 4 (1 is
        the first). As many as you like. All of them go in, or none if one is wrong (it says which).
      </p>
      <div className="relative">
        <pre className="max-h-64 overflow-auto rounded-lg border border-white/10 bg-ink/80 p-3 text-xs text-white/80">{TEMPLATE}</pre>
        <button type="button" onClick={copy} className="absolute top-2 right-2 cursor-pointer rounded-md border border-white/20 bg-ink px-2 py-1 text-xs text-white hover:border-brand-gold/60">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
        Your questions (paste them, or pick a .json file)
        <textarea
          value={json}
          onChange={(event) => setJson(event.target.value)}
          rows={8}
          spellCheck={false}
          placeholder='[ { "question": "...", "answers": ["...", "...", "...", "..."], "correct": 1 } ]'
          className="w-full rounded-lg border border-white/15 bg-ink/70 px-3 py-2 font-mono text-xs text-white placeholder:text-white/30 focus:border-brand-gold focus:outline-none"
        />
      </label>
      <input type="file" accept=".json,application/json" onChange={readFile} className="text-sm text-white/70 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white" />
      <div>
        <button type="button" onClick={upload} disabled={busy || !json.trim()} className={GOLD}>
          {busy ? 'Adding…' : 'Add them to the queue'}
        </button>
      </div>
      {message && (
        <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-red-300' : 'text-emerald-300'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}

// For moderators and admins, on the Daily Quiz page: Add Questions (one,
// or many from JSON) to the queue, and View All Questions. Each question
// in the queue has a 50% chance of taking one of a day's places, in order;
// whoever wrote it gets a film question instead that day.
export default function AddQuestions({ startOpen = false }) {
  const [open, setOpen] = useState(startOpen)
  const [mode, setMode] = useState(null)
  const [added, setAdded] = useState(null)

  const addOne = async (question) => {
    try {
      await addQuizQuestion(question)
      setAdded('Added to the end of the queue.')
      return null
    } catch (failure) {
      return failure.message
    }
  }

  return (
    <section className={`${CARD} flex flex-col items-center gap-4 text-center`} aria-labelledby="quiz-questions">
      <h2 id="quiz-questions" className="font-['Cinzel'] text-xl text-brand-gold">
        Questions
      </h2>
      <p className="max-w-xl text-sm text-white/60">
        Write film questions for the Daily Quiz. Each one waits in the queue; every day each of the {QUIZ.questions} places has a{' '}
        {Math.round(QUIZ.customChance * 100)}% chance of going to the next one. On the day yours is asked, you get a different question instead.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={open ? PICKED : QUIET}>
          Add Questions
        </button>
        <Link to="/daily-quiz/questions" className={QUIET}>
          View All Questions
        </Link>
      </div>

      {open && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => setMode('single')} aria-pressed={mode === 'single'} className={mode === 'single' ? PICKED : QUIET}>
              Add single question
            </button>
            <button type="button" onClick={() => setMode('bulk')} aria-pressed={mode === 'bulk'} className={mode === 'bulk' ? PICKED : QUIET}>
              Add bulk questions
            </button>
          </div>
          <div className="w-full max-w-2xl">
            {mode === 'single' && <QuestionForm onSave={addOne} />}
            {mode === 'bulk' && <Bulk onAdded={() => setAdded(null)} />}
          </div>
          {added && mode === 'single' && (
            <p role="status" className="text-sm text-emerald-300">
              {added}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
