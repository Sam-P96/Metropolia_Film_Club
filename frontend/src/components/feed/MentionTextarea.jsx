import { useId, useMemo, useRef, useState } from 'react'
import MemberAvatar from '../profile/MemberAvatar'
import useApi from '../../hooks/useApi'
import { getUsers } from '../../services/users'
import { getCurrentUserId } from '../../utils/currentUser'
import { closestNames, mentionAt } from '../../../../shared/mentions.js'

// How many names to suggest.
const SUGGESTIONS = 3

// A textarea where "@" tags a member (shared/mentions.js): typing "@" and
// the start of a name lists the 3 closest usernames under it. Click one, or
// pick with the arrow keys and Enter or Tab, and "@username " goes in where
// you were typing. Escape closes the list (and only the list). Everything
// else is a plain textarea: `value`, `onChange(text)` (the text, not the
// event), `maxLength`, `onKeyDown`, `className`, and `textareaRef` to reach
// the textarea itself.
export default function MentionTextarea({ value, onChange, maxLength, onKeyDown, textareaRef, className = '', ...props }) {
  const me = getCurrentUserId()
  const { data: everyone = [] } = useApi(getUsers, [])
  const members = useMemo(() => everyone.filter((member) => member._id !== me), [everyone, me])
  const names = useMemo(() => members.map((member) => member.username), [members])
  const ownRef = useRef(null)
  const box = textareaRef ?? ownRef
  const listId = useId()

  // Where the cursor is (null while the box isn't focused), which suggestion
  // is picked, and the "@" whose list Escape closed.
  const [caret, setCaret] = useState(null)
  const [active, setActive] = useState(0)
  const [closed, setClosed] = useState(null)

  const open = caret === null ? null : mentionAt(value, caret, names)
  const suggestions =
    open && open.start !== closed
      ? closestNames(open.query, names, SUGGESTIONS)
          .map((name) => members.find((member) => member.username === name))
          .filter(Boolean)
      : []
  const highlighted = Math.min(active, Math.max(0, suggestions.length - 1))

  const pick = (member) => {
    const before = value.slice(0, open.start)
    const after = value.slice(caret).replace(/^ /, '')
    const tag = `@${member.username} `
    let next = before + tag + after
    if (maxLength) next = next.slice(0, maxLength)
    const at = Math.min(before.length + tag.length, next.length)
    onChange(next)
    setActive(0)
    setCaret(at)
    requestAnimationFrame(() => {
      box.current?.focus()
      box.current?.setSelectionRange(at, at)
    })
  }

  const handleKeyDown = (event) => {
    if (suggestions.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setActive((highlighted + step + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        pick(suggestions[highlighted])
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setClosed(open.start)
        return
      }
    }
    onKeyDown?.(event)
  }

  const track = (event) => setCaret(event.currentTarget.selectionStart)

  return (
    <div className="relative">
      <textarea
        {...props}
        ref={box}
        value={value}
        maxLength={maxLength}
        onChange={(event) => {
          onChange(event.target.value)
          setCaret(event.target.selectionStart)
          setActive(0)
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={track}
        onClick={track}
        onFocus={track}
        onBlur={() => setCaret(null)}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={suggestions.length > 0 ? `${listId}-${highlighted}` : undefined}
        className={className}
      />
      {suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Members to tag"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-white/15 bg-ink/95 py-1 shadow-xl shadow-black/50 backdrop-blur-md"
        >
          {suggestions.map((member, index) => (
            <li key={member._id} id={`${listId}-${index}`} role="option" aria-selected={index === highlighted}>
              <button
                type="button"
                // Picking keeps the cursor in the box (no blur first).
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(member)}
                onMouseEnter={() => setActive(index)}
                className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm text-white transition-colors ${
                  index === highlighted ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <MemberAvatar user={member} size="sm" />
                <span className="min-w-0 truncate">@{member.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
