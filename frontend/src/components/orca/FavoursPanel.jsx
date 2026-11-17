import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Name } from '../loanShark/parts'
import { formatDeadline } from '../../utils/farkle'

// One job in his words, from the template (backend/data/
// lordGangOrcaScripts.js jobs): {X} and {Y} become the members' names (links
// to their profiles) and {review} a link to the review.
function JobText({ job, template }) {
  return template.split(/(\{X\}|\{Y\}|\{review\})/g).map((part, i) => {
    if (part === '{X}') return <Name key={i} user={job.x} />
    if (part === '{Y}') return <Name key={i} user={job.y} />
    if (part === '{review}') {
      return job.review ? (
        <Link key={i} to={`/reviews/${job.review._id}`} className="font-semibold text-white underline decoration-white/30 underline-offset-2 hover:text-brand-gold">
          their review of {job.review.filmTitle}
        </Link>
      ) : (
        <Fragment key={i}>a review</Fragment>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

const BADGES = {
  done: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  expired: 'border-white/10 bg-white/5 text-white/45',
  open: 'border-brand-gold/40 bg-brand-gold/10 text-brand-gold',
}
const LABELS = { done: 'Done', expired: 'Expired', open: 'To do' }

// His favours: how many done of the three (they count across days), and
// today's jobs, new at 00:00. Shown even while he's closed.
export default function FavoursPanel({ favour }) {
  return (
    <section aria-labelledby="orca-favours" className="rounded-2xl border border-white/10 bg-[#070d18]/80 p-5 shadow-xl shadow-black/40 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="orca-favours" className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
          Favours
        </h2>
        {favour.on && (
          <div className="flex items-center gap-2" aria-label={`${favour.done} of ${favour.needed} done`}>
            {Array.from({ length: favour.needed }, (_, i) => (
              <span key={i} className={`size-3.5 rounded-full border ${i < favour.done ? 'border-brand-gold bg-brand-gold' : 'border-white/30'}`} />
            ))}
            <span className="text-sm font-semibold text-white/80 tabular-nums">
              {favour.done}/{favour.needed} jobs
            </span>
          </div>
        )}
      </div>

      {!favour.on ? (
        <p className="mt-2 text-sm text-white/55">He hasn&apos;t asked you for anything. Yet.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-white/60">
            Do {favour.needed} of these and he&apos;ll pay again. Done ones count across days; the rest expire at 00:00, when there are new ones (
            {formatDeadline(favour.refreshAt)}).
          </p>
          {favour.jobs.length === 0 ? (
            <p className="mt-3 text-sm text-white/55">Nothing today. Check back after 00:00.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2">
              {favour.jobs.map((job) => (
                <li
                  key={job._id}
                  className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                    job.status === 'done' ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-black/30'
                  }`}
                >
                  <p className={`text-sm leading-snug ${job.status === 'expired' ? 'text-white/45' : 'text-white/90'}`}>
                    <JobText job={job} template={favour.jobTexts[job.type]} />
                  </p>
                  <span className={`shrink-0 self-start rounded-full border px-2.5 py-0.5 text-xs font-semibold sm:self-center ${BADGES[job.status]}`}>
                    {LABELS[job.status]}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
