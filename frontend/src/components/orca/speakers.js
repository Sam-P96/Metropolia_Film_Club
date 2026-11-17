import lordGangOrca from '../../assets/lord-gang-orca.png'
import dolphineGoon from '../../assets/dolphine-goon.png'
import kaveri from '../../assets/SECRETpfp/kaveri_poker_face.webp'
import { KING_LOAN_SHARK_PICTURE } from '../loanShark/kingLoanShark'

// The pictures of everyone who speaks on Lord Gang Orca's page and at his
// poker seat, by the speaker keys in backend/data/lordGangOrcaScripts.js.
// lord-gang-orca.png and dolphine-goon.png are placeholders: swap the files
// in src/assets for the real pictures. Kaveri's is the one from Kino Poker.
// `position` frames the face in a circle (CSS backgroundPosition /
// objectPosition).
export const SPEAKERS = {
  orca: { src: lordGangOrca, position: 'center 40%' },
  dolphine: { src: dolphineGoon, position: 'center 40%' },
  kaveri: { src: kaveri, position: '50% 30%' },
  shark: { src: KING_LOAN_SHARK_PICTURE.src, position: KING_LOAN_SHARK_PICTURE.position },
}

// For Kino Poker's seats (components/poker/botPictures.js).
export const LORD_GANG_ORCA_PICTURE = { src: lordGangOrca, size: 'cover', position: 'center 40%' }
