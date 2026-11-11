import '@fontsource/cinzel'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import GameBackdrop from '../components/GameBackdrop'
import QuestionForm from '../components/quiz/QuestionForm'
import useApi from '../hooks/useApi'
import { deleteQuizQuestion, editQuizQuestion, getQuizQueue, moveQuizQuestion } from '../services/quiz'

const CARD = 'rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
const SMALL = 'cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-center text-sm font-semibold text-white transition hover:border-brand-gold/60 hover:bg-white/10 disabled:opacity-50'
const PICKED = 'cursor-pointer rounded-lg border border-brand-gold bg-brand-gold/15 px-3 py-1.5 text-center text-sm font-semibold text-brand-gold'
const DANGER = 'cursor-pointer rounded-lg border border-brand-red/60 bg-brand-red/15 px-3 py-1.5 text-center text-sm font-semibold text-red-200 transition hover:bg-brand-red/30'

const LETTERS = ['A', 'B', 'C', 'D']

// One question in the queue: its place, the question, who wrote it, and
// Edit, Reveal answers and Move. `onChange(promise)` runs a change and
// takes the queue that comes back; it resolves to an error message, or null.
function QueuedQuestion({ entry, total, onChange }) {
  const [open, setOpen] = useState(null) // 'edit' | 'move' | null
  const [revealed, setRevealed] = useState(false)
  const [place, setPlace] = useState(String(entry.position))
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState(null)

  const toggle = (which) => {
    setOpen(open === which ? null : which)
    setError(null)
  }

  const move = async (event) => {
    event.preventDefault()
    const problem = await onChange(moveQuizQuestion(entry._id, Number(place)))
    setError(problem)
    if (!problem) setOpen(null)
  }

  return (
    <li className={`${CARD} flex flex-col gap-3`}>
      <div className="flex items-start gap-4">
        <span className="font-['Cinzel'] text-2xl tabular-nums text-brand-gold" aria-label={`Place ${entry.position}`}>
          {entry.position}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white">{entry.text}</p>
          <p className="mt-1 text-xs text-white/50">
            {entry.author ? `By ${entry.author.username}` : 'By a former member'} · {new Date(entry.createdAt).toLocaleDateString('en-GB')}
          </p>
        </div>
      </div>

      {revealed && (
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Answers">
          {entry.answers.map((answer, i) => (
            <li
              key={LETTERS[i]}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${i === entry.correct ? 'border-emerald-400/60 bg-emerald-400/10 text-white' : 'border-white/10 bg-ink/40 text-white/70'}`}
            >
              <span className="font-semibold text-white/50">{LETTERS[i]}</span>
              <span className="min-w-0 flex-1">{answer}</span>
              {i === entry.correct && (
                <span className="font-bold text-emerald-300" aria-label="the right answer">
                  ✓
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => toggle('edit')} aria-expanded={open === 'edit'} className={open === 'edit' ? PICKED : SMALL}>
          Edit
        </button>
        <button type="button" onClick={() => setRevealed(!revealed)} aria-pressed={revealed} className={revealed ? PICKED : SMALL}>
          {revealed ? 'Hide answers' : 'Reveal answers'}
        </button>
        <button type="button" onClick={() => toggle('move')} aria-expanded={open === 'move'} className={open === 'move' ? PICKED : SMALL}>
          Move
        </button>
      </div>

      {open === 'move' && (
        <form onSubmit={move} className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-white/80">
            To place
            <input
              type="number"
              min={1}
              step={1}
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              className="w-24 rounded-lg border border-white/15 bg-ink/70 px-3 py-1.5 text-white focus:border-brand-gold focus:outline-none"
            />
          </label>
          <button type="submit" disabled={!(Number(place) >= 1)} className={SMALL}>
            Move
          </button>
          <span className="text-xs text-white/50">1 is next. Past {total}, it goes last.</span>
        </form>
      )}

      {open === 'edit' && (
        <QuestionForm
          initial={entry}
          saveLabel="Save"
          onCancel={() => setOpen(null)}
          onSave={async (question) => {
            const problem = await onChange(editQuizQuestion(entry._id, question))
            if (!problem) setOpen(null)
            return problem
          }}
          extra={
            asking ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-white/70">Delete it for good?</span>
                <button type="button" onClick={() => onChange(deleteQuizQuestion(entry._id))} className={DANGER}>
                  Delete
                </button>
                <button type="button" onClick={() => setAsking(false)} className={SMALL}>
                  Keep it
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setAsking(true)} className={DANGER}>
                Delete question
              </button>
            )
          }
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </li>
  )
}

// /daily-quiz/questions, for moderators and admins: every question waiting
// in the Daily Quiz's queue, the next to be asked first and the last to be
// asked last. Each can be edited (its right answer ticked), have its
// answers shown, or be moved to another place. The server checks who's
// asking.
export default function QuizQuestions() {
  const queue = useApi(() => getQuizQueue(), [])
  const questions = queue.data?.questions ?? []

  const change = async (work) => {
    try {
      const result = await work
      queue.setData({ questions: result.questions })
      return null
    } catch (failure) {
      return failure.message
    }
  }

  return (
    <>
      <GameBackdrop to="#24225C" />
      <div className="mx-auto flex w-full max-w-3xl animate-page-in flex-col gap-6 px-4 py-8 motion-reduce:animate-none sm:py-12">
        <Link to="/daily-quiz" className="self-start text-sm text-white/60 hover:text-white">
          ← Daily Quiz
        </Link>
        <header className="-mt-2 flex flex-col items-center gap-2 text-center">
          <h1 className="font-['Cinzel'] text-4xl text-white">
            All <span className="text-brand-gold">Questions</span>
          </h1>
          <p className="max-w-xl text-white/60">
            The queue: the next question to go in first, the last last. Once a question has been in a Daily Quiz, it leaves the queue.
          </p>
        </header>

        {queue.loading ? (
          <p className="text-center text-white/50">Loading…</p>
        ) : queue.error ? (
          <p className={`${CARD} text-center text-white/70`}>
            {queue.error.status === 403 ? 'Only moderators and admins can see the questions.' : "The questions won't load. Try refreshing the page."}
          </p>
        ) : questions.length === 0 ? (
          <p className={`${CARD} text-center text-white/70`}>
            The queue is empty.{' '}
            <Link to="/daily-quiz?add=1" className="text-brand-gold underline underline-offset-4">
              Add some questions
            </Link>
          </p>
        ) : (
          <ol className="flex flex-col gap-4" aria-label="The queue">
            {questions.map((entry) => (
              <QueuedQuestion key={`${entry._id}-${entry.position}`} entry={entry} total={questions.length} onChange={change} />
            ))}
          </ol>
        )}
      </div>
    </>
  )
}
