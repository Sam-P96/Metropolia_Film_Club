import { KING_LOAN_SHARK_PICTURE } from './kingLoanShark'

// King Loan Shark's picture, small, for the Loan Shark card on the Games
// page: the same one as on the Loan Shark page and at Kino Poker.
export default function SharkBadge() {
  return (
    <img
      src={KING_LOAN_SHARK_PICTURE.src}
      alt=""
      aria-hidden="true"
      style={{ objectPosition: KING_LOAN_SHARK_PICTURE.position }}
      className="size-14 self-start rounded-full border-2 border-brand-gold bg-plum object-cover shadow-[0_0_18px_rgb(250_188_63/0.3)]"
    />
  )
}
