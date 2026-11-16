import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShockwaveLayer } from '../gomoku/shockwave'
import { CARD, HEADING, BallIcon } from './PoolChrome'
import { getPoolLook, setPoolShockwave } from '../../services/pool'
import { gomokuItem } from '../../../../shared/gomoku/catalogue.js'

const chip = (on) =>
  `inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-colors disabled:cursor-default disabled:opacity-50 ${
    on ? 'border-[#ff4d8d] bg-[#ff4d8d]/20 font-bold text-white' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
  }`

// A shockwave's colours, in a small dot.
function Swatch({ ring }) {
  return <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-white/30" style={{ background: `conic-gradient(${[...ring, ring[0]].join(', ')})` }} />
}

// Picking the shockwave that goes off where your cue ball first hits a
// ball (8 Ball Pool's lobby): None, or any Infinite Gomoku shockwave you
// own. Only its ring plays on the table, never its particles. Picking one
// plays it on the preview, a cue ball meeting a ball.
export default function ShockwavePicker() {
  const [look, setLook] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef(null)
  const layerRef = useRef(null)
  const previewRef = useRef(null)

  useEffect(() => {
    let stopped = false
    getPoolLook()
      .then((answer) => !stopped && setLook(answer))
      .catch((loadError) => !stopped && setError(loadError.message))
    return () => {
      stopped = true
    }
  }, [])

  useEffect(() => {
    const layer = new ShockwaveLayer(canvasRef.current)
    layerRef.current = layer
    return () => layer.stop()
  }, [])

  const preview = (id) => {
    const item = gomokuItem(id)
    const box = previewRef.current?.getBoundingClientRect()
    if (!item || !box || !layerRef.current) return
    layerRef.current.play({ x: box.width / 2, y: box.height / 2, cell: 40, look: item.look, ringOnly: true })
  }

  const pick = async (id) => {
    if (busy || id === look.shockwave) {
      if (id) preview(id)
      return
    }
    setBusy(true)
    setError('')
    try {
      setLook(await setPoolShockwave(id))
      if (id) preview(id)
    } catch (pickError) {
      setError(pickError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="pool-wave" className={`${CARD} flex flex-col items-center gap-4`}>
      <div>
        <h2 id="pool-wave" className={HEADING}>
          Your shockwave
        </h2>
        <p className="mt-1 text-sm text-white/60">
          It goes off where your cue ball first hits a ball, for you and everyone watching. Any shockwave you own from the{' '}
          <Link to="/games/gomoku/shop" className="text-[#ff9ec7] underline underline-offset-4 hover:text-white">
            Infinite Gomoku shop
          </Link>
          , its ring only.
        </p>
      </div>

      <div ref={previewRef} className="relative flex h-24 w-full max-w-xs items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(circle,#1f8a5b,#0a4a30)]">
        <span className="flex items-center gap-1">
          <BallIcon id={0} size={26} />
          <BallIcon id={11} size={26} />
        </span>
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      </div>

      {look ? (
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Your shockwave">
          <button type="button" aria-pressed={look.shockwave === null} disabled={busy} onClick={() => pick(null)} className={chip(look.shockwave === null)}>
            None
          </button>
          {look.owned.map((id) => {
            const item = gomokuItem(id)
            if (!item) return null
            return (
              <button key={id} type="button" aria-pressed={look.shockwave === id} disabled={busy} onClick={() => pick(id)} className={chip(look.shockwave === id)}>
                <Swatch ring={item.look.ring} />
                {item.name}
              </button>
            )
          })}
        </div>
      ) : (
        !error && <p className="text-sm text-white/50">Loading your shockwaves…</p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  )
}
