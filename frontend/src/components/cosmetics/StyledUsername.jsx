import { useEffect, useRef } from 'react'
import { cosmeticById, lookOf } from '../../../../shared/cosmetics/catalogue.js'
import { attachParticles } from './particleEngine'
import { useCosmeticsStill } from './stillCosmetics'

const colourVars = (colors) => Object.fromEntries(colors.map((color, i) => [`--c${i + 1}`, color]))

// A member's name with their name style (`styleId`, a name item from
// shared/cosmetics/catalogue.js), or as it always was for none or Default.
// It keeps the font, size and weight of wherever it sits, never takes more
// room than the plain name, and wraps like it at any length. Particles, if
// the style has them, go on a canvas over it (particleEngine.js).
export default function StyledUsername({ name, styleId }) {
  const item = cosmeticById(styleId)
  const look = item?.type === 'name' ? lookOf(item) : null
  const still = useCosmeticsStill()
  const wrap = useRef(null)
  const letters = useRef(null)
  const canvas = useRef(null)
  const particles = look?.particles && !still ? look.particles : null
  const colours = item?.particleColors.join(',') ?? ''

  useEffect(() => {
    if (!particles) return undefined
    return attachParticles({
      host: wrap.current,
      canvas: canvas.current,
      nameEl: letters.current,
      type: particles,
      colors: colours.split(','),
    })
  }, [particles, colours, name])

  if (!look) return name

  return (
    <span ref={wrap} className={`cos-name-wrap${still ? ' cos-still' : ''}`} data-behind={look.behind ? '' : undefined}>
      <span ref={letters} className={`cos-name ${look.cls}`} data-text={name} style={colourVars(item.colors)}>
        {look.perChar
          ? [...name].map((letter, i) => (
              <span key={i} className="cos-ch" style={{ '--i': i }}>
                {letter}
              </span>
            ))
          : name}
      </span>
      {particles && <canvas ref={canvas} className="cos-fx" aria-hidden="true" />}
    </span>
  )
}
