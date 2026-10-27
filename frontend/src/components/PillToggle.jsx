import { useLayoutEffect, useRef } from 'react'

// A small dark glass pill of options with one picked, like
// "Recent | Top | Controversial". `options` is [{ value, label }].
//
// The gold highlight slides and stretches to the picked option, like the
// Off | On switches in Edit profile. The options aren't the same width, so
// it's measured from the picked button, and again whenever the pill resizes
// (a font loading, say).
function PillToggle({ options, value, onChange, label }) {
  const pill = useRef(null)
  const highlight = useRef(null)
  const buttons = useRef({})
  const placed = useRef(false)

  useLayoutEffect(() => {
    const place = () => {
      const picked = buttons.current[value]
      const el = highlight.current
      if (!el) return

      el.style.opacity = picked ? '' : '0'
      if (!picked) return

      // The first time, jump straight there instead of growing in from the left.
      if (!placed.current) el.style.transition = 'none'

      el.style.width = `${picked.offsetWidth}px`
      el.style.transform = `translateX(${picked.offsetLeft}px)`

      if (!placed.current) {
        el.getBoundingClientRect() // apply it before the transition comes back
        el.style.transition = ''
        placed.current = true
      }
    }

    place()

    const observer = new ResizeObserver(place)
    observer.observe(pill.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <div
      ref={pill}
      role="group"
      aria-label={label}
      className="relative flex rounded-full border border-white/15 bg-ink/60 p-0.5 backdrop-blur-md"
    >
      <span
        ref={highlight}
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0 rounded-full bg-brand-gold transition-[transform,width] duration-300 ease-out motion-reduce:transition-none"
      />

      {options.map((option) => {
        const active = value === option.value

        return (
          <button
            key={option.value}
            ref={(el) => {
              buttons.current[option.value] = el
            }}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
              active ? 'text-ink' : 'text-white/60 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default PillToggle
