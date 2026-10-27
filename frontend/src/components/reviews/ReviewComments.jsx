import { useState } from 'react'
import { Link } from 'react-router-dom'

import PillToggle from '../PillToggle'
import MemberAvatar from '../profile/MemberAvatar'
import VoteButtons from './VoteButtons'
import useApi from '../../hooks/useApi'
import { addComment, deleteComment, getComments, setCommentVote } from '../../services/comments'
import { getCurrentUser } from '../../utils/currentUser'
import { canDeleteAnyComment } from '../../utils/permissions'
import { timeAgo } from '../../utils/timeAgo'

const SORTS = [
  { value: 'recent', label: 'Recent' },
  { value: 'oldest', label: 'Oldest' },
]

// Matches the limit in backend/controllers/commentController.js.
const MAX_LENGTH = 1000

// The comments under a review: a box to write one, then the list, newest or
// oldest first. Comments have likes and dislikes, like the review. Their
// author, and moderators and admins, can delete them.
function ReviewComments({ reviewId, isAuthenticated }) {
  const [currentUser] = useState(getCurrentUser)
  const [sort, setSort] = useState('recent')
  const { data, loading, error, setData } = useApi(() => getComments(reviewId), [reviewId])

  // The server sends them oldest first.
  const comments = data ?? []
  const sorted = sort === 'oldest' ? comments : [...comments].reverse()

  const canDelete = (comment) =>
    comment.user._id === currentUser?._id || canDeleteAnyComment(currentUser)

  const updateComment = (id, change) =>
    setData((prev) => prev.map((comment) => (comment._id === id ? { ...comment, ...change } : comment)))

  const removeComment = (id) =>
    setData((prev) => prev.filter((comment) => comment._id !== id))

  const handlePosted = (comment) => {
    setData((prev) => [...(prev ?? []), comment])
    // Newest first, so they see it at the top.
    setSort('recent')
  }

  return (
    <section className="mt-14" aria-labelledby="comments-heading">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <h2
          id="comments-heading"
          className="text-sm font-semibold tracking-widest text-brand-gold uppercase"
        >
          Comments
          {comments.length > 0 && <span className="ml-2 text-white/40">{comments.length}</span>}
        </h2>

        {comments.length > 1 && (
          <PillToggle options={SORTS} value={sort} onChange={setSort} label="Sort comments" />
        )}
      </div>

      {isAuthenticated ? (
        <CommentForm reviewId={reviewId} onPosted={handlePosted} />
      ) : (
        <p className="mt-6 text-sm text-white/60">
          <Link
            to="/login"
            state={{ from: `/reviews/${reviewId}` }}
            className="font-medium text-brand-gold transition-colors hover:text-white"
          >
            Log in
          </Link>{' '}
          to comment.
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-white/40">Loading comments…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-white/40">Couldn't load the comments. Try refreshing the page.</p>
      ) : comments.length === 0 ? (
        <p className="mt-6 text-sm text-white/40">No comments yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sorted.map((comment) => (
            <Comment
              key={comment._id}
              comment={comment}
              canDelete={canDelete(comment)}
              onVoteChange={(votes) => updateComment(comment._id, votes)}
              onDeleted={() => removeComment(comment._id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function CommentForm({ reviewId, onPosted }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    setSaving(true)
    setError(null)

    try {
      onPosted(await addComment(reviewId, text.trim()))
      setText('')
    } catch (err) {
      // Keep what they wrote.
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <label htmlFor="comment" className="sr-only">
        Write a comment
      </label>
      <textarea
        id="comment"
        rows={3}
        maxLength={MAX_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment…"
        className="w-full resize-y rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-xs text-white/30">
          {text.length} / {MAX_LENGTH}
        </span>

        <button
          disabled={saving || !text.trim()}
          className="rounded-md bg-brand-red px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Posting…' : 'Post comment'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
    </form>
  )
}

// One comment. Delete asks first, right where the button was.
function Comment({ comment, canDelete, onVoteChange, onDeleted }) {
  const { user } = comment
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      await deleteComment(comment._id)
      onDeleted()
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      {/* The name beside it is the link for screen readers and keyboards. */}
      <Link to={`/users/${user._id}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <MemberAvatar user={user} size="sm" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <Link
            to={`/users/${user._id}`}
            className="font-semibold text-white transition-colors hover:text-brand-gold"
          >
            {user.username}
          </Link>
          <span className="ml-2 text-xs text-white/40">{timeAgo(comment.createdAt)}</span>
        </p>

        <p className="mt-1 text-sm leading-relaxed wrap-break-word whitespace-pre-line text-white/80">
          {comment.text}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <VoteButtons
            likeCount={comment.likeCount}
            dislikeCount={comment.dislikeCount}
            myVote={comment.myVote}
            send={(vote) => setCommentVote(comment._id, vote)}
            onChange={onVoteChange}
            subject="comment"
            allowDislikes={user.pvp}
          />

          {canDelete &&
            (confirming ? (
              <span className="flex items-center gap-3 text-xs">
                <span className="text-white/70">Delete this comment?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="font-medium text-brand-red transition-colors hover:text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="text-white/50 transition-colors hover:text-white"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-xs text-white/40 transition-colors hover:text-brand-red"
              >
                Delete
              </button>
            ))}
        </div>

        {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}
      </div>
    </li>
  )
}

export default ReviewComments
