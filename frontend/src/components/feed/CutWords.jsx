import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { splitLinks } from '../../utils/links'
import { findMentions } from '../../../../shared/mentions.js'

// What a cut says, drawn: web addresses as links out, and the members it
// tags ("@name", from the cut's `mentions`: [{ _id, name }]) as links to
// their profiles.
export default function CutWords({ text, mentions = [] }) {
  const names = mentions.map((mention) => mention.name)

  const tags = (part, key) => {
    const found = findMentions(part, names)
    if (found.length === 0) return part
    const pieces = []
    let from = 0
    found.forEach((tag, index) => {
      if (tag.start > from) pieces.push(part.slice(from, tag.start))
      const member = mentions.find((mention) => mention.name === tag.name)
      pieces.push(
        <Link key={`${key}-${index}`} to={`/users/${member._id}`} className="font-semibold text-brand-gold transition-colors hover:text-white">
          {part.slice(tag.start, tag.end)}
        </Link>
      )
      from = tag.end
    })
    if (from < part.length) pieces.push(part.slice(from))
    return pieces
  }

  return splitLinks(text).map((part, index) =>
    typeof part === 'string' ? (
      <Fragment key={index}>{tags(part, index)}</Fragment>
    ) : (
      <a
        key={index}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="font-medium break-all text-brand-gold underline underline-offset-2 transition-colors hover:text-white"
      >
        {part.text}
      </a>
    )
  )
}
