import { api } from './api'

// Kino Poker. Playing is over the live connection (hooks/usePokerTable.js);
// this is only how busy the table is, for the intro page:
// { members, bots, queue, seats, playing }.
export function getPokerTable() {
  return api('/poker/table')
}
