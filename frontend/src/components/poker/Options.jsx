import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import PillToggle from '../PillToggle'
import PlayingCard from './cards'
import CardAura from './CardAura'
import { FX, isMuted, setMuted } from './feedback'
import { GLOW_COLOURS, glowRgb, loadGlow, saveGlow } from './glow'
import { GLASS } from './style'
import { setVfx, vfxOn } from './vfx'

const SECTION = `${GLASS} p-5 text-sm text-white/80`
const HEADING = "font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold"
const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

// The preview: a black ace and a red one, so "By suit" shows both colours.
const PREVIEW = ['As', 'Ah']
const CARD = 62

const SUIT_SWATCH = `linear-gradient(135deg, rgb(${glowRgb('suit', 'As')}) 50%, rgb(${glowRgb('suit', 'Ah')}) 50%)`
const RAINBOW = 'conic-gradient(#ff4d6d, #ffb703, #4ade80, #22d3ee, #4f8bff, #b46eff, #ff4d6d)'

function Swatch({ label, background, picked, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={picked}
      onClick={onClick}
      className={`relative grid size-10 cursor-pointer place-items-center rounded-full ring-offset-2 ring-offset-ink transition-[scale,box-shadow] duration-300 hover:scale-110 ${
        picked ? 'ring-2 ring-white' : 'ring-1 ring-white/25'
      }`}
      style={{ background }}
    >
      {children}
    </button>
  )
}

// Kino Poker's Options, on the intro page before Play: the colour of your
// best hand's glow (glow.js), with a preview, and the glow and the sound on
// or off (the same switches as VFX and 🔊 at the table). All remembered on
// this device.
export default function Options() {
  const [glow, setGlow] = useState(loadGlow)
  const [vfx, setVfxShown] = useState(vfxOn)
  const [sound, setSound] = useState(() => !isMuted())
  const custom = glow.startsWith('#') ? glow : null

  const pick = (choice, { quiet = false } = {}) => {
    saveGlow(choice)
    setGlow(choice)
    if (!quiet) FX.select(true)
  }
  const pickedName =
    glow === 'suit' ? 'By suit: black cards blue, red cards purple' : custom ? 'Your own colour' : (GLOW_COLOURS.find((colour) => colour.key === glow)?.name ?? 'Blue')

  return (
    <div className="flex flex-col gap-4">
      <section className={SECTION}>
        <h2 className={HEADING}>Your glow</h2>
        <p className="mt-1">At the table, the cards of your best hand glow, with a little lightning now and then. Pick its colour. Only you see it.</p>

        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="flex gap-5 p-3" aria-hidden="true">
            {PREVIEW.map((code) => (
              <div key={code} className="relative" style={{ width: CARD, height: CARD * 1.4 }}>
                <PlayingCard code={code} width={CARD} initial={false} style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                  <AnimatePresence>{vfx && <CardAura key="aura" colour={glowRgb(glow, code)} lit company={PREVIEW.length} />}</AnimatePresence>
                </PlayingCard>
              </div>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Glow colour">
              {GLOW_COLOURS.map((colour) => (
                <Swatch key={colour.key} label={colour.name} background={`rgb(${colour.rgb})`} picked={glow === colour.key} onClick={() => pick(colour.key)} />
              ))}
              <Swatch label="By suit: black cards blue, red cards purple" background={SUIT_SWATCH} picked={glow === 'suit'} onClick={() => pick('suit')} />
              {/* Your own: the colour picker, behind a rainbow (or your colour). */}
              <label
                title="Your own colour"
                className={`relative grid size-10 cursor-pointer place-items-center overflow-hidden rounded-full ring-offset-2 ring-offset-ink transition-[scale,box-shadow] duration-300 hover:scale-110 has-focus-visible:outline-2 has-focus-visible:outline-brand-gold ${
                  custom ? 'ring-2 ring-white' : 'ring-1 ring-white/25'
                }`}
                style={{ background: custom ?? RAINBOW }}
              >
                <span className="sr-only">Your own colour</span>
                {!custom && <span className="text-base font-black text-white drop-shadow" aria-hidden="true">+</span>}
                <input
                  type="color"
                  value={custom ?? '#4fa8ff'}
                  onChange={(event) => pick(event.target.value, { quiet: true })}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            </div>
            <p className="text-xs text-white/60">
              {pickedName}
              {!vfx && <span className="text-white/45"> · The glow is off: turn it on below to see it.</span>}
            </p>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Effects</h2>
        <div className="mt-2 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Glow and lightning (VFX)</span>
            <PillToggle
              label="Glow and lightning"
              options={ON_OFF}
              value={vfx ? 'on' : 'off'}
              onChange={(value) => {
                setVfx(value === 'on')
                setVfxShown(value === 'on')
              }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Sound</span>
            <PillToggle
              label="Sound"
              options={ON_OFF}
              value={sound ? 'on' : 'off'}
              onChange={(value) => {
                setMuted(value === 'off')
                setSound(value === 'on')
                if (value === 'on') FX.select(true)
              }}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-white/50">You can switch these at the table too, with VFX and 🔊 at the top.</p>
      </section>
    </div>
  )
}
