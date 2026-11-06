import { useState } from 'react'
import { points } from '../../utils/loanShark'
import { Amount, BUTTON, Feedback, GLASS, INPUT, Member } from './parts'

// One offer from another member, with what borrowing from it takes: the
// Borrow button for a Fixed one (all of it), or an amount and Borrow for a
// Flexible one.
function Posting({ offer, rules, canBorrow, onBorrow }) {
  const smallest = Math.min(rules.minDraw, offer.available)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const flexible = offer.style === 'flexible'
  const value = flexible ? Number(amount) : offer.available
  const valid = Number.isInteger(value) && value >= smallest && value <= offer.available

  async function submit(event) {
    event.preventDefault()
    if (!valid || busy || !canBorrow) return
    setBusy(true)
    setMessage(null)
    const result = await onBorrow(offer._id, flexible ? value : undefined)
    if (result.error) setMessage(result)
    setBusy(false)
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Member user={offer.lender} size="md" />
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${
            flexible ? 'bg-sky-400/15 text-sky-200' : 'bg-brand-gold/15 text-brand-gold'
          }`}
        >
          {flexible ? 'Flexible' : 'Fixed'}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-white/50">Available</dt>
          <dd className="font-semibold text-white">
            <Amount value={offer.available} />
          </dd>
        </div>
        <div>
          <dt className="text-white/50">Interest (total)</dt>
          <dd className="font-semibold text-white">{offer.rate}%</dd>
        </div>
      </dl>
      <p className="text-sm text-white/70">
        Borrow {points(offer.example.borrow)} → pay back <span className="font-semibold text-white">{points(offer.example.payBack)}</span>
      </p>
      <form onSubmit={submit} className="mt-auto flex flex-col gap-2 sm:flex-row">
        {flexible && (
          <>
            <label className="sr-only" htmlFor={`borrow-${offer._id}`}>
              Amount to borrow from {offer.lender.username}
            </label>
            <input
              id={`borrow-${offer._id}`}
              type="number"
              inputMode="numeric"
              min={smallest}
              max={offer.available}
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={`${smallest} to ${points(offer.available)}`}
              className={INPUT}
              disabled={!canBorrow}
            />
          </>
        )}
        <button type="submit" className={`${BUTTON} shrink-0`} disabled={!valid || busy || !canBorrow}>
          {busy ? 'Borrowing…' : flexible ? 'Borrow' : `Borrow ${points(offer.available)}`}
        </button>
      </form>
      <Feedback message={message} />
    </li>
  )
}

// "Player loan postings": every other member's offer still up, newest
// first. Members can't see their own here (they're under Your player loans).
export default function Postings({ player, rules, canBorrow, onBorrow }) {
  return (
    <section className={`${GLASS} flex flex-col gap-4 p-5 sm:p-6`} aria-labelledby="postings-heading">
      <div>
        <h2 id="postings-heading" className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
          Player loan <span className="text-brand-gold">postings</span>
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Borrowed PP lands in your wallet as PP. Each lender takes {rules.autoRepay}% of your daily PP at 12:00 until you&apos;re paid up, and you can pay
          anyone off early. You can have up to {rules.maxLenders} lenders, and owe {points(player.room)} PP more at most right now.
        </p>
        {!canBorrow && <p className="mt-2 text-sm text-brand-gold">Post a review first: members with no reviews can&apos;t borrow.</p>}
      </div>

      {player.postings.length === 0 ? (
        <p className="text-white/60">Nobody has an offer up right now.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {player.postings.map((offer) => (
            <Posting key={offer._id} offer={offer} rules={rules} canBorrow={canBorrow} onBorrow={onBorrow} />
          ))}
        </ul>
      )}
    </section>
  )
}
