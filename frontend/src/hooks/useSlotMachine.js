import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import { addCredits, cashOut, getMachine, spin } from '../services/slots'
import { walletChanged } from '../services/wallet'

// How many times a spin is sent again when the answer is lost on the way
// (the connection dropped), with the same spin id, so it's never played twice.
const RETRIES = 2

const newSpinId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

// The logged-in member's Slot Machine on the server (services/slots.js):
// what's in it, and adding credits, spinning and cashing out. `machine` is
// { balance, lastWin }, null while it loads.
export default function useSlotMachine() {
  const [machine, setMachine] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    getMachine().then(
      (data) => {
        setMachine(data.machine)
        setError(null)
      },
      (err) => setError(err.message)
    )
  }, [])

  useEffect(load, [load])

  const add = useCallback(async (amount) => {
    const data = await addCredits(amount)
    setMachine(data.machine)
    walletChanged()
    return data.machine
  }, [])

  // Spins for `bet`. Resolves to the spin; the machine's new balance is in
  // it, for the page to show once the reels land (setBalance).
  const play = useCallback(async (bet) => {
    const spinId = newSpinId()
    for (let attempt = 0; ; attempt++) {
      try {
        return await spin(spinId, bet)
      } catch (err) {
        if (err instanceof ApiError || attempt >= RETRIES) throw err
      }
    }
  }, [])

  const setBalance = useCallback((balance, lastWin) => setMachine((current) => ({ ...current, balance, lastWin })), [])

  const cashOutAll = useCallback(async () => {
    const data = await cashOut()
    setMachine(data.machine)
    walletChanged()
    return data
  }, [])

  return { machine, error, reload: load, add, play, setBalance, cashOut: cashOutAll }
}
