import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import StealPage from '../components/steal/StealPage'
import ItemCard from '../components/steal/ItemCard'
import Notice from '../components/steal/Notice'
import Reveal, { Placeholder } from '../components/steal/Reveal'
import useApi from '../hooks/useApi'
import useCountdown from '../hooks/useCountdown'
import useWallet from '../hooks/useWallet'
import CoinIcon from '../components/wallet/CoinIcon'
import AnimatedNumber from '../components/AnimatedNumber'
import { buyListing, getShop } from '../services/steal'
import { walletChanged } from '../services/wallet'
import { STEAL } from '../../../shared/steal/config.js'
import { EASE, FADE } from '../components/steal/motion'
import { GLASS, GOLD_BUTTON, QUIET_BUTTON, formatPp, formatSpan } from '../components/steal/style'

// The shop (spec §10.3): today's 9 listings at this member's prices, each
// for whoever buys it first, and when the next ones go up. The listings
// slide in one after another once loaded; buying one never reloads the
// page: its button fades into "Yours" and the card dims.
export default function StealShop() {
  const shop = useApi(getShop, [])
  const wallet = useWallet(true)
  const left = useCountdown(shop.data?.nextRefreshAt)
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const buy = async (listing) => {
    setBusy(listing._id)
    setMessage(null)
    try {
      const { item, price } = await buyListing(listing._id)
      // Marked as theirs straight away, before the fresh shop arrives.
      shop.setData((data) =>
        data ? { ...data, listings: data.listings.map((row) => (row._id === listing._id ? { ...row, sold: true, boughtByYou: true } : row)) } : data
      )
      setMessage({ ok: true, text: `Bought ${item.name} for ${formatPp(price)}. It's in your inventory.` })
    } catch (failure) {
      setMessage({ ok: false, text: failure.message })
    } finally {
      setBusy(null)
      shop.reload()
      walletChanged()
    }
  }

  const data = shop.data

  return (
    <StealPage
      back={{ to: '/games/steal-and-defend/play', label: 'Steal and Defend' }}
      title={
        <>
          The <span className="text-brand-gold">Shop</span>
        </>
      }
      subtitle={`${STEAL.shop.listings} new listings every day at 12:00. Each can only be bought once: first come, first served. Prices are the item's multiplier times your daily PP.`}
      actions={
        <Link to="/games/steal-and-defend/market" className={`${QUIET_BUTTON} min-h-9 text-sm`}>
          Player market
        </Link>
      }
    >
      <div className={`${GLASS} flex flex-wrap items-center justify-between gap-3 p-4`}>
        <p className="text-sm text-white/70">
          New listings in <span className="font-bold text-white tabular-nums">{left === null ? '…' : formatSpan(left)}</span>
        </p>
        <p className="flex items-center gap-3 text-sm font-bold text-white">
          <span className="flex items-center gap-1">
            <CoinIcon kind="pp" size={16} /> {wallet ? <AnimatedNumber value={wallet.pp} /> : '…'}
          </span>
          <span className="flex items-center gap-1">
            <CoinIcon kind="ppp" size={16} /> {wallet ? <AnimatedNumber value={wallet.ppp} /> : '…'}
          </span>
          {data && <span className="font-normal text-white/50">Daily PP: {data.dailyPp}</span>}
        </p>
      </div>

      <AnimatePresence initial={false}>
        {data?.refusal && (
          <motion.p key="refusal" {...FADE} className="rounded-xl border border-brand-red/50 bg-black/40 p-3 text-sm text-white/80">
            {data.refusal}
          </motion.p>
        )}
      </AnimatePresence>
      <Notice message={message} />

      <AnimatePresence mode="wait" initial={false}>
        {!data ? (
          <motion.div key="loading" {...FADE}>
            {shop.error ? (
              <p className={`${GLASS} p-6 text-white/70`}>Couldn&apos;t load the shop.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: STEAL.shop.listings }, (_, i) => (
                  <Placeholder key={i} className="h-40" />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.ul key="listings" {...FADE} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.listings.map((listing, index) => (
              <li key={listing._id}>
                <Reveal order={index} className="h-full">
                  <div className={`h-full transition-opacity duration-300 ${listing.sold ? 'opacity-50' : ''}`}>
                  <ItemCard item={listing} highlight={listing.unique && !listing.sold}>
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs text-white/50">Durability {listing.durability}</span>
                      <AnimatePresence mode="wait" initial={false}>
                        {listing.sold ? (
                          <motion.span
                            key="sold"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1, transition: { duration: 0.25, ease: EASE } }}
                            className="text-sm font-bold text-white/60"
                          >
                            {listing.boughtByYou ? 'Yours' : 'Sold'}
                          </motion.span>
                        ) : (
                          <motion.span key="buy" {...FADE}>
                            <button type="button" onClick={() => buy(listing)} disabled={!data.canBuy || busy === listing._id} className={`${GOLD_BUTTON} min-h-9 text-sm`}>
                              {busy === listing._id ? 'Buying…' : `Buy · ${formatPp(listing.price)}`}
                            </button>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </ItemCard>
                  </div>
                </Reveal>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </StealPage>
  )
}
