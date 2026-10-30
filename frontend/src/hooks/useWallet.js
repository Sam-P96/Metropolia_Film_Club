import { useEffect, useState } from 'react'
import { WALLET_CHANGED_EVENT, getWallet } from '../services/wallet'

// The logged-in member's wallet, or null while it loads (and always null
// when `enabled` is false, for logged-out visitors). It loads again
// whenever something calls walletChanged(), and when they come back to the
// tab, so a payout at 12:00 shows up without a refresh.
export default function useWallet(enabled = true) {
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    if (!enabled) return

    let stopped = false
    const load = () =>
      getWallet()
        .then((data) => {
          if (!stopped) setWallet(data)
        })
        .catch(() => {})

    load()
    window.addEventListener(WALLET_CHANGED_EVENT, load)
    window.addEventListener('focus', load)

    return () => {
      stopped = true
      window.removeEventListener(WALLET_CHANGED_EVENT, load)
      window.removeEventListener('focus', load)
    }
  }, [enabled])

  return enabled ? wallet : null
}