import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

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

// Replies indent this many levels at most, so long threads still fit on a
// phone. Deeper replies line up under the last level.
const MAX_INDENT = 5

// Threads from the flat list the server sends (oldest first): each comment
// under the one it replies to, replies oldest first. A reply whose parent
// was deleted hangs under a "[deleted]" stand-in, as on Reddit.
function buildThreads(comments) {
  const nodes = new Map(comments.map((comment) => [comment._id, { ...comment, replies: [] }]))
  const threads = []

  for (const node of [...nodes.values()]) {
    if (!node.parent) {
      threads.push(node)
      continue
    }

    if (!nodes.has(node.parent)) {
      const standIn = { _id: node.parent, deleted: true, createdAt: node.createdAt, replies: [] }
      nodes.set(node.parent, standIn)
      threads.push(standIn)
    }

    nodes.get(node.parent).replies.push(node)
  }

  return threads.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

// The comments under a review: a box to write one, then the threads, newest
// or oldest first. Anyone logged in can reply to any comment, and replies
// nest under it. Comments have likes and dislikes, like the review. Their
// author, and moderators and admins, can delete them. A Feed link to a
// reply (#comment-<id>) scrolls to it and flashes it.
function ReviewComments({ reviewId, isAuthenticated }) {
  const location = useLocation()
  const [currentUser] = useState(getCurrentUser)
  const [sort, setSort] = useState('recent')
  const { data, loading, error, setData } = useApi(() => getComments(reviewId), [reviewId])

  const comments = data ?? []
  const threads = buildThreads(comments)
  const sorted = sort === 'oldest' ? threads : [...threads].reverse()

  const target = location.hash.startsWith('#comment-') ? location.hash.slice('#comment-'.length) : null

  useEffect(() => {
    if (loading || !target) return
    document.getElementById(`comment-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [loading, target])

  const updateComment = (id, change) =>
    setData((prev) => prev.map((comment) => (comment._id === id ? { ...comment, ...change } : comment)))

  const addToList = (comment) => setData((prev) => [...(prev ?? []), comment])

  // What every comment in every thread needs.
  const thread = {
    reviewId,
    target,
    isAuthenticated,
    canDelete: (comment) => comment.user._id === currentUser?._id || canDeleteAnyComment(currentUser),
    onVoteChange: updateComment,
    onDeleted: (id) => setData((prev) => prev.filter((comment) => comment._id !== id)),
    onReplied: addToList,
  }

  const handlePosted = (comment) => {
    addToList(comment)
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

        {threads.length > 1 && (
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
          {sorted.map((node) => (
            <Thread key={node._id} node={node} depth={0} thread={thread} />
          ))}
        </ul>
      )}
    </section>
  )
}

// A comment, a reply box under it while replying, then its replies, each a
// thread of its own, indented along a line.
function Thread({ node, depth, thread }) {
  const [replying, setReplying] = useState(false)

  return (
    <li id={`comment-${node._id}`} className="scroll-mt-28">
      {node.deleted ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-white/30 italic">
          [deleted]
        </p>
      ) : (
        <Comment
          comment={node}
          flash={thread.target === node._id}
          canDelete={thread.canDelete(node)}
          canReply={thread.isAuthenticated}
          onReply={() => setReplying(true)}
          onVoteChange={(votes) => thread.onVoteChange(node._id, votes)}
          onDeleted={() => thread.onDeleted(node._id)}
        />
      )}

      {replying && (
        <div className="mt-3 ml-4 sm:ml-6">
          <CommentForm
            reviewId={thread.reviewId}
            parent={node}
            onPosted={(reply) => {
              thread.onReplied(reply)
              setReplying(false)
            }}
            onCancel={() => setReplying(false)}
          />
        </div>
      )}

      {node.replies.length > 0 && (
        <ul
          className={`mt-3 space-y-3 ${
            depth < MAX_INDENT ? 'ml-4 border-l border-white/10 pl-4 sm:ml-6 sm:pl-5' : ''
          }`}
        >
          {node.replies.map((reply) => (
            <Thread key={reply._id} node={reply} depth={depth + 1} thread={thread} />
          ))}
        </ul>
      )}
    </li>
  )
}

// The box for a new comment, or with `parent` a reply to that comment, with
// a Cancel button.
function CommentForm({ reviewId, parent = null, onPosted, onCancel }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const id = parent ? `reply-${parent._id}` : 'comment'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    setSaving(true)
    setError(null)

    try {
      onPosted(await addComment(reviewId, text.trim(), parent?._id ?? null))
      setText('')
    } catch (err) {
      // Keep what they wrote.
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={parent ? '' : 'mt-6'}>
      <label htmlFor={id} className="sr-only">
        {parent ? `Reply to ${parent.user.username}` : 'Write a comment'}
      </label>
      <textarea
        id={id}
        rows={parent ? 2 : 3}
        maxLength={MAX_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={parent ? `Reply to ${parent.user.username}…` : 'Add a comment…'}
        autoFocus={Boolean(parent)}
        className="w-full resize-y rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-xs text-white/30">
          {text.length} / {MAX_LENGTH}
        </span>

        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
            >
              Cancel
            </button>
          )}
          <button
            disabled={saving || !text.trim()}
            className="rounded-md bg-brand-red px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Posting…' : parent ? 'Reply' : 'Post comment'}
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
    </form>
  )
}

// One comment. Delete asks first, right where the button was. `flash`
// rings it in gold for a moment, when a Feed link brought you here.
function Comment({ comment, flash, canDelete, canReply, onReply, onVoteChange, onDeleted }) {
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
    <div
      className={`flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm ${
        flash ? 'motion-safe:animate-comment-flash' : ''
      }`}
    >
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

          {canReply && (
            <button
              type="button"
              onClick={onReply}
              className="text-xs font-medium text-white/50 transition-colors hover:text-brand-gold"
            >
              Reply
            </button>
          )}

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
    </div>
  )
}

export default ReviewComments
