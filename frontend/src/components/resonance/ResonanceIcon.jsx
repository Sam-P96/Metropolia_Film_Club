import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import resonanceIcon from '../../assets/Resonance-icon.webp'
import useSoulResonance from '../../hooks/useSoulResonance'
import { getCurrentUserId } from '../../utils/currentUser'

// Room kept between the bubble and the icon, and the edge of the screen.
const GAP = 10
const EDGE = 8

// The Resonance icon on its own, the height of the text around it.
export function ResonanceMark({ className = '' }) {
  return (
    <img
      src={resonanceIcon}
      alt=""
      aria-hidden="true"
      draggable="false"
      className={`inline-block h-[1em] w-auto shrink-0 align-[-0.125em] select-none ${className}`}
    />
  )
}

// The icon after a member's name when the logged-in member shares a Soul
// Resonance (80%+) with them. Hovering (or tapping, on a phone) shows
// "Soul Resonance: 97%" in a bubble; tapping anywhere closes it. Names are
// often links, so tapping the icon opens the bubble and never the link.
// Nothing for logged-out visitors, by their own name, or when either of
// them has the icon turned off (the server says so in the map).
//
// The bubble is drawn on the page itself, not inside the name, so a card
// or list that hides its overflow doesn't cut it off.
function ResonanceIcon({ userId, className = '' }) {
  const soul = useSoulResonance()[String(userId)]
  const percent = soul?.icon ? soul.percent : undefined
  const shown = percent !== undefined && String(userId) !== String(getCurrentUserId())

  const anchor = useRef(null)
  const bubble = useRef(null)
  const tail = useRef(null)
  const pointer = useRef('mouse')
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = shown && (hovered || pinned)

  // Above the icon, or below it near the top of the screen, and never off
  // either side.
  useLayoutEffect(() => {
    if (!open) return

    const place = () => {
      if (!anchor.current || !bubble.current) return
      const icon = anchor.current.getBoundingClientRect()
      const { offsetWidth: width, offsetHeight: height } = bubble.current
      const centre = icon.left + icon.width / 2
      const left = Math.min(Math.max(EDGE, centre - width / 2), window.innerWidth - width - EDGE)
      const below = icon.top - height - GAP < EDGE

      bubble.current.style.left = `${left}px`
      bubble.current.style.top = `${below ? icon.bottom + GAP : icon.top - height - GAP}px`
      tail.current.style.left = `${centre - left}px`
      tail.current.dataset.below = below
    }

    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  // Tapped open: the next tap anywhere else closes it (a tap on the icon
  // itself toggles it, below).
  useEffect(() => {
    if (!pinned) return

    const close = (event) => {
      if (!anchor.current?.contains(event.target)) setPinned(false)
    }

    document.addEventListener('pointerdown', close, true)
    return () => document.removeEventListener('pointerdown', close, true)
  }, [pinned])

  if (!shown) return null

  const label = `Soul Resonance: ${percent}%`

  return (
    <span
      ref={anchor}
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 cursor-help align-[-0.15em] ${className}`}
      onPointerDown={(event) => {
        pointer.current = event.pointerType
      }}
      onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setHovered(false)}
      onClick={(event) => {
        // Not the link (or row) the name is in.
        event.preventDefault()
        event.stopPropagation()
        if (pointer.current !== 'mouse') setPinned(!pinned)
      }}
    >
      <ResonanceMark className="resonance-breathe" />

      {open &&
        createPortal(
          <span
            ref={bubble}
            role="tooltip"
            className="pointer-events-none fixed top-0 left-0 z-100 rounded-lg border border-white/15 bg-ink px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-lg shadow-black/50"
          >
            Soul Resonance: <span className="text-brand-gold">{percent}%</span>
            <svg
              ref={tail}
              width="14"
              height="7"
              viewBox="0 0 14 7"
              aria-hidden="true"
              className="absolute top-full -mt-px -translate-x-1/2 text-ink data-[below=true]:top-auto data-[below=true]:bottom-full data-[below=true]:mt-0 data-[below=true]:-mb-px data-[below=true]:rotate-180"
            >
              <path d="M0 0 L7 7 L14 0" fill="currentColor" stroke="rgb(255 255 255 / 0.15)" />
            </svg>
          </span>,
          document.body
        )}
    </span>
  )
}

export default ResonanceIcon
