import clankerPfp from '../assets/SECRETpfp/Clanker_pfp.png'

// Clanker's picture, wherever it plays: Kino Farkle and Infinite Gomoku.
export const CLANKER_PICTURE = clankerPfp

// A player as the game has them, with Clanker's picture if it's the bot
// (Kino Farkle's server sends it as { username, avatarUrl: null, bot: true }).
export function withClankerPicture(person) {
  return person?.bot ? { ...person, avatarUrl: CLANKER_PICTURE } : person
}
