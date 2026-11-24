import CoinIcon from '../wallet/CoinIcon'
import { JobText } from './FavoursPanel'
import { formatDeadline } from '../../utils/farkle'

const BADGES = {
  done: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  open: 'border-red-400/50 bg-red-500/15 text-red-200',
}

const points = (amount) => Math.abs(amount).toLocaleString('en-US')

// In the red (backend/utils/orca/debt.js): what they owe, what each job
// forgives (a tenth of the lowest they've been), and the jobs in their
// slots, each with when it's replaced. Only shown while they're in the red.
export default function DebtPanel({ debt }) {
  return (
    <section aria-labelledby="orca-debt" className="rounded-2xl border border-red-400/30 bg-[#1a0a0d]/85 p-5 shadow-xl shadow-black/40 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="orca-debt" className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
          In the red
        </h2>
        <p className="flex items-center gap-1 text-sm font-semibold text-red-200 tabular-nums">
          <CoinIcon kind="ppp" size={15} /> -{points(debt.owed)} P-PP
        </p>
      </div>
      <p className="mt-1 text-sm text-white/65">
        He&apos;s open around the clock until you&apos;re out of it. Each job done forgives{' '}
        <strong className="text-white">{points(debt.perJob)} P-PP</strong>, a tenth of the lowest you&apos;ve been (-{points(debt.low)}), and
        never takes you past 0. Each of the {debt.slots} jobs is replaced {debt.refreshDays} days after he hands it over, done or not.
      </p>
      {debt.jobs.length === 0 ? (
        <p className="mt-3 text-sm text-white/55">He&apos;s thinking. Check back in a minute.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {debt.jobs.map((job) => (
            <li
              key={job._id}
              className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                job.status === 'done' ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-black/30'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm leading-snug text-white/90">
                  <JobText job={job} template={debt.jobTexts[job.type]} />
                </p>
                <p className="mt-0.5 text-xs text-white/45">New job {formatDeadline(job.expiresAt)}</p>
              </div>
              <span className={`shrink-0 self-start rounded-full border px-2.5 py-0.5 text-xs font-semibold sm:self-center ${BADGES[job.status] ?? BADGES.open}`}>
                {job.status === 'done' ? `Forgave ${points(job.forgiven ?? 0)}` : 'To do'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
