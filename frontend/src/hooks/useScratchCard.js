import { useCallback, useEffect, useRef, useState } from 'react'
import { buyCard, collectCard, getCurrentCard, revealCard, scratchTile } from '../services/scratch'
import { walletChanged } from '../services/wallet'

// A little buzz on phones that have it: a star, a win, the Golden Ticket.
function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
}

// Checks a revealed card against the seal it was sold with, right here in
// the browser: sha256 of the layout and the salt has to be that hash. null
// if the browser can't work it out (an old one, or not on https).
async function checkSeal(layout, salt, hash) {
  if (!globalThis.crypto?.subtle) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(layout) + salt))
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return hex === hash
}

// The member's Box Office Scratch card, and everything they do with it.
//   card       undefined while loading, null if there's none to show
//   uncovered  the tiles whose foil is gone (a Set of positions)
//   pending    the tile waiting on the server, or null
//   busy       the tile being scratched, from the first touch until its
//              foil is gone; every other tile is locked meanwhile
//   reveal     after "Reveal card": { cardId, layout, verified }
// Coming back to the page picks up the card where they left it.
export default function useScratchCard() {
  const [card, setCard] = useState(undefined)
  const [uncovered, setUncovered] = useState(() => new Set())
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(null)
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState('')
  const [reveal, setReveal] = useState(null)

  // The latest card and busy tile, for callbacks that run later.
  const cardRef = useRef(undefined)
  const busyRef = useRef(null)

  // Shows `next`. Its scratched tiles count as uncovered, unless we're in
  // the middle of a scratch (then the tile uncovers when its foil goes).
  const showCard = useCallback((next, { keepUncovered = false } = {}) => {
    cardRef.current = next
    setCard(next)
    if (!keepUncovered) setUncovered(new Set(next ? next.scratched : []))
  }, [])

  const unlock = () => {
    busyRef.current = null
    setBusy(null)
  }

  // After a refusal: the card as the server has it now.
  const catchUp = useCallback(() => {
    getCurrentCard()
      .then(({ card: now }) => showCard(now))
      .catch(() => {})
  }, [showCard])

  useEffect(() => {
    let stopped = false
    getCurrentCard()
      .then(({ card: loaded }) => {
        if (!stopped) showCard(loaded)
      })
      .catch(() => {
        if (!stopped) showCard(null)
      })
    return () => {
      stopped = true
    }
  }, [showCard])

  const buy = useCallback(async () => {
    setBuying(true)
    setError('')
    try {
      const next = await buyCard()
      walletChanged()
      setReveal(null)
      unlock()
      showCard(next)
    } catch (buyError) {
      setError(buyError.message)
      // Already one going (a second tab, say): show that one.
      if (buyError.status === 409) catchUp()
    } finally {
      setBuying(false)
    }
  }, [showCard, catchUp])

  const scratch = useCallback(
    async (index) => {
      const current = cardRef.current
      if (!current || current.status !== 'active' || busyRef.current !== null) return

      busyRef.current = index
      setBusy(index)
      setPending(index)
      setError('')
      try {
        const { card: next } = await scratchTile(current._id, index)
        showCard(next, { keepUncovered: true })
        // A win is paid the moment it's locked in, so the balances count up.
        if ((next.tier && !current.tier) || (next.goldenFound && !current.goldenFound)) walletChanged()
      } catch (scratchError) {
        setError(scratchError.message)
        unlock()
        catchUp()
      } finally {
        setPending(null)
      }
    },
    [showCard, catchUp]
  )

  // A tile's foil is gone: it's uncovered, the other tiles unlock, and a
  // phone buzzes for a star, harder for the star that wins, and hardest
  // for the Golden Ticket.
  const uncover = useCallback((index) => {
    setUncovered((previous) => new Set(previous).add(index))
    if (busyRef.current === index) unlock()

    const current = cardRef.current
    if (!current?.scratched.includes(index)) return
    const content = current.tiles[index]
    if (content === 'golden') vibrate([60, 40, 60, 40, 220])
    else if (current.tier && current.scratched[current.tier.scratch - 1] === index) vibrate([40, 30, 120])
    else if (content === 'star') vibrate(25)
  }, [])

  const collect = useCallback(async () => {
    const current = cardRef.current
    if (!current) return
    setError('')
    try {
      showCard(await collectCard(current._id), { keepUncovered: true })
    } catch (collectError) {
      setError(collectError.message)
      catchUp()
    }
  }, [showCard, catchUp])

  // "Reveal card": the whole layout, checked against the seal the card was
  // sold with (the one the page has had all along, not one sent now).
  const revealAll = useCallback(async () => {
    const current = cardRef.current
    if (!current) return
    setError('')
    try {
      const { layout, salt } = await revealCard(current._id)
      setReveal({ cardId: current._id, layout, verified: await checkSeal(layout, salt, current.hash) })
    } catch (revealError) {
      setError(revealError.message)
    }
  }, [])

  // The same function every render, so a timer waiting to clear an error
  // isn't restarted each time the page redraws.
  const clearError = useCallback(() => setError(''), [])

  return {
    card: card ?? null,
    loading: card === undefined,
    uncovered,
    pending,
    busy,
    buying,
    error,
    reveal,
    buy,
    scratch,
    uncover,
    collect,
    revealAll,
    clearError,
  }
}
