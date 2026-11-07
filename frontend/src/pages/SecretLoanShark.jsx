import '@fontsource/bebas-neue'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import MemberAvatar from '../components/profile/MemberAvatar'
import useApi from '../hooks/useApi'
import { addToJobList, getJobLists, removeFromJobList, searchJobMembers } from '../services/loanSharkAdmin'

const COLUMN = 'flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-ink/60 p-4 shadow-xl shadow-black/40 backdrop-blur-xl sm:p-5'
const SMALL_BUTTON =
  'shrink-0 rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-white/80 transition-colors hover:border-brand-gold hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
const SHOW_REVIEW_KEY = 'secretLoanShark.showReviewList'

const LIST_NAMES = { persuasion: 'Persuasion List', protected: 'Protected List' }

function readShowReview() {
  try {
    return localStorage.getItem(SHOW_REVIEW_KEY) !== 'hidden'
  } catch {
    return true
  }
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Helsinki' }) : 'never'

function Tag({ children, tone = 'plain' }) {
  const tones = {
    plain: 'bg-white/10 text-white/70',
    gold: 'bg-brand-gold/15 text-brand-gold',
    red: 'bg-red-500/15 text-red-200',
    green: 'bg-emerald-500/15 text-emerald-200',
  }
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${tones[tone]}`}>{children}</span>
}

// One member in a column: picture, name, and what's worth knowing.
function Row({ entry, details, tag, action }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <MemberAvatar user={entry.user} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link to={`/users/${entry.user._id}`} className="truncate text-sm font-semibold text-white hover:text-brand-gold">
            {entry.user.username}
          </Link>
          {tag}
        </div>
        <p className="truncate text-xs text-white/50">{details}</p>
      </div>
      {action}
    </li>
  )
}

const reviewsText = (count) => `${count} ${count === 1 ? 'review' : 'reviews'}`
const pvpText = (pvp) => (pvp ? 'PvP on' : 'PvP off')

// Search members by username, each with an Add button for `list`.
function MemberSearch({ list, onAdd }) {
  const [query, setQuery] = useState('')
  const [found, setFound] = useState({ q: '', items: [] })
  const [busy, setBusy] = useState(null)
  const q = query.trim()

  useEffect(() => {
    if (!q) return undefined
    let stopped = false
    const timer = setTimeout(() => {
      searchJobMembers(q)
        .then((items) => !stopped && setFound({ q, items }))
        .catch(() => !stopped && setFound({ q, items: [] }))
    }, 250)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [q])

  const results = q && found.q === q ? found.items : []

  async function add(entry) {
    setBusy(entry.user._id)
    const ok = await onAdd(list, entry.user)
    if (ok) setFound((current) => ({ ...current, items: current.items.map((item) => (item.user._id === entry.user._id ? { ...item, list } : item)) }))
    setBusy(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search members to add…"
        aria-label={`Search members to add to the ${LIST_NAMES[list]}`}
        className="w-full rounded-lg border border-white/15 bg-ink/70 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-brand-gold focus:outline-none"
      />
      {q && found.q === q && results.length === 0 && <p className="text-xs text-white/50">Nobody by that name.</p>}
      {results.length > 0 && (
        <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
          {results.map((entry) => {
            const here = entry.list === list
            const other = entry.list && !here
            return (
              <Row
                key={entry.user._id}
                entry={entry}
                details={`${reviewsText(entry.reviews)} · ${pvpText(entry.pvp)}${other ? ` · on the ${LIST_NAMES[entry.list]}` : ''}`}
                action={
                  <button type="button" className={SMALL_BUTTON} disabled={here || busy === entry.user._id} onClick={() => add(entry)}>
                    {here ? 'On this list' : other ? 'Move here' : 'Add'}
                  </button>
                }
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Column({ title, count, explainer, children, labelledBy }) {
  return (
    <section className={COLUMN} aria-labelledby={labelledBy}>
      <div>
        <h2 id={labelledBy} className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
          {title} <span className="text-brand-gold tabular-nums">{count}</span>
        </h2>
        <p className="mt-1 text-sm text-white/60">{explainer}</p>
      </div>
      {children}
    </section>
  )
}

function Members({ children, empty }) {
  if (!children.length) return <p className="text-sm text-white/50">{empty}</p>
  return <ul className="flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto pr-1">{children}</ul>
}

// /SECRETloanshark: who King Loan Shark's jobs can pick
// (backend/utils/loanShark/jobLists.js, the same rules the jobs use). Admins
// only: the server checks, and anyone else sees none of it. Not linked from
// anywhere. Four columns, side by side on a wide screen, one under another
// on a phone; the Review Persuasion List can be hidden.
export default function SecretLoanShark() {
  const lists = useApi(() => getJobLists(), [])
  const data = lists.data
  const [showReview, setShowReview] = useState(readShowReview)
  const [error, setError] = useState(null)

  function toggleReview() {
    const next = !showReview
    setShowReview(next)
    try {
      localStorage.setItem(SHOW_REVIEW_KEY, next ? 'shown' : 'hidden')
    } catch {
      // A private window: it just won't be remembered.
    }
  }

  // Runs a change; the lists come back as they now are. True if it worked.
  async function change(action) {
    setError(null)
    try {
      lists.setData(await action())
      return true
    } catch (problem) {
      setError(problem.message)
      return false
    }
  }

  const add = (list, user) => change(() => addToJobList(list, user._id))
  const remove = (list, user) => change(() => removeFromJobList(list, user._id))
  const protect = (user) => {
    const ok = window.confirm(
      `${user.username} is on the Persuasion List automatically, because they're quiet. The only way to keep them from being picked is the Protected List. Move them there?`,
    )
    return ok ? change(() => addToJobList('protected', user._id)) : null
  }

  if (lists.error) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-12 text-white/70">
        {lists.error.status === 403 ? 'This page is for admins.' : "Couldn't load it. Try refreshing the page."}
      </section>
    )
  }

  const quietRule = data ? `fewer than ${data.rules.fewReviews} reviews, or no review, comment or like in ${data.rules.quietDays} days` : ''

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 text-white sm:py-12">
      <h1 className="font-['Bebas_Neue'] text-5xl leading-none tracking-wide">
        King Loan Shark&apos;s <span className="text-brand-gold">lists</span>
      </h1>
      <p className="mt-2 max-w-3xl text-white/60">
        Who his jobs can pick: X in &ldquo;Convince X to…&rdquo;, and Y, the member a job is aimed at. Changes only affect jobs made from now on. Admins only.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={toggleReview} aria-pressed={showReview} className={SMALL_BUTTON}>
          {showReview ? 'Hide the Review Persuasion List' : 'Show the Review Persuasion List'}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
      </div>

      {!data ? (
        <p className="mt-8 text-sm text-white/40">Loading…</p>
      ) : (
        <>
          <div className={`mt-5 grid items-start gap-5 ${showReview ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            <Column
              labelledBy="persuasion-heading"
              title="Persuasion List"
              count={data.persuasion.length}
              explainer={`X for dislike and steal jobs: every quiet member (${quietRule}), plus anyone added by hand. Never the Protected List. ${
                data.persuasion.filter((entry) => entry.pvp).length
              } of them have PvP on, and only they can be picked: both jobs need PvP.`}
            >
              <MemberSearch list="persuasion" onAdd={add} />
              <Members empty="Nobody can be X right now.">
                {data.persuasion.map((entry) => (
                  <Row
                    key={entry.user._id}
                    entry={entry}
                    tag={entry.tag === 'hand' ? <Tag tone="gold">Added by hand</Tag> : <Tag>Auto (quiet)</Tag>}
                    details={`${reviewsText(entry.reviews)} · active ${formatDate(entry.lastActive)} · ${pvpText(entry.pvp)}`}
                    action={
                      <button
                        type="button"
                        className={SMALL_BUTTON}
                        onClick={() => (entry.tag === 'hand' ? remove('persuasion', entry.user) : protect(entry.user))}
                        title={entry.tag === 'hand' ? 'Take them off the hand-kept list' : 'Move them to the Protected List'}
                      >
                        Remove
                      </button>
                    }
                  />
                ))}
              </Members>
            </Column>

            {showReview && (
              <Column
                labelledBy="review-heading"
                title="Review Persuasion List"
                count={data.reviewPersuasion.length}
                explainer={`X for "Convince X to post a movie review": everyone not on the Protected List, PvP or not. The ${
                  data.reviewPersuasion.filter((entry) => entry.inactive).length
                } inactive ones are picked first; anyone else only when nobody's inactive. To keep someone out, protect them.`}
              >
                <Members empty="Nobody can be X right now.">
                  {data.reviewPersuasion.map((entry) => (
                    <Row
                      key={entry.user._id}
                      entry={entry}
                      tag={entry.inactive ? <Tag tone="green">Inactive · first</Tag> : <Tag>Active · fallback</Tag>}
                      details={`${reviewsText(entry.reviews)} · active ${formatDate(entry.lastActive)} · ${pvpText(entry.pvp)}`}
                    />
                  ))}
                </Members>
              </Column>
            )}

            <Column
              labelledBy="protected-heading"
              title="Protected List"
              count={data.protected.length}
              explainer="Never picked as X. Can still be targeted if they have PvP on."
            >
              <MemberSearch list="protected" onAdd={add} />
              <Members empty="Nobody's protected.">
                {data.protected.map((entry) => (
                  <Row
                    key={entry.user._id}
                    entry={entry}
                    details={`${reviewsText(entry.reviews)} · ${pvpText(entry.pvp)} · added by ${entry.addedBy?.username ?? 'a former admin'}, ${formatDate(entry.addedAt)}`}
                    action={
                      <button type="button" className={SMALL_BUTTON} onClick={() => remove('protected', entry.user)}>
                        Remove
                      </button>
                    }
                  />
                ))}
              </Members>
            </Column>

            <Column
              labelledBy="target-heading"
              title="Target List"
              count={data.targets.length}
              explainer="Y: members with PvP on. Change this by changing their PvP setting."
            >
              <Members empty="Nobody has PvP on.">
                {data.targets.map((entry) => (
                  <Row
                    key={entry.user._id}
                    entry={entry}
                    tag={entry.protected ? <Tag tone="red">Protected</Tag> : null}
                    details={reviewsText(entry.reviews)}
                  />
                ))}
              </Members>
            </Column>
          </div>

          <p className="mt-5 text-sm text-white/50">
            {data.hidden} {data.hidden === 1 ? 'account' : 'accounts'} hidden (excluded in config).
          </p>
        </>
      )}
    </section>
  )
}
