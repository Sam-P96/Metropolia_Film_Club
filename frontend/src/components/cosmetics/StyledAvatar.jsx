import { useEffect, useLayoutEffect, useRef } from 'react'
import MemberAvatar from '../profile/MemberAvatar'
import { cosmeticById, lookOf } from '../../../../shared/cosmetics/catalogue.js'
import { attachParticles } from './particleEngine'
import { useCosmeticsStill } from './stillCosmetics'

const colourVars = (colors) => Object.fromEntries(colors.map((color, i) => [`--c${i + 1}`, color]))

// A profile picture with its border (`borderId`, a border item from
// shared/cosmetics/catalogue.js). The picture is `children` (any avatar,
// like the review card's) or a MemberAvatar of `user` at `size`. The ring
// and glow sit just outside it and scale with whatever size it is, so it
// takes no more room than the plain picture. A border takes the place of
// the gold, silver and bronze rank rings; with none (or Default), the
// picture shows as it always did, rank ring and all.
export default function StyledAvatar({ borderId, user, size = 'md', rank = null, children }) {
  const item = cosmeticById(borderId)
  const look = item?.type === 'border' ? lookOf(item) : null
  const still = useCosmeticsStill()
  const host = useRef(null)
  const canvas = useRef(null)
  const particles = look?.particles && !still ? look.particles : null
  const colours = item?.particleColors.join(',') ?? ''

  // The ring's sizes all come from the picture's: measured, and again
  // whenever it changes (responsive sizes).
  useLayoutEffect(() => {
    const el = host.current
    if (!look || !el) return undefined
    const picture = el.querySelector('.cos-av-pic')
    const measure = () => el.style.setProperty('--av', `${picture.offsetWidth}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(picture)
    return () => observer.disconnect()
  }, [look])

  useEffect(() => {
    if (!particles) return undefined
    return attachParticles({ host: host.current, canvas: canvas.current, type: particles, circle: true, colors: colours.split(',') })
  }, [particles, colours])

  if (!look) return children ?? <MemberAvatar user={user} size={size} rank={rank} />

  return (
    <span ref={host} className={`cos-av ${look.cls}${still ? ' cos-still' : ''}`} style={colourVars(item.colors)}>
      <span className="cos-glow" aria-hidden="true">
        <span className="cos-ring" />
      </span>
      <span className="cos-ring cos-r2" aria-hidden="true" />
      <span className="cos-ring cos-r3" aria-hidden="true" />
      <span className="cos-ring cos-ring-main" aria-hidden="true" />
      <span className="cos-av-pic">{children ?? <MemberAvatar user={user} size={size} />}</span>
      {particles && <canvas ref={canvas} className="cos-fx" aria-hidden="true" />}
    </span>
  )
}
