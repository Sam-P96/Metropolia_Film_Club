import { useLayoutEffect, useState } from 'react'

// A darker background for a page: a black layer at 30% over the site's
// own, fixed behind the page like the games' backdrops
// (components/GameBackdrop.jsx) and running on past the bottom on a
// phone. It starts at the nav bar's bottom edge (measured, never touched),
// so the see-through nav bar looks just as it does on every other page.
// The Resonance comparison pages (pages/ResonanceCompare.jsx) and
// /SECRETresonance (pages/SecretResonance.jsx) sit on it.
export default function DarkerBackdrop() {
  const [top, setTop] = useState(0)

  useLayoutEffect(() => {
    const nav = document.querySelector('nav')
    if (!nav) return undefined
    const measure = () => setTop(Math.round(nav.getBoundingClientRect().height))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 bg-black/30 max-lg:-bottom-[10%]"
      style={{ top }}
    />
  )
}
