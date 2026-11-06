import { Link } from 'react-router-dom'
import CoinIcon from '../wallet/CoinIcon'
import ResonanceIcon from '../resonance/ResonanceIcon'
import { timeAgo } from '../../utils/timeAgo'
import { COLLECTOR_CLEARED_LINE, COLLECTOR_LINES, fillLine } from '../../../../shared/loanShark/lines.js'

const TONES = {
  dark: { text: 'text-white/90', muted: 'text-white/50', name: 'font-semibold text-white hover:text-brand-gold', link: 'text-brand-gold hover:text-white' },
  light: { text: 'text-ink/90', muted: 'text-ink/50', name: 'font-semibold text-ink hover:text-brand-red', link: 'text-brand-red hover:text-ink' },
}

// Red for King Loan Shark coming for you, gold for money coming in, green
// for good news, plain for the rest.
const BOXES = {
  danger: 'border-red-400/50 bg-red-500/15',
  money: 'border-brand-gold/50 bg-brand-gold/15',
  good: 'border-emerald-400/30 bg-emerald-500/10',
  plain: 'border-white/15 bg-ink/50',
}

const JOBS = {
  review: 'posted a review',
  dislike: 'disliked the review',
  steal: 'pulled off the steal',
}

const n = (value) => (value ?? 0).toLocaleString('en-US')

function Who({ user, tone }) {
  if (!user) return <span className="font-semibold">A former member</span>
  return (
    <>
      <Link to={`/users/${user._id}`} className={tone.name}>
        {user.username}
      </Link>
      <ResonanceIcon userId={user._id} />
    </>
  )
}

// What a Loan Shark notification says (backend/utils/notify.js): Kaveri
// collecting, a missed payment, a job done, a loan repayment going out or
// coming in, or someone borrowing from an offer.
function Body({ item, tone }) {
  const other = item.actors?.[0]
  const { loan } = item

  switch (item.type) {
    case 'loanCollector': {
      const line = loan.cleared ? COLLECTOR_CLEARED_LINE : (COLLECTOR_LINES[item.variant] ?? COLLECTOR_LINES[0])
      return <span className="font-['Cinzel']">{fillLine(line, { amount: item.amount, left: loan.left })}</span>
    }
    case 'loanMissed':
      return (
        <>
          You missed a payment to King Loan Shark. Your interest rate is now <strong>{loan.rate}%</strong>, and you owe {n(loan.left)}.
        </>
      )
    case 'loanJob':
      return (
        <>
          <Who user={other} tone={tone} /> {JOBS[loan.job] ?? 'did the job'}. That&apos;s {n(item.amount)} off your debt to King Loan Shark.{' '}
          {loan.left > 0 ? `${n(loan.left)} left.` : 'Your debt is cleared!'}
        </>
      )
    case 'loanRepay':
      return (
        <>
          <CoinIcon kind="pp" size={18} /> {n(item.amount)} PP of today&apos;s payout went to <Who user={other} tone={tone} /> for your loan.{' '}
          {loan.left > 0 ? `You still owe them ${n(loan.left)}.` : "That's them paid off."}
        </>
      )
    case 'loanRepaid':
      return (
        <>
          <CoinIcon kind="ppp" size={18} /> <Who user={other} tone={tone} /> {loan.auto ? 'made their daily repayment' : 'paid you off'}: {n(item.amount)} P-PP
          to you{loan.tax > 0 ? `, after ${n(loan.tax)} income tax` : ''}. {loan.left > 0 ? `They still owe you ${n(loan.left)}.` : "They're all paid up."}
        </>
      )
    case 'loanBorrowed':
      return (
        <>
          <Who user={other} tone={tone} /> borrowed {n(item.amount)} PP from your loan offer.
        </>
      )
    default:
      return null
  }
}

const BOX_FOR = {
  loanCollector: 'danger',
  loanMissed: 'danger',
  loanJob: 'good',
  loanRepay: 'plain',
  loanRepaid: 'money',
  loanBorrowed: 'money',
}

const TITLES = {
  loanCollector: 'Debt collector',
  loanMissed: 'Missed payment',
  loanJob: 'Job done',
  loanRepay: 'Loan repayment',
  loanRepaid: 'Loan repaid',
  loanBorrowed: 'Someone borrowed from you',
}

// A Loan Shark notification. `light` is for the white Notifications background.
export default function LoanNotice({ item, light = false }) {
  const tone = light ? TONES.light : TONES.dark
  const cleared = item.type === 'loanCollector' && item.loan?.cleared

  return (
    <article className={`rounded-2xl border p-5 backdrop-blur-sm sm:p-6 ${BOXES[cleared ? 'good' : BOX_FOR[item.type]]}`}>
      <h2 className={`text-sm font-semibold ${tone.muted}`}>Loan Shark · {TITLES[item.type]}</h2>
      <p className={`mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-lg ${tone.text}`}>
        <Body item={item} tone={tone} />
      </p>
      <p className={`mt-1 text-sm ${tone.muted}`}>
        {timeAgo(item.at)} ·{' '}
        <Link to="/games/loan-shark" className={`font-medium transition-colors ${tone.link}`}>
          Loan Shark
        </Link>
      </p>
    </article>
  )
}
