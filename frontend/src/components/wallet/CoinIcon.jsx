// The two coins: green for PP, gold for P-PP. A P on the PP coin, a star
// on the P-PP one, so they're told apart without relying on colour alone.
const COINS = {
  pp: { name: 'PP', rim: '#1F7A4A', face: '#3BB273', shine: '#8CE3B0' },
  ppp: { name: 'P-PP', rim: '#B9821A', face: '#FABC3F', shine: '#FFE7A3' },
}

const STAR = '12,6.6 13.6,10.2 17.4,10.4 14.4,12.8 15.4,16.6 12,14.5 8.6,16.6 9.6,12.8 6.6,10.4 10.4,10.2'

export default function CoinIcon({ kind = 'pp', size = 18, title }) {
  const coin = COINS[kind]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title ?? coin.name}
      className="shrink-0 drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]"
    >
      <circle cx="12" cy="12" r="11" fill={coin.rim} />
      <circle cx="12" cy="12" r="9" fill={coin.face} />
      <circle cx="12" cy="12" r="7.3" fill="none" stroke={coin.shine} strokeWidth="0.8" opacity="0.8" />
      {kind === 'ppp' ? (
        <polygon points={STAR} fill={coin.rim} />
      ) : (
        <text x="12" y="16.2" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="system-ui, sans-serif" fill={coin.rim}>
          P
        </text>
      )}
    </svg>
  )
}