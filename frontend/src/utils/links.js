// Web addresses in what members write: anything starting http://, https://
// or www., up to the next space.
const LINK = /\b(?:https?:\/\/|www\.)\S+/gi

// Something must follow the start for it to be an address at all.
const ADDRESS = /^(?:https?:\/\/|www\.)\w/i

// Punctuation that ends the sentence rather than the address: "see
// https://example.com." links without the full stop. A closing bracket stays
// when the address opened one, as Wikipedia's do.
function trimEnd(url) {
  let end = url.length

  while (end > 0) {
    const last = url[end - 1]

    if (last === ')') {
      const part = url.slice(0, end)
      if (part.split('(').length >= part.split(')').length) break
    } else if (!'.,!?;:\'"]'.includes(last)) {
      break
    }

    end--
  }

  return url.slice(0, end)
}

// `text` as pieces to draw in order: strings for plain text, and
// { text, href } for each link. Only http and https links are made, so
// nobody can slip in a javascript: one.
export function splitLinks(text) {
  const parts = []
  let plainFrom = 0

  for (const match of text.matchAll(LINK)) {
    const url = trimEnd(match[0])
    if (!ADDRESS.test(url)) continue

    if (match.index > plainFrom) parts.push(text.slice(plainFrom, match.index))
    parts.push({ text: url, href: /^www\./i.test(url) ? `https://${url}` : url })
    plainFrom = match.index + url.length
  }

  if (plainFrom < text.length) parts.push(text.slice(plainFrom))
  return parts
}
