import { AnimatePresence, motion } from 'motion/react'
import AnimatedNumber from '../AnimatedNumber'

// A stack of poker chips that grows and shrinks with `amount`: more chips
// for more points (on a gentle curve, so a big stack doesn't tower), each
// slotting on or popping off, with the number beside or under it.
const COLOURS = ['#C7253E', '#FABC3F', '#2563EB', '#16A34A', '#1A1024', '#E85C0D']

function chipCount(amount) {
  if (!amount || amount <= 0) return 0
  return Math.max(1, Math.min(12, Math.ceil(Math.log2(amount + 1) * 1.4)))
}

function Chip({ index, size }) {
  const colour = COLOURS[index % COLOURS.length]
  return (
    <motion.span
      initial={{ opacity: 0, y: -size * 0.8, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -size * 0.6, scale: 0.8 }}
      transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1], delay: index * 0.02 }}
      className="absolute left-0 rounded-full"
      style={{
        width: size,
        height: size * 0.36,
        bottom: index * size * 0.16,
        background: `radial-gradient(ellipse at 50% 40%, ${colour} 55%, rgba(0,0,0,0.35) 100%)`,
        border: '1px solid rgba(255,255,255,0.55)',
        boxShadow: '0 2px 3px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.18)',
      }}
    />
  )
}

export default function ChipStack({ amount, size = 22, label = true, labelSide = 'bottom', className = '' }) {
  const count = chipCount(amount)
  const height = size * 0.36 + Math.max(0, count - 1) * size * 0.16
  return (
    <div className={`flex items-center gap-1 ${labelSide === 'bottom' ? 'flex-col' : 'flex-row'} ${className}`}>
      <div className="relative" style={{ width: size, height: Math.max(height, size * 0.36) }} aria-hidden="true">
        <AnimatePresence initial={false}>
          {Array.from({ length: count }, (_, i) => (
            <Chip key={i} index={i} size={size} />
          ))}
        </AnimatePresence>
      </div>
      {label && amount > 0 && (
        <span className="rounded-full bg-black/60 px-1.5 text-[11px] leading-4 font-bold text-brand-gold tabular-nums">
          <AnimatedNumber value={amount} />
        </span>
      )}
    </div>
  )
}
