import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { EASE } from './motion'
import { LIFT, SCROLL } from './style'

// Steal and Defend's dropdown, in place of the browser's grey <select>: a
// dark glass button, and a list that slides down and fades in, in the
// game's colours, with a gold scrollbar if it's long. `options` are
// { value, label, hint? }.
//
// The list opens above the page (a portal at the end of <body>), so a glass
// box underneath can never cover it, and it follows the button if the page
// scrolls. Keyboard: Enter, Space or the arrows open it; the arrows, Home
// and End move; Enter picks; Escape or Tab closes.
export default function Dropdown({ label, value, options, onChange, placeholder = 'Pick one', disabled = false, empty = 'Nothing to pick' }) {
  const id = useId()
  const button = useRef(null)
  const list = useRef(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [place, setPlace] = useState(null)
  const selected = options.find((option) => option.value === value) ?? null

  const close = useCallback((focus = true) => {
    setOpen(false)
    if (focus) button.current?.focus()
  }, [])

  const show = () => {
    if (disabled) return
    setActive(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  const choose = (option) => {
    onChange(option.value)
    close()
  }

  // Under the button (or over it, near the bottom of the window), as wide as it.
  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const box = button.current?.getBoundingClientRect()
      if (!box) return
      const below = window.innerHeight - box.bottom
      const up = below < 260 && box.top > below
      setPlace({ left: box.left, width: box.width, ...(up ? { bottom: window.innerHeight - box.top + 6 } : { top: box.bottom + 6 }), up })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open])

  // A click anywhere else closes it.
  useEffect(() => {
    if (!open) return
    const away = (event) => {
      if (!button.current?.contains(event.target) && !list.current?.contains(event.target)) close(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open, close])

  // The highlighted option stays in sight in a long list.
  useEffect(() => {
    if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onKeyDown = (event) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        show()
      }
      return
    }
    const last = options.length - 1
    if (event.key === 'ArrowDown') setActive((index) => Math.min(last, index + 1))
    else if (event.key === 'ArrowUp') setActive((index) => Math.max(0, index - 1))
    else if (event.key === 'Home') setActive(0)
    else if (event.key === 'End') setActive(last)
    else if ((event.key === 'Enter' || event.key === ' ') && options[active]) choose(options[active])
    else if (event.key === 'Escape') close()
    else if (event.key === 'Tab') {
      setOpen(false)
      return
    } else return
    event.preventDefault()
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && options[active] ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={onKeyDown}
        className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border bg-ink/60 px-3 py-2 text-left ${LIFT} hover:border-brand-gold/50 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-brand-gold disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? 'border-brand-gold/70' : 'border-white/20'
        }`}
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate text-sm font-semibold text-white">{selected.label}</span>
              {selected.hint && <span className="block truncate text-[11px] text-white/50">{selected.hint}</span>}
            </>
          ) : (
            <span className="block truncate text-sm text-white/50">{placeholder}</span>
          )}
        </span>
        <motion.svg
          viewBox="0 0 20 20"
          width="16"
          height="16"
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="shrink-0 text-brand-gold"
        >
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && place && (
            <motion.ul
              ref={list}
              id={`${id}-list`}
              role="listbox"
              aria-label={label}
              initial={{ opacity: 0, y: place.up ? 6 : -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: EASE } }}
              exit={{ opacity: 0, y: place.up ? 4 : -4, scale: 0.98, transition: { duration: 0.12 } }}
              style={{ position: 'fixed', left: place.left, width: place.width, top: place.top, bottom: place.bottom, transformOrigin: place.up ? 'bottom' : 'top' }}
              className={`z-90 max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-ink/95 p-1 shadow-2xl shadow-black/60 backdrop-blur-xl ${SCROLL}`}
            >
              {options.length === 0 && <li className="px-3 py-2 text-sm text-white/50">{empty}</li>}
              {options.map((option, index) => {
                const isSelected = option.value === value
                return (
                  <li
                    key={option.value}
                    id={`${id}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onPointerEnter={() => setActive(index)}
                    onClick={() => choose(option)}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${index === active ? 'bg-white/10' : ''}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${isSelected ? 'font-semibold text-brand-gold' : 'text-white'}`}>{option.label}</span>
                      {option.hint && <span className="block truncate text-[11px] text-white/50">{option.hint}</span>}
                    </span>
                    {isSelected && (
                      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" className="shrink-0 text-brand-gold">
                        <path d="M4.5 10.5 8.5 14.5 15.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
