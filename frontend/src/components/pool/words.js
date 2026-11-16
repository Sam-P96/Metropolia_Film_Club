import { SOLIDS, STRIPES, ballsLeft, foulText } from '../../../../shared/pool/rules.js'

// 8 Ball Pool in words, from the viewer's side. `names` are the players by
// seat; `me` the viewer's seat (-1 when watching).

const listOf = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)

// How a game ended, in a few words.
export function endingOf(match, names, me = match.mySeat) {
  const winner = match.winner
  const loser = winner === null || winner === undefined ? null : 1 - winner
  const who = (seat) => (seat === me ? 'You' : names[seat])
  const lower = (seat) => (seat === me ? 'you' : names[seat])
  switch (match.endedBy) {
    case 'eight':
      return `${who(winner)} sank the 8 ball`
    case 'eightFoul':
      return `${who(loser)} sank the 8 ball too soon or on a foul, so ${lower(winner)} won`
    case 'resign':
      return `${who(loser)} resigned`
    case 'forfeit':
      return loser === me ? 'Three days went by without your shot' : `${names[loser]} ran out of time`
    case 'left':
      return `${names[loser]} left the club`
    default:
      return winner === me ? 'You won' : `${names[winner]} won`
  }
}

// What the last shot did: "Sam potted 3 and 11. Sam has solids." or "You
// pocketed the cue ball: Clanker has the cue ball in hand." Empty before
// the first shot, and once the game's over.
export function lastShotText(match, names, me = match.mySeat) {
  const shot = match.lastShot
  if (!shot || match.status !== 'active') return ''
  const seat = shot.seat
  const who = seat === me ? 'You' : names[seat]
  const parts = []

  const balls = shot.pocketed.filter((id) => id !== 0 && id !== 8)
  if (shot.foul) {
    const next = 1 - seat
    parts.push(`${foulText(shot.foul, seat === me).replace(/^They/, names[seat])}: ${next === me ? 'you have' : `${names[next]} has`} the cue ball in hand.`)
  } else if (balls.length) {
    parts.push(`${who} potted ${listOf(balls.map(String))}.`)
  } else if (shot.firstHit !== null) {
    parts.push(`${who} didn't pot anything.`)
  }
  if (shot.respotted) parts.push('The 8 ball went down on the break, so it went back on its spot.')
  if (shot.assigned) {
    const group = shot.assigned === SOLIDS ? 'solids' : 'stripes'
    parts.push(`${seat === me ? 'You have' : `${names[seat]} has`} ${group}.`)
  }
  if (shot.keeps) parts.push(seat === me ? 'Shoot again.' : `${names[seat]} shoots again.`)
  return parts.join(' ')
}

// The line under the table: whose shot it is, and what they're on.
export function turnText(match, names, me = match.mySeat) {
  if (match.status !== 'active') return ''
  const seat = match.current
  const mine = seat === me
  const group = match.solids === 0 || match.solids === 1 ? (match.solids === seat ? 'solids' : 'stripes') : null
  const left = group === null ? 7 : match.balls ? ballsLeft(match.balls, group === 'solids' ? SOLIDS : STRIPES) : (match.left?.[seat] ?? 7)
  const on = group === null ? 'the table is open' : left === 0 ? 'on the 8 ball' : `on ${group}`
  if (match.breakShot) return mine ? 'Your break. Put the cue ball anywhere behind the line, then shoot.' : `${names[seat]} breaks.`
  if (mine) return `Your shot: ${on}.${match.hand ? ' The cue ball is in your hand: put it anywhere.' : ''}`
  return `${names[seat]}'s shot: ${on}.`
}
