import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'

// Whole numbers, or with `digits`, up to that many decimals (12, 12.5).
const format = (value, digits) =>
  digits ? Number(value.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits }) : Math.round(value).toLocaleString('en-US')

// A number that counts up or down to its new value instead of jumping, for
// balances and the jackpot. Counting isn't movement on screen, so it counts
// with reduced motion too. `fractionDigits`: decimals to show, for the
// Slot Machine's credits, which can have cents.
export default function AnimatedNumber({ value, className, fractionDigits = 0 }) {
  const shown = useMotionValue(value)
  const text = useTransform(shown, (current) => format(current, fractionDigits))

  useEffect(() => {
    const controls = animate(shown, value, { duration: 0.7, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [shown, value])

  return <motion.span className={`tabular-nums ${className ?? ''}`}>{text}</motion.span>
}
