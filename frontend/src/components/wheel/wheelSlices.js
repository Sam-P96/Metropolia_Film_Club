// A wheel's slices by weight: a film with weight 3 gets three times the room
// (and three times the chance) of one with weight 1. Films from before
// weights existed have none, and count as 1.
export const weightOf = (item) => item.weight ?? 1

const totalWeight = (items) => items.reduce((sum, item) => sum + weightOf(item), 0)

// Where each film's slice starts and how wide it is, in degrees clockwise
// from the top (where the pointer is).
export function wheelSlices(items) {
  const total = totalWeight(items)
  let at = 0
  return items.map((item) => {
    const size = (360 * weightOf(item)) / total
    const slice = { start: at, size }
    at += size
    return slice
  })
}

// Which film a spin lands on: its place in `items`, by weight.
export function pickSlice(items, random = Math.random) {
  let left = random() * totalWeight(items)
  for (let i = 0; i < items.length; i += 1) {
    left -= weightOf(items[i])
    if (left < 0) return i
  }
  return items.length - 1
}

// A film's chance, as "25%" (or "<1%").
export function chanceOf(item, items) {
  const percent = (100 * weightOf(item)) / totalWeight(items)
  return percent < 1 ? '<1%' : `${Math.round(percent)}%`
}
