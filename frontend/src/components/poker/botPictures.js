import bret from '../../assets/Bret.png'
import kaveriPokerFace from '../../assets/SECRETpfp/kaveri_poker_face.webp'
import { KING_LOAN_SHARK_PICTURE } from '../loanShark/kingLoanShark'

// The bots' pictures at Kino Poker, by the names in shared/poker/config.js
// (POKER.bots[key].pictures, which says which bot gets which). Each is shown
// as a round background: `size` and `position` are its backgroundSize and
// backgroundPosition, framing the face.
export const BOT_PICTURES = {
  // The same picture as on the Loan Shark page.
  kingLoanShark: KING_LOAN_SHARK_PICTURE,
  // A wide photo: in close on the face and hat.
  bret: { src: bret, size: '220% auto', position: '57% 0%' },
  // Head and shoulders in a suit: a little in on the face.
  kaveriPokerFace: { src: kaveriPokerFace, size: '125% auto', position: '50% 30%' },
}
