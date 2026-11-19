// The Infinity Stone names' liquid, smoke and water (stoneNames.css:
// filter: url(#isn-...)), defined once for the whole site. Mounted in
// App.jsx; draws nothing. Each comes in a finer -sm version for small names.
//   isn-reality   the Reality Stone's letters, warped by the Aether
//   isn-smoke     the churning Aether behind them
//   isn-water     the Soul Stone's reflection, rippling
export default function StoneFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="isn-reality" x="-30%" y="-70%" width="160%" height="240%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025 0.07" numOctaves="2" seed="4" result="noise">
            <animate attributeName="baseFrequency" dur="7s" values="0.025 0.07;0.04 0.1;0.025 0.07" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="isn-reality-sm" x="-30%" y="-70%" width="160%" height="240%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.12" numOctaves="2" seed="4" result="noise">
            <animate attributeName="baseFrequency" dur="7s" values="0.05 0.12;0.07 0.16;0.05 0.12" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="isn-smoke" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="9" result="noise">
            <animate attributeName="baseFrequency" dur="9s" values="0.018;0.03;0.018" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="34" xChannelSelector="R" yChannelSelector="B" />
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id="isn-smoke-sm" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="9" result="noise">
            <animate attributeName="baseFrequency" dur="9s" values="0.04;0.06;0.04" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="B" />
        </filter>
        <filter id="isn-water" x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.22" numOctaves="1" seed="2" result="noise">
            <animate attributeName="baseFrequency" dur="5s" values="0.01 0.22;0.012 0.3;0.01 0.22" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="isn-water-sm" x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.4" numOctaves="1" seed="2" result="noise">
            <animate attributeName="baseFrequency" dur="5s" values="0.02 0.4;0.024 0.5;0.02 0.4" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
