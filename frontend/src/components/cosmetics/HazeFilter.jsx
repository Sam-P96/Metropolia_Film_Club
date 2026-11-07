// The heat haze cosmetic's shimmer (cosmetics.css: filter: url(#cos-haze)),
// defined once for the whole site. Mounted in App.jsx; draws nothing.
export default function HazeFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="cos-haze" x="-20%" y="-40%" width="140%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.09" numOctaves="2" seed="3" result="noise">
            <animate attributeName="baseFrequency" dur="3s" values="0.02 0.09;0.026 0.14;0.02 0.09" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
