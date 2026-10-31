import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'

const format = (value) => Math.round(value).toLocaleString('en-US')

// A number that counts up or down to its new value instead of jumping, for
// balances and the jackpot. Counting isn't movement on screen, so it counts
// with reduced motion too.
export default function AnimatedNumber({ value, className }) {
  const shown = useMotionValue(value)
  const text = useTransform(shown, format)

  useEffect(() => {
    const controls = animate(shown, value, { duration: 0.7, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [shown, value])

  return <motion.span className={`tabular-nums ${className ?? ''}`}>{text}</motion.span>
}
