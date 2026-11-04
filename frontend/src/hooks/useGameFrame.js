import { useLayoutEffect, useState } from 'react'

// A game screen that fills everything you can see of the window under the
// nav bar and never scrolls, on a phone too: its `top` and `height`, for a
// fixed layer. The nav bar stays on top, as it is, and the page behind
// can't scroll while it's showing. On a phone it's measured from the
// visual viewport (the part actually on screen), so it shrinks above the
// keyboard. Kino Poker's table uses it.
function measure(nav) {
  const viewport = window.visualViewport
  const navBottom = nav ? nav.getBoundingClientRect().bottom : 64
  const visibleTop = viewport?.offsetTop ?? 0
  const visibleBottom = visibleTop + (viewport?.height ?? window.innerHeight)
  const top = Math.round(Math.max(navBottom, visibleTop))
  return { top, height: Math.max(0, Math.round(visibleBottom - top)) }
}

export default function useGameFrame() {
  const [frame, setFrame] = useState(() => ({ top: 64, height: Math.max(0, window.innerHeight - 64) }))
  useLayoutEffect(() => {
    const nav = document.querySelector('nav')
    const update = () => {
      const next = measure(nav)
      setFrame((current) => (current.top === next.top && current.height === next.height ? current : next))
    }
    update()
    const observer = nav ? new ResizeObserver(update) : null
    observer?.observe(nav)
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      observer?.disconnect()
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      html.style.overflow = before
    }
  }, [])
  return frame
}
