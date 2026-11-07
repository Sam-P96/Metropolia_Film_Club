import { createContext, useContext } from 'react'
import { useReducedMotion } from 'motion/react'

// Whether cosmetics hold still: the device's "reduce motion" setting, or
// the developer tool's toggle that pretends it's on (its pages wrap the
// previews in CosmeticsStill.Provider value={true}). Still means the same
// colours and glow, with no movement and no particles.
export const CosmeticsStill = createContext(false)

export function useCosmeticsStill() {
  const reduce = useReducedMotion()
  const forced = useContext(CosmeticsStill)
  return Boolean(reduce) || forced
}
