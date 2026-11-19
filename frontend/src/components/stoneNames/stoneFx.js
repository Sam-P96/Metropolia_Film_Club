// What moves in an Infinity Stone name (StoneName.jsx) beyond its CSS
// (stoneNames.css): the particles, the Power Stone's lightning, and each
// stone's moment every few seconds (the Space Stone's teleport, Reality's
// rewrite, Power's blast, Time's loop). Ported from the prototype
// (shared/prototype/Infinity Stone Username Effects.html).
//
// startStoneFx(host, stone) starts it on a name that's on the page and
// returns the function that stops it and clears up. Nothing runs while the
// name is off screen or the tab is hidden, so a page full of names costs
// nothing it can't see.

const SVG = 'http://www.w3.org/2000/svg'
const MOMENTS = ['isn-warp', 'isn-shift', 'isn-blast', 'isn-rewind']

const rand = (low, high) => low + Math.random() * (high - low)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

// Which names are on screen (a little past the edges), for every name at
// once: one observer.
const onScreen = new WeakMap()
let observer = null
function watch(host) {
  if (typeof IntersectionObserver === 'undefined') return () => {}
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) onScreen.set(entry.target, entry.isIntersecting)
    },
    { rootMargin: '80px' }
  )
  observer.observe(host)
  return () => {
    observer.unobserve(host)
    onScreen.delete(host)
  }
}

// The name's size now: its box and its font size, in px.
function sizeOf(host) {
  return { w: host.offsetWidth, h: host.offsetHeight, fs: parseFloat(getComputedStyle(host).fontSize) || 16 }
}

// Timers that only do anything while the name can be seen, all stopped at
// once by stop().
function timers(host) {
  const pending = new Set()
  const later = (ms, work) => {
    const id = setTimeout(() => {
      pending.delete(id)
      work()
    }, ms)
    pending.add(id)
  }
  // `work` every `ms` (plus up to `jitter`), starting at a random point in
  // the first wait so names side by side don't move in step.
  const every = (ms, work, jitter = 0) => {
    const tick = () => {
      if (!host.isConnected) return
      if (onScreen.get(host) !== false && !document.hidden) work()
      later(ms + Math.random() * jitter, tick)
    }
    later(Math.random() * ms, tick)
  }
  const stop = () => {
    for (const id of pending) clearTimeout(id)
    pending.clear()
  }
  return { later, every, stop }
}

// One of a stone's moments: `name` on the name for `ms`, from the start
// again if it was already on.
function moment(host, run, name, ms) {
  host.classList.remove(name)
  void host.offsetWidth
  host.classList.add(name)
  run.later(ms, () => host.classList.remove(name))
}

// A particle in `layer`, from (x0, y0) to (x1, y1) (px from the middle of
// the name), fading in and out.
function particle(layer, o) {
  const dot = document.createElement('span')
  dot.className = 'isn-p'
  const s = o.size
  dot.style.cssText = `width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;background:${o.color};box-shadow:0 0 ${o.glow}px ${o.color}${o.blur ? `;filter:blur(${o.blur}px)` : ''}`
  layer.appendChild(dot)
  const flight = dot.animate(
    [
      { transform: `translate(${o.x0}px,${o.y0}px) scale(${o.s0 ?? 1})`, opacity: 0 },
      { opacity: o.peak ?? 1, offset: 0.2, ...(o.mid ?? {}) },
      { transform: `translate(${o.x1}px,${o.y1}px) scale(${o.s1 ?? 1})`, opacity: 0 },
    ],
    { duration: o.dur, easing: o.easing ?? 'ease-out' }
  )
  flight.onfinish = () => dot.remove()
}

// One per stone: (host, layer, run) -> starts its particles and moments.
const STONES = {
  space(host, layer, run) {
    // Stardust pulled into the portal.
    run.every(
      120,
      () => {
        const { w, h, fs } = sizeOf(host)
        const a = rand(0, Math.PI * 2)
        const rx = w / 2 + fs * rand(0.4, 1.1)
        const ry = h * rand(0.8, 1.3)
        particle(layer, {
          x0: Math.cos(a) * rx,
          y0: Math.sin(a) * ry,
          x1: Math.cos(a) * fs * 0.15,
          y1: Math.sin(a) * fs * 0.1,
          s1: 0.2,
          size: Math.max(1.5, fs * rand(0.04, 0.08)),
          color: pick(['#e0f2fe', '#93c5fd', '#60a5fa', '#ffffff']),
          glow: fs * 0.15,
          dur: rand(1100, 1800),
          easing: 'cubic-bezier(.55,0,.9,.55)',
        })
      },
      60
    )
    // The teleport: gone into a sliver of light, and back.
    run.every(
      6500,
      () => {
        moment(host, run, 'isn-warp', 950)
        const flash = () => {
          const { w, h, fs } = sizeOf(host)
          for (let i = 0; i < 16; i++) {
            const x = rand(-0.5, 0.5) * w * 0.9
            particle(layer, {
              x0: x,
              y0: 0,
              x1: x * 1.5,
              y1: rand(-1, 1) * h * 0.9,
              size: Math.max(1.5, fs * rand(0.04, 0.09)),
              color: pick(['#ffffff', '#bae6fd', '#3b82f6']),
              glow: fs * 0.25,
              dur: rand(450, 750),
            })
          }
        }
        run.later(220, flash)
        run.later(740, flash)
      },
      2500
    )
  },

  mind(host, layer, run) {
    // Thought-sparks drifting up off the letters.
    run.every(
      420,
      () => {
        const { w, h, fs } = sizeOf(host)
        const x = rand(-0.5, 0.5) * w
        particle(layer, {
          x0: x,
          y0: -h * 0.1,
          x1: x + rand(-0.2, 0.2) * fs,
          y1: -h * rand(0.7, 1.1),
          size: Math.max(1.5, fs * rand(0.04, 0.07)),
          color: pick(['#fde68a', '#fef3c7', '#facc15']),
          glow: fs * 0.2,
          dur: rand(1200, 1800),
          peak: 0.8,
        })
      },
      200
    )
  },

  reality(host, layer, run) {
    // Drops of Aether bleeding off and dissolving.
    run.every(
      230,
      () => {
        const { w, h, fs } = sizeOf(host)
        const x = rand(-0.5, 0.5) * w * 0.95
        const y = rand(-0.3, 0.3) * h
        particle(layer, {
          x0: x,
          y0: y,
          x1: x + Math.sign(x || 1) * fs * rand(0.1, 0.5),
          y1: y + rand(-0.2, 0.7) * fs,
          s0: 0.6,
          s1: 2.4,
          size: Math.max(2, fs * rand(0.07, 0.16)),
          color: pick(['#7f1d1d', '#dc2626', '#450a0a', '#ef4444', '#991b1b']),
          glow: fs * 0.2,
          blur: fs * 0.02,
          dur: rand(900, 1500),
          peak: 0.9,
        })
      },
      150
    )
    // Reality rewrites the name for a moment.
    run.every(5200, () => moment(host, run, 'isn-shift', 500), 2500)
  },

  power(host, layer, run) {
    const svg = host.querySelector('.isn-bolts')
    const bolt = () => {
      if (!svg) return
      const box = svg.getBoundingClientRect()
      const w = box.width
      const h = box.height
      if (!w) return
      const { fs } = sizeOf(host)
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      const x0 = rand(0, w)
      const y0 = rand(h * 0.15, h * 0.85)
      const length = w * rand(0.1, 0.32)
      const angle = rand(-0.6, 0.6) + (Math.random() < 0.5 ? 0 : Math.PI)
      const x1 = Math.min(w, Math.max(0, x0 + Math.cos(angle) * length))
      const y1 = Math.min(h, Math.max(0, y0 + Math.sin(angle) * length * 0.6))
      const points = []
      for (let i = 0; i <= 7; i++) {
        const t = i / 7
        let px = x0 + (x1 - x0) * t
        let py = y0 + (y1 - y0) * t
        if (i > 0 && i < 7) {
          px += rand(-0.12, 0.12) * fs
          py += rand(-0.2, 0.2) * fs
        }
        points.push(`${px.toFixed(1)},${py.toFixed(1)}`)
      }
      const group = document.createElementNS(SVG, 'g')
      for (const [stroke, width, opacity] of [
        ['#a855f7', (fs * 0.11).toFixed(2), '.55'],
        ['#faf5ff', Math.max(0.8, fs * 0.03).toFixed(2), '1'],
      ]) {
        const line = document.createElementNS(SVG, 'polyline')
        line.setAttribute('points', points.join(' '))
        line.setAttribute('fill', 'none')
        line.setAttribute('stroke', stroke)
        line.setAttribute('stroke-width', width)
        line.setAttribute('stroke-linejoin', 'round')
        line.setAttribute('opacity', opacity)
        group.appendChild(line)
      }
      svg.appendChild(group)
      group.animate([{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }, { opacity: 0 }], { duration: rand(140, 260) }).onfinish = () => group.remove()
    }
    // Lightning cracking across the letters.
    run.every(
      220,
      () => {
        bolt()
        if (Math.random() < 0.3) bolt()
      },
      380
    )
    // The Orb's blast: a shockwave, sparks and a burst of lightning.
    run.every(
      4600,
      () => {
        moment(host, run, 'isn-blast', 550)
        const shock = document.createElement('span')
        shock.className = 'isn-shock'
        layer.appendChild(shock)
        shock.animate(
          [
            { transform: 'translate(-50%,-50%) scale(.25)', opacity: 1 },
            { transform: 'translate(-50%,-50%) scale(1.7,2)', opacity: 0 },
          ],
          { duration: 750, easing: 'cubic-bezier(.1,.7,.3,1)' }
        ).onfinish = () => shock.remove()
        const { w, h, fs } = sizeOf(host)
        for (let i = 0; i < 18; i++) {
          const a = rand(0, Math.PI * 2)
          particle(layer, {
            x0: Math.cos(a) * w * 0.15,
            y0: Math.sin(a) * h * 0.15,
            x1: Math.cos(a) * (w * 0.6 + fs * 0.4),
            y1: Math.sin(a) * h * 1.1,
            size: Math.max(1.5, fs * rand(0.04, 0.08)),
            color: pick(['#faf5ff', '#d8b4fe', '#a855f7']),
            glow: fs * 0.25,
            dur: rand(450, 750),
          })
        }
        for (let i = 0; i < 3; i++) run.later(i * 60, bolt)
      },
      1600
    )
  },

  time(host, layer, run) {
    // Motes of time drifting backwards, right to left.
    run.every(
      340,
      () => {
        const { w, h, fs } = sizeOf(host)
        const y = rand(-0.75, 0.75) * h
        particle(layer, {
          x0: w * 0.55,
          y0: y,
          x1: -w * 0.55,
          y1: y + rand(-0.15, 0.15) * fs,
          size: Math.max(1.5, fs * rand(0.035, 0.06)),
          color: pick(['#bbf7d0', '#4ade80', '#86efac']),
          glow: fs * 0.18,
          dur: rand(1800, 2600),
          easing: 'linear',
          peak: 0.7,
        })
      },
      200
    )
    // The loop: afterimages rewind, and the name stutters back.
    run.every(5600, () => moment(host, run, 'isn-rewind', 1050), 2000)
  },

  soul(host, layer, run) {
    // Embers rising.
    run.every(
      240,
      () => {
        const { w, h, fs } = sizeOf(host)
        const x = rand(-0.5, 0.5) * w
        particle(layer, {
          x0: x,
          y0: h * 0.35,
          x1: x + rand(-0.35, 0.35) * fs,
          y1: -h * rand(0.8, 1.4),
          s1: 0.4,
          size: Math.max(1.5, fs * rand(0.04, 0.09)),
          color: pick(['#fed7aa', '#fdba74', '#fb923c', '#f97316']),
          glow: fs * 0.22,
          dur: rand(1600, 2600),
          easing: 'cubic-bezier(.3,.6,.5,1)',
          peak: 0.85,
          mid: { transform: `translate(${x + rand(-0.25, 0.25) * fs}px,${-h * 0.1}px)` },
        })
      },
      160
    )
  },
}

// Starts `stone`'s particles and moments on `host` (a StoneName). Returns
// the function that stops them and clears away whatever's still flying.
export function startStoneFx(host, stone) {
  const layer = host?.querySelector('.isn-fx')
  if (!layer || !STONES[stone] || typeof layer.animate !== 'function') return () => {}

  const run = timers(host)
  const unwatch = watch(host)
  STONES[stone](host, layer, run)

  return () => {
    run.stop()
    unwatch()
    layer.replaceChildren()
    host.querySelector('.isn-bolts')?.replaceChildren()
    host.classList.remove(...MOMENTS)
  }
}
