import bret from '../../assets/Bret.png'
import kaveriBaseForm from '../../assets/SECRETpfp/kaveri_base_form.png'
import kaveriEyes1 from '../../assets/SECRETpfp/kaveri_eyes_1.png'
import kaveriEyes2 from '../../assets/SECRETpfp/kaveri_eyes_2.png'
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
  // Close-ups already: just fill the circle.
  kaveriEyes1: { src: kaveriEyes1, size: 'cover', position: 'center' },
  kaveriEyes2: { src: kaveriEyes2, size: 'cover', position: 'center' },
  // The whole bunny: in on the head.
  kaveriBaseForm: { src: kaveriBaseForm, size: '250% auto', position: '55% 46%' },
}
