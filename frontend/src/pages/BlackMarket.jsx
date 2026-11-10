import '@fontsource/bebas-neue'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MotionConfig, motion } from 'motion/react'

import GameBackdrop from '../components/GameBackdrop'
import PillToggle from '../components/PillToggle'
import CoinIcon from '../components/wallet/CoinIcon'
import Chameleon from '../components/blackMarket/Chameleon'
import ItemCard from '../components/blackMarket/ItemCard'
import StyledAvatar from '../components/cosmetics/StyledAvatar'
import StyledUsername from '../components/cosmetics/StyledUsername'
import useApi from '../hooks/useApi'
import { buyCosmetic, getBlackMarket, wearCosmetic, wishCosmetic } from '../services/blackMarket'
import { getUser } from '../services/users'
import { getCurrentUser, getCurrentUserId } from '../utils/currentUser'
import { BORDER_ITEMS, CATEGORIES, NAME_ITEMS, cosmeticById } from '../../../shared/cosmetics/catalogue.js'

const EASE = [0.22, 1, 0.36, 1]
const GLASS = 'rounded-2xl border border-white/10 bg-ink/60 shadow-xl shadow-black/40 backdrop-blur-xl'

const KINDS = [
  { value: 'name', label: 'Name styles' },
  { value: 'border', label: 'Borders' },
]
const FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'Owned', label: 'Owned' },
  { value: 'Wishlist', label: '♥ Wishlist' },
  ...CATEGORIES.map((category) => ({ value: category, label: category })),
]
const SORTS = [
  { value: 'price', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'name', label: 'Name' },
  { value: 'popular', label: 'Popular' },
]

const byName = (a, b) => a.name.localeCompare(b.name, 'en')

// The items to show: those in `filter` (All, Owned, Wishlist or a
// category), what they're wearing first, then Default, then the rest in
// `sort`'s order. Popular is the most hearts first.
function itemsToShow(kind, filter, sort, shop) {
  const owns = (item) => item.price === 0 || shop.owned.includes(item.id)
  const hearts = (item) => shop.hearts[item.id] ?? 0
  const keep = {
    All: () => true,
    Owned: owns,
    Wishlist: (item) => shop.wishlist.includes(item.id),
  }[filter] ?? ((item) => item.category === filter)
  const compare = {
    price: (a, b) => a.price - b.price || byName(a, b),
    'price-desc': (a, b) => b.price - a.price || byName(a, b),
    name: byName,
    popular: (a, b) => hearts(b) - hearts(a) || a.price - b.price || byName(a, b),
  }[sort]

  const worn = shop.wearing[kind] ?? `${kind}.default`
  const place = (item) => (item.id === worn ? 0 : item.look ? 2 : 1)
  return (kind === 'name' ? NAME_ITEMS : BORDER_ITEMS).filter(keep).sort((a, b) => place(a) - place(b) || compare(a, b))
}

function Skeleton({ className }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-white/10 ${className}`} />
}

// What they're wearing now, on their own name and picture.
function Wearing({ me, shop }) {
  const name = cosmeticById(shop.wearing.name)
  const border = cosmeticById(shop.wearing.border)
  return (
    <section className={`${GLASS} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6`} aria-label="What you're wearing">
      <StyledAvatar borderId={shop.wearing.border} user={me} size="lg" />
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">You&apos;re wearing</p>
        <p className="mt-1 text-xl font-semibold text-white">
          <StyledUsername name={me.username} styleId={shop.wearing.name} />
        </p>
        <p className="mt-1 text-sm text-white/60">
          {name ? name.name : 'No name style'} · {border ? border.name : 'No border'}
        </p>
      </div>
    </section>
  )
}

// The Black Market, behind the Loan Shark page's "Black Market" button:
// name styles and profile-picture borders for P-PP (shared/cosmetics/
// catalogue.js), sold by the boss's Chameleon. Every item can be tried on
// the member's own name or picture before buying, buying asks first, and
// what they own they can wear or take off. Hearts make a wishlist, and the
// "Popular" sort. Admins also get the developer
// test tool. The rules are all checked on the server (backend/utils/
// blackMarket.js).
export default function BlackMarket() {
  const shop = useApi(() => getBlackMarket(), [])
  const profile = useApi(() => getUser(getCurrentUserId()), [])
  const [kind, setKind] = useState('name')
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('price')
  const admin = getCurrentUser()?.role === 'admin'

  const me = profile.data ?? (getCurrentUser() ? { _id: getCurrentUserId(), username: getCurrentUser().username, avatarUrl: null } : null)
  const items = shop.data ? itemsToShow(kind, filter, sort, shop.data) : []

  // A change, then the shop as it now is. Resolves to an error message, or null.
  async function change(action) {
    try {
      const result = await action()
      shop.setData(result.view)
      return null
    } catch (error) {
      return error.message
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <GameBackdrop to="#1F5C3A" />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:py-12"
      >
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link to="/games/loan-shark" className="text-sm text-white/60 hover:text-white">
              ← Loan Shark
            </Link>
            <h1 className="mt-2 font-['Bebas_Neue'] text-5xl leading-none tracking-wide text-white">
              Black <span className="text-emerald-300">Market</span>
            </h1>
            <p className="mt-2 max-w-2xl text-white/70">
              The boss&apos;s merch: name styles and profile-picture borders, for P-PP only. They show on leaderboards, review cards, your profile and the
              Resonance list.
            </p>
          </div>
          {admin && (
            <Link
              to="/games/loan-shark/black-market/dev"
              className="rounded-lg border border-sky-400/50 bg-sky-950/40 px-3 py-1.5 text-sm font-semibold text-sky-200 hover:border-sky-300 hover:text-white"
            >
              Developer test tool →
            </Link>
          )}
        </header>

        <Chameleon />

        {!shop.data || !me ? (
          shop.error ? (
            <p className={`${GLASS} p-6 text-white/70`}>The Black Market won&apos;t open. Try refreshing the page.</p>
          ) : (
            <>
              <Skeleton className="h-28" />
              <Skeleton className="h-96" />
            </>
          )
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-lg font-bold text-white" aria-label="Your P-PP and reviews">
              <span className="flex items-center gap-1.5">
                <CoinIcon kind="ppp" size={18} /> {shop.data.ppp.toLocaleString('en-US')} P-PP
              </span>
              <span className="text-base font-medium text-white/60">{shop.data.reviews} reviews</span>
            </p>

            <Wearing me={me} shop={shop.data} />

            <div className="flex flex-col gap-3">
              <PillToggle options={KINDS} value={kind} onChange={setKind} label="Name styles or borders" />
              <PillToggle options={FILTERS} value={filter} onChange={setFilter} label="Show" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-widest text-white/50 uppercase">Sort</span>
                <PillToggle options={SORTS} value={sort} onChange={setSort} label="Sort by" />
              </div>
            </div>

            {items.length === 0 && (
              <p className={`${GLASS} p-6 text-white/70`}>
                {filter === 'Wishlist' ? 'Nothing hearted yet. Tap the ♥ on anything you fancy.' : 'Nothing here yet.'}
              </p>
            )}

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  me={me}
                  shop={shop.data}
                  onBuy={(chosen) => change(() => buyCosmetic(chosen.id))}
                  onWear={(chosen) => change(() => wearCosmetic(chosen.type, chosen.id))}
                  onTakeOff={(type) => change(() => wearCosmetic(type, null))}
                  onHeart={(chosen, on) => change(() => wishCosmetic(chosen.id, on))}
                />
              ))}
            </ul>
          </>
        )}
      </motion.div>
    </MotionConfig>
  )
}
