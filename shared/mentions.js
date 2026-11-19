// Tagging members in a cut: "@" and their username. Usernames can hold any
// characters, spaces too, so a tag isn't just "@word": it's the longest
// username that the words after the "@" start with (any case, the same
// case first), ending at the end of the text, a space or punctuation. An
// "@" straight after a letter or number (an email address) isn't a tag.
// The server finds the tags with this as a cut is saved
// (backend/utils/mentions.js), and the page uses it to suggest names as you
// type and to link the tags in a cut (frontend/src/components/feed/).

// The most tags a cut can hold.
export const MAX_MENTIONS = 10

const WORD = /[\p{L}\p{N}_]/u
const boundaryAt = (text, index) => index >= text.length || !WORD.test(text[index])

// The tags in `text` from `names` (usernames, or the names a cut's tags were
// written as): [{ start, end, name }], `start` at the "@", `end` just past
// the name, in order, never overlapping.
export function findMentions(text, names) {
  if (!text || !text.includes('@') || names.length === 0) return []
  // Longest first, so "Sam P" wins over "Sam" when both are members.
  const sorted = [...new Set(names)].sort((a, b) => b.length - a.length)
  const lowerText = text.toLowerCase()
  const found = []
  for (let at = text.indexOf('@'); at !== -1; at = text.indexOf('@', at + 1)) {
    if (at > 0 && WORD.test(text[at - 1])) continue
    const from = at + 1
    let best = null
    for (const name of sorted) {
      if (best && name.length < best.length) break
      const end = from + name.length
      if (!boundaryAt(text, end)) continue
      if (text.startsWith(name, from)) {
        best = name
        break
      }
      if (!best && lowerText.startsWith(name.toLowerCase(), from)) best = name
    }
    if (best) {
      found.push({ start: at, end: from + best.length, name: best })
      at = from + best.length - 1
    }
  }
  return found
}

// The tag being typed at `caret`: { start (the "@"), query (what's after
// it) }, or null. It stays open while the words after the "@" could still
// become a username: no line break, and past a space only if some name in
// `names` starts that way (names can have spaces).
export function mentionAt(text, caret, names = []) {
  const before = text.slice(0, caret)
  const at = before.lastIndexOf('@')
  if (at === -1 || (at > 0 && WORD.test(before[at - 1]))) return null
  const query = before.slice(at + 1)
  if (query.length > 30 || /[\n\r]/.test(query)) return null
  if (/\s/.test(query)) {
    const lower = query.toLowerCase()
    if (!names.some((name) => name.toLowerCase().startsWith(lower))) return null
  }
  return { start: at, query }
}

// How far apart two words are: the fewest letters to add, drop, change or
// swap with the next one ("kmi" is one swap from "kim").
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

// How far `query` is from the start of `name` (what's been typed so far),
// allowing the start to be a letter shorter or longer.
function nearMiss(query, name) {
  let best = Infinity
  for (let length = Math.max(1, query.length - 1); length <= query.length + 1; length++) best = Math.min(best, distance(query, name.slice(0, length)))
  return best
}

// The `limit` usernames closest to `query`, closest first: starting with it
// (shortest first), then a word in it starting with it, then holding it,
// then near misses (a letter or two out). An empty query: the first few, by
// name.
export function closestNames(query, names, limit = 3) {
  const q = query.trim().toLowerCase()
  if (!q) return [...names].sort((a, b) => a.localeCompare(b)).slice(0, limit)
  const scored = []
  for (const name of names) {
    const n = name.toLowerCase()
    let score = null
    if (n === q) score = 0
    else if (n.startsWith(q)) score = 1 + n.length / 100
    else if (n.split(/[\s._-]+/).some((word) => word.startsWith(q))) score = 2 + n.length / 100
    else if (n.includes(q)) score = 3 + n.indexOf(q) / 100
    else {
      const miss = nearMiss(q, n)
      const allowed = Math.max(1, Math.floor(q.length / 3))
      if (miss <= allowed) score = 4 + miss + n.length / 1000
    }
    if (score !== null) scored.push({ name, score })
  }
  return scored
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((entry) => entry.name)
}
