// Points as the machine shows them: whole numbers as they are, and cents
// when there are any (12, 12.5, 12.25).
export function formatPoints(points) {
  return points.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
