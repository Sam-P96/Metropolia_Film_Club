import onsenShark from '../../assets/Onsen_Shark.webp'

// King Loan Shark's profile picture: assets/Onsen_Shark.webp, framed on the
// shark's head (the picture is a wide scene, so a plain centre crop would
// mostly be splash). Used as a round background: `size` and `position` are
// its backgroundSize and backgroundPosition. Steal and Defend's Critical
// Hit message (KingLoanShark.jsx) and his seat at Kino Poker both use it,
// so changing the framing here changes it everywhere.
export const LOAN_SHARK_PICTURE = { src: onsenShark, size: '120% auto', position: '68% 35%' }
