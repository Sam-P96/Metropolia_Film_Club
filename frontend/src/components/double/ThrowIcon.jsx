// The three throws as line icons. Scissors and paper are Lucide's
// "scissors" and "file" (lucide.dev, ISC licence: free to use, no
// attribution required on the page); the rock is drawn to match.
const PATHS = {
  rock: (
    <>
      <path d="M4.5 16 7 8.5 12 5.5l5.5 2.5 2.5 7-3.5 4h-9Z" />
      <path d="m10 9 1.5 3-2 2.5" />
    </>
  ),
  paper: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="3" />
      <path d="M8.12 8.12 12 12" />
      <path d="M20 4 8.12 15.88" />
      <circle cx="6" cy="18" r="3" />
      <path d="M14.8 14.8 20 20" />
    </>
  ),
}

export default function ThrowIcon({ hand, size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[hand]}
    </svg>
  )
}
