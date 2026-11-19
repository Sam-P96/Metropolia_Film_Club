import { useEffect, useRef } from 'react'
import { cosmeticById, lookOf } from '../../../../shared/cosmetics/catalogue.js'
import FirstPlaceName from '../firstPlace/FirstPlaceName'
import { useNameEffect } from '../firstPlace/firstPlaceStore'
import StoneName from '../stoneNames/StoneName'
import { FIRST_PLACE_EFFECT } from '../../../../shared/stoneNames/config.js'
import { attachParticles } from './particleEngine'
import { useCosmeticsStill } from './stillCosmetics'

const colourVars = (colors) => Object.fromEntries(colors.map((color, i) => [`--c${i + 1}`, color]))

// A member's name with their name style (`styleId`, a name item from
// shared/cosmetics/catalogue.js), or as it always was for none or Default.
// It keeps the font, size and weight of wherever it sits, never takes more
// room than the plain name, and wraps like it at any length. Particles, if
// the style has them, go on a canvas over it (particleEngine.js).
//
// With `userId` (leaderboards, the Resonance list, review cards and
// profiles), a member with a name effect gets that instead: the First
// Place effect while they hold a title with it on (components/firstPlace/),
// or an Infinity Stone's while they hold one (components/stoneNames/), the
// one they picked on their profile if they have more than one
// (shared/stoneNames/config.js). It only takes the name style's place,
// which comes back when they lose it. The shop's own previews leave userId
// out, so they always show the item.
export default function StyledUsername({ name, styleId, userId }) {
  const effects = useNameEffect(userId)
  const effect = effects?.effect ?? null
  const item = effect ? null : cosmeticById(styleId)
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

  if (effect === FIRST_PLACE_EFFECT) return <FirstPlaceName name={name} settings={effects.firstPlace.settings} titles={effects.firstPlace.titles} />
  if (effect) return <StoneName name={name} stone={effect} />
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
