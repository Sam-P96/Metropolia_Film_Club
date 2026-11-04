import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import ItemCard from './ItemCard'
import { FADE, LAYOUT, SLIDE } from './motion'
import { equipItem, sellItem, unequipItem } from '../../services/steal'
import { STEAL } from '../../../../shared/steal/config.js'
import { GLASS, QUIET_BUTTON, SMALL_BUTTON, formatPp } from './style'

// The small buttons, with the game's subtle hover lift.
const SMALL = SMALL_BUTTON

// The 3 equip slots and the inventory (spec §10.1), with Equip, Unequip
// and Sell back. `locked`: their own attack is on, so nothing can change.
export default function Loadout({ hub, onChanged }) {
  const [busy, setBusy] = useState(null)
  const [problem, setProblem] = useState(null)
  const [confirmSell, setConfirmSell] = useState(null)

  const equipped = new Set(hub.equipped)
  const slots = Array.from({ length: STEAL.inventory.slots }, (_, i) => hub.inventory.find((item) => item._id === hub.equipped[i]) ?? null)
  const locked = Boolean(hub.attack.active)
  const pvp = hub.player.enabled

  const act = async (id, work) => {
    setBusy(id)
    setProblem(null)
    try {
      await work()
      setConfirmSell(null)
      onChanged()
    } catch (failure) {
      setProblem(failure.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className={`${GLASS} p-5`} aria-labelledby="steal-loadout">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="steal-loadout" className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">
          Equipped
        </h2>
        {locked && <p className="text-xs text-white/50">Locked until your attack is over.</p>}
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {slots.map((item, i) => (
          <li key={i} className="min-h-28">
            <AnimatePresence mode="wait" initial={false}>
            {item ? (
              <motion.div key={item._id} {...SLIDE} className="h-full">
              <ItemCard item={item} compact highlight>
                <button
                  type="button"
                  disabled={locked || busy === item._id}
                  onClick={() => act(item._id, () => unequipItem(item._id))}
                  className={`${SMALL} border border-white/20 text-white`}
                >
                  Unequip
                </button>
              </ItemCard>
              </motion.div>
            ) : (
              <motion.div key="empty" {...FADE} className="grid h-full place-items-center rounded-xl border border-dashed border-white/15 text-xs text-white/40">
                Empty slot
              </motion.div>
            )}
            </AnimatePresence>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-['Bebas_Neue'] text-2xl tracking-wide text-brand-gold">
          Inventory{' '}
          <span className="text-base text-white/50">
            {hub.inventory.length}/{STEAL.inventory.size}
          </span>
        </h2>
        <div className="flex gap-2">
          <Link to="/games/steal-and-defend/shop" className={`${QUIET_BUTTON} min-h-9 text-sm`}>
            Shop
          </Link>
          <Link to="/games/steal-and-defend/market" className={`${QUIET_BUTTON} min-h-9 text-sm`}>
            Market & trades
          </Link>
        </div>
      </div>
      {!pvp && <p className="mt-2 text-xs text-white/50">With PvP off you can still sell and trade items, but not equip them.</p>}
      <AnimatePresence initial={false}>
        {problem && (
          <motion.p key={problem} {...FADE} className="mt-2 text-sm text-brand-red">
            {problem}
          </motion.p>
        )}
      </AnimatePresence>

      {hub.inventory.length === 0 && <motion.p {...FADE} className="mt-3 text-sm text-white/50">Nothing yet. The shop has new items every day at 12:00.</motion.p>}
      {/* A sold or traded item slides out, a new one slides in, and the
          rest glide into place. */}
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
          {hub.inventory.map((item) => {
            const on = equipped.has(item._id)
            const away = item.state !== 'owned'
            return (
              <motion.li key={item._id} {...SLIDE} {...LAYOUT}>
                <div className={`h-full transition-opacity ${busy === item._id ? 'opacity-60' : ''}`}>
                <ItemCard item={item} highlight={on}>
                  {away ? (
                    <span className="text-xs text-white/50">{item.state === 'listed' ? 'On the market' : 'In a trade offer'}</span>
                  ) : on ? (
                    <button type="button" disabled={locked || busy === item._id} onClick={() => act(item._id, () => unequipItem(item._id))} className={`${SMALL} border border-white/20 text-white`}>
                      Unequip
                    </button>
                  ) : (
                    <>
                      {pvp && (
                        <button type="button" disabled={locked || busy === item._id} onClick={() => act(item._id, () => equipItem(item._id))} className={`${SMALL} bg-brand-gold text-ink`}>
                          Equip
                        </button>
                      )}
                      {confirmSell === item._id ? (
                        <>
                          <button type="button" disabled={busy === item._id} onClick={() => act(item._id, () => sellItem(item._id))} className={`${SMALL} bg-brand-red text-white`}>
                            Sell for {formatPp(item.sellValue)}?
                          </button>
                          <button type="button" onClick={() => setConfirmSell(null)} className={`${SMALL} text-white/60`}>
                            Keep
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmSell(item._id)} className={`${SMALL} border border-white/20 text-white`}>
                          Sell back · {formatPp(item.sellValue)}
                        </button>
                      )}
                    </>
                  )}
                </ItemCard>
                </div>
              </motion.li>
            )
          })}
          </AnimatePresence>
        </ul>
    </section>
  )
}
