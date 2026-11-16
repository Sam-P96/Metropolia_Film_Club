import { answerPoolChallenge, getPoolMatch, getPoolStakeLimit, sendPoolChallenge } from '../../services/pool'
import { GAME_NAME } from '../../../../shared/pool/rules.js'

// 8 Ball Pool's challenges, through Infinite Gomoku's challenge card and
// form (components/gomoku/ChallengeCard.jsx, ChallengeForm.jsx): the same
// terms, answers and three days, with pool's own calls.
export const poolPath = (id) => `/games/pool/${id}`

export const POOL_CHALLENGES = {
  name: GAME_NAME,
  path: poolPath,
  answer: answerPoolChallenge,
  get: getPoolMatch,
  first: 'Whoever accepts breaks.',
}

export const POOL_FORM = {
  limit: getPoolStakeLimit,
  send: sendPoolChallenge,
  order: "whoever accepts breaks, so they'll shoot first",
}
