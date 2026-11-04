import '@fontsource/bebas-neue'

// Steal and Defend's logo: a sword, "VS", a shield, each on an ivory tile
// like the Games page's other cards. `size`: "sm" for the card, "lg" for
// the intro page.
const SIZES = {
  sm: { tile: 'size-10 rounded-lg', art: 30, text: 'text-2xl' },
  lg: { tile: 'size-16 rounded-xl shadow-lg shadow-black/40', art: 48, text: 'text-4xl' },
}

export function SwordArt({ size = 30 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <g transform="rotate(45 12 12)">
        <path d="M12 1.2 L14 3.8 V14.6 H10 V3.8 Z" fill="#C9D1DB" stroke="#2A160F" strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M12 2.6 V14.2" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.8" />
        <rect x="6.6" y="14.6" width="10.8" height="2" rx="1" fill="#FABC3F" stroke="#2A160F" strokeWidth="0.8" />
        <rect x="11" y="16.6" width="2" height="4.4" fill="#821131" stroke="#2A160F" strokeWidth="0.6" />
        <circle cx="12" cy="21.9" r="1.3" fill="#FABC3F" stroke="#2A160F" strokeWidth="0.6" />
      </g>
    </svg>
  )
}

export function ShieldArt({ size = 30 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 1.8 L20.2 4.8 V11 C20.2 16.6 16.6 20.6 12 22.2 C7.4 20.6 3.8 16.6 3.8 11 V4.8 Z"
        fill="#C7253E"
        stroke="#2A160F"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M12 3.9 L18.2 6.2 V11 C18.2 15.4 15.6 18.6 12 20 Z" fill="#821131" />
      <path d="M12 6.6 L13.3 9.8 H16.6 L13.9 11.8 L15 15.1 L12 13.1 L9 15.1 L10.1 11.8 L7.4 9.8 H10.7 Z" fill="#FABC3F" stroke="#2A160F" strokeWidth="0.5" />
    </svg>
  )
}

export default function StealLogo({ size = 'sm' }) {
  const look = SIZES[size] ?? SIZES.sm
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <span className={`grid place-items-center bg-dice-ivory ${look.tile}`}>
        <SwordArt size={look.art} />
      </span>
      <span className={`font-['Bebas_Neue'] leading-none tracking-wide text-brand-gold ${look.text}`}>VS</span>
      <span className={`grid place-items-center bg-dice-ivory ${look.tile}`}>
        <ShieldArt size={look.art} />
      </span>
    </div>
  )
}
