import { Link } from 'react-router-dom'
import { points } from '../../utils/loanShark'
import { Name } from './parts'

// One job, as a sentence with the members' names as links.
function JobText({ job }) {
  if (job.type === 'review') {
    return (
      <>
        Convince <Name user={job.x} /> to post a movie review.
      </>
    )
  }
  if (job.type === 'dislike') {
    return (
      <>
        Convince <Name user={job.x} /> to dislike <Name user={job.y} />
        &apos;s review of{' '}
        {job.review ? (
          <Link to={`/reviews/${job.review}`} className="font-semibold text-white underline decoration-white/30 underline-offset-2 hover:text-brand-gold">
            {job.filmTitle}
          </Link>
        ) : (
          job.filmTitle
        )}
        .
      </>
    )
  }
  return (
    <>
      Convince <Name user={job.x} /> to steal from <Name user={job.y} />.
    </>
  )
}

// The jobs that came with this shark loan (backend/utils/loanShark/jobs.js),
// only while there's shark debt. No time limit: each one done takes 20% of
// what's borrowed (then) off the debt.
export default function SharkJobs({ shark, rules }) {
  const jobs = shark.jobs.filter((job) => job.status !== 'closed')
  if (jobs.length === 0) return null

  return (
    <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/5 p-4 sm:p-5">
      <h3 className="font-['Bebas_Neue'] text-2xl leading-none tracking-wide text-brand-gold">Want your debt reduced? Do this:</h3>
      <p className="mt-1 text-sm text-white/60">
        Each one done takes {rules.jobReduction}% of what you&apos;ve borrowed off your debt ({points(shark.jobValue)} PP right now). Do any, all or none. No
        time limit, and it counts the moment it happens.
      </p>
      <ol className="mt-3 flex flex-col gap-2">
        {jobs.map((job) => {
          const done = job.status === 'done'
          return (
            <li
              key={job._id}
              className={`flex flex-col gap-1 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                done ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-ink/40'
              }`}
            >
              <p className={`text-white/90 ${done ? 'line-through decoration-emerald-300/60' : ''}`}>
                <JobText job={job} />
              </p>
              <span className={`shrink-0 text-sm font-semibold tabular-nums ${done ? 'text-emerald-300' : 'text-white/50'}`}>
                {done ? `Done: −${points(job.reduction)}` : `−${points(shark.jobValue)}`}
              </span>
            </li>
          )
        })}
      </ol>
      {jobs.some((job) => job.type === 'dislike') && (
        <p className="mt-2 text-xs text-white/50">A dislike done for a job comes off again by itself after {rules.dislikeHours} hours.</p>
      )}
    </div>
  )
}
