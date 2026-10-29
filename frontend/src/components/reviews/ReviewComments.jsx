import { useEffect, useId, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import PillToggle from '../PillToggle'
import MemberAvatar from '../profile/MemberAvatar'
import VoteButtons from './VoteButtons'
import useApi from '../../hooks/useApi'
import { addComment, deleteComment, getComments, setCommentVote } from '../../services/comments'
import { addCutReply, getCutReplies } from '../../services/cuts'
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

// What the comments under a review, and the replies under a cut, say.
const WORDS = {
  review: {
    heading: 'Comments',
    label: 'Write a comment',
    placeholder: 'Add a comment…',
    post: 'Post comment',
    logInTo: 'to comment.',
    loading: 'Loading comments…',
    failed: "Couldn't load the comments. Try refreshing the page.",
    none: 'No comments yet.',
    confirmDelete: 'Delete this comment?',
  },
  cut: {
    heading: 'Replies',
    label: 'Reply to this cut',
    placeholder: 'Reply to this cut…',
    post: 'Post reply',
    logInTo: 'to reply.',
    loading: 'Loading replies…',
    failed: "Couldn't load the replies. Try refreshing the page.",
    none: 'No replies yet.',
    confirmDelete: 'Delete this reply?',
  },
}

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

// A box to write a comment, then the threads, newest or oldest first: the
// comments under a review, or the replies under a cut. `load` fetches them
// all (again when `loadKey` changes) and `add(text, parentId)` posts one.
// Anyone logged in can reply to any comment, and replies nest under it.
// Comments have likes and dislikes. Their author, and moderators and
// admins, can delete them. A Feed link to a reply (#comment-<id>) scrolls to
// it and flashes it. `onCountChange` hears how many there are.
function CommentSection({ load, add, loadKey, loginFrom, isAuthenticated, words, className, onCountChange }) {
  const location = useLocation()
  const headingId = useId()
  const [currentUser] = useState(getCurrentUser)
  const [sort, setSort] = useState('recent')
  const { data, loading, error, setData } = useApi(load, [loadKey])

  const comments = data ?? []
  const threads = buildThreads(comments)
  const sorted = sort === 'oldest' ? threads : [...threads].reverse()

  const target = location.hash.startsWith('#comment-') ? location.hash.slice('#comment-'.length) : null

  useEffect(() => {
    if (loading || !target) return
    document.getElementById(`comment-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [loading, target])

  useEffect(() => {
    if (data) onCountChange?.(data.length)
  }, [data, onCountChange])

  const updateComment = (id, change) =>
    setData((prev) => prev.map((comment) => (comment._id === id ? { ...comment, ...change } : comment)))

  const addToList = (comment) => setData((prev) => [...(prev ?? []), comment])

  // What every comment in every thread needs.
  const thread = {
    add,
    words,
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
    <section className={className} aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <h2
          id={headingId}
          className="text-sm font-semibold tracking-widest text-brand-gold uppercase"
        >
          {words.heading}
          {comments.length > 0 && <span className="ml-2 text-white/40">{comments.length}</span>}
        </h2>

        {threads.length > 1 && (
          <PillToggle options={SORTS} value={sort} onChange={setSort} label={`Sort ${words.heading.toLowerCase()}`} />
        )}
      </div>

      {isAuthenticated ? (
        <CommentForm add={add} words={words} onPosted={handlePosted} />
      ) : (
        <p className="mt-6 text-sm text-white/60">
          <Link
            to="/login"
            state={{ from: loginFrom }}
            className="font-medium text-brand-gold transition-colors hover:text-white"
          >
            Log in
          </Link>{' '}
          {words.logInTo}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-white/40">{words.loading}</p>
      ) : error ? (
        <p className="mt-6 text-sm text-white/40">{words.failed}</p>
      ) : comments.length === 0 ? (
        <p className="mt-6 text-sm text-white/40">{words.none}</p>
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

// The comments under a review, on its page.
function ReviewComments({ reviewId, isAuthenticated }) {
  return (
    <CommentSection
      load={() => getComments(reviewId)}
      add={(text, parent) => addComment(reviewId, text, parent)}
      loadKey={reviewId}
      loginFrom={`/reviews/${reviewId}`}
      isAuthenticated={isAuthenticated}
      words={WORDS.review}
      className="mt-14"
    />
  )
}

// The replies under a cut, which work just like comments. Cuts are only
// for logged-in members, so there's always a box to reply in.
export function CutReplies({ cutId, onCountChange, className = '' }) {
  return (
    <CommentSection
      load={() => getCutReplies(cutId)}
      add={(text, parent) => addCutReply(cutId, text, parent)}
      loadKey={cutId}
      loginFrom="/feed"
      isAuthenticated
      words={WORDS.cut}
      className={className}
      onCountChange={onCountChange}
    />
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
          words={thread.words}
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
            add={thread.add}
            words={thread.words}
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
// a Cancel button. `add(text, parentId)` posts it.
function CommentForm({ add, words, parent = null, onPosted, onCancel }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // The page can have more than one box (a cut's replies, in Notifications).
  const formId = useId()
  const id = parent ? `reply-${parent._id}` : formId

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    setSaving(true)
    setError(null)

    try {
      onPosted(await add(text.trim(), parent?._id ?? null))
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
        {parent ? `Reply to ${parent.user.username}` : words.label}
      </label>
      <textarea
        id={id}
        rows={parent ? 2 : 3}
        maxLength={MAX_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={parent ? `Reply to ${parent.user.username}…` : words.placeholder}
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
            {saving ? 'Posting…' : parent ? 'Reply' : words.post}
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
    </form>
  )
}

// One comment. Delete asks first, right where the button was. `flash`
// rings it in gold for a moment, when a Feed link brought you here.
function Comment({ comment, words, flash, canDelete, canReply, onReply, onVoteChange, onDeleted }) {
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
                <span className="text-white/70">{words.confirmDelete}</span>
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
