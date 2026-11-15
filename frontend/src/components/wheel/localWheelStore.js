// Local Wheel's films, kept in this browser only: [{ id, title, weight }].
const KEY = 'localWheel'

export const LOCAL_MAX_ENTRIES = 60
export const LOCAL_MAX_WEIGHT = 1000

const valid = (item) => item && typeof item.id === 'string' && typeof item.title === 'string' && item.title.trim()

export function loadLocalWheel() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(items)) return []
    return items.filter(valid).slice(0, LOCAL_MAX_ENTRIES).map((item) => ({
      id: item.id,
      title: item.title.slice(0, 100),
      weight: Number.isInteger(item.weight) ? Math.min(LOCAL_MAX_WEIGHT, Math.max(1, item.weight)) : 1,
    }))
  } catch {
    return []
  }
}

export function saveLocalWheel(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // Storage is off (a private window, say): the wheel lasts until the page closes.
  }
}

export function newItemId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
