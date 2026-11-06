import { useState } from 'react'
import { points } from '../../utils/loanShark'
import { Amount, Feedback, GLASS, HEADING, Member, QUIET_BUTTON } from './parts'

const styleLabel = (style) => (style === 'fixed' ? 'Fixed' : 'Flexible')

// A button that runs `action` (resolving to a message) once at a time,
// with the message under it.
function ActionButton({ action, children, busyText, confirmText }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function run() {
    if (busy) return
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(true)
    setMessage(null)
    const result = await action()
    if (result.error) setMessage(result)
    setBusy(false)
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button type="button" onClick={run} disabled={busy} className={QUIET_BUTTON}>
        {busy ? busyText : children}
      </button>
      <Feedback message={message} />
    </div>
  )
}

function Row({ children }) {
  return <li className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">{children}</li>
}

// "Your player loans": who they owe and how much, with "Pay off now"; and,
// as a lender, their offers (with "Take down") and who owes them.
export default function MyLoans({ player, rules, onPayOff, onTakeDown }) {
  const { borrowing, lending } = player
  const nothing = borrowing.length === 0 && lending.offers.length === 0 && lending.borrowers.length === 0

  return (
    <section className={`${GLASS} flex flex-col gap-5 p-5 sm:p-6`} aria-labelledby="my-loans-heading">
      <div>
        <h2 id="my-loans-heading" className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
          Your <span className="text-brand-gold">player loans</span>
        </h2>
        <p className="mt-1 text-sm text-white/60">
          You owe {points(player.owed)} of the {points(player.cap)} PP you can owe other members ({rules.playerCapTimesDaily}x your daily PP), to{' '}
          {player.lenders} of at most {rules.maxLenders} lenders.
        </p>
      </div>

      {nothing && <p className="text-white/60">No player loans yet. Borrow from the postings below, or lend some PP yourself.</p>}

      {borrowing.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className={HEADING}>You owe</h3>
          <ul className="flex flex-col gap-2">
            {borrowing.map((debt) => (
              <Row key={debt._id}>
                <div className="flex min-w-0 flex-col gap-1">
                  <Member user={debt.lender} />
                  <p className="text-sm text-white/60">
                    You owe <span className="font-semibold text-white">{points(debt.owed)} PP</span> · {points(player.autoRepayEach)} PP goes to them from each day&apos;s
                    payout
                  </p>
                </div>
                <ActionButton
                  action={() => onPayOff(debt._id)}
                  busyText="Paying…"
                  confirmText={`Pay ${debt.lender.username} the ${points(debt.owed)} PP you owe now? It comes from your PP first, then P-PP.`}
                >
                  Pay off now
                </ActionButton>
              </Row>
            ))}
          </ul>
        </div>
      )}

      {lending.offers.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className={HEADING}>
            Your offers ({lending.offers.length} of {rules.maxOffers})
          </h3>
          <ul className="flex flex-col gap-2">
            {lending.offers.map((offer) => (
              <Row key={offer._id}>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-semibold text-white">
                    {styleLabel(offer.style)} · {offer.rate}% interest
                  </p>
                  <p className="text-sm text-white/60">
                    <Amount value={offer.available} /> of {points(offer.amount)} still to borrow · Borrow {points(offer.example.borrow)} → pay back{' '}
                    {points(offer.example.payBack)}
                  </p>
                </div>
                <ActionButton action={() => onTakeDown(offer._id)} busyText="Taking down…">
                  Take down
                </ActionButton>
              </Row>
            ))}
          </ul>
        </div>
      )}

      {lending.borrowers.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className={HEADING}>Owed to you</h3>
          <ul className="flex flex-col gap-2">
            {lending.borrowers.map((debt) => (
              <Row key={debt._id}>
                <Member user={debt.borrower} />
                <p className="text-sm text-white/60">
                  Still owes you <span className="font-semibold text-white">{points(debt.owed)} PP</span>
                  {debt.taxBurned > 0 && <> · {points(debt.taxBurned)} income tax paid so far</>}
                </p>
              </Row>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
