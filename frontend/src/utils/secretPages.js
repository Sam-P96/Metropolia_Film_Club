// The SECRET pages (routes in App.jsx, linked from nowhere), listed on
// /SECRET and in the admin panel (/admin) for admins. Add a new one here
// when it's made.
//   adminOnly  the server only answers admins (or, `who` says, moderators too)
export const SECRET_PAGES = [
  {
    path: '/SECRETloanshark',
    name: 'Loan Shark lists',
    about: "Who King Loan Shark's jobs can pick: the Persuasion, Review Persuasion, Protected and Target Lists.",
    adminOnly: true,
    who: 'Admins',
  },
  {
    path: '/SECRETresonance',
    name: 'Resonance, every pair',
    about: 'Every pair of members, worked out live with all five factors, whatever their settings.',
    adminOnly: true,
    who: 'Moderators and admins',
  },
  {
    path: '/SECRETpfp',
    name: 'Secret profile pictures',
    about: 'Every picture in assets/SECRETpfp, to make your profile picture or banner.',
    adminOnly: false,
    who: 'Any member',
  },
]

// Whether `user` (a profile from the server) gets /SECRET: any admin,
// whatever their username.
export function isSecretKeeper(user) {
  return user?.role === 'admin'
}
