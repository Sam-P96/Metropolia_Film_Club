const ORDER = '23456789TJQKA'
const value = (code) => ORDER.indexOf(code[0])

// Which of your five cards make your hand (positions 0 to 4), for the glow
// round them: a pair's two cards, two pair's four, three or four of a kind,
// all five for a straight, flush or full house, and for nothing at all the
// highest card. Null until all five are known. The server decides who
// wins (backend/games/poker/evaluator.js); this is only for the picture.
export function madeHand(codes) {
  if (codes.length !== 5 || codes.some((code) => !code)) return null
  const values = codes.map(value)
  const byRank = new Map()
  values.forEach((v, i) => byRank.set(v, [...(byRank.get(v) ?? []), i]))
  // Biggest group first, then the higher rank.
  const groups = [...byRank.values()].sort((a, b) => b.length - a.length || values[b[0]] - values[a[0]])
  const flush = codes.every((code) => code[1] === codes[0][1])
  const distinct = [...new Set(values)].sort((a, b) => a - b)
  const straight = distinct.length === 5 && (distinct[4] - distinct[0] === 4 || distinct.join() === '0,1,2,3,12')
  const all = [0, 1, 2, 3, 4]

  if (straight && flush) return { name: distinct[0] === 8 ? 'Royal flush' : 'Straight flush', cards: all }
  if (groups[0].length === 4) return { name: 'Four of a kind', cards: groups[0] }
  if (groups[0].length === 3 && groups[1].length === 2) return { name: 'Full house', cards: all }
  if (flush) return { name: 'Flush', cards: all }
  if (straight) return { name: 'Straight', cards: all }
  if (groups[0].length === 3) return { name: 'Three of a kind', cards: groups[0] }
  if (groups[0].length === 2 && groups[1].length === 2) return { name: 'Two pair', cards: [...groups[0], ...groups[1]] }
  if (groups[0].length === 2) return { name: 'One pair', cards: groups[0] }
  return { name: 'High card', cards: [values.indexOf(Math.max(...values))] }
}

