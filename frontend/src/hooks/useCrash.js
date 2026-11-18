import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getCurrentUser } from '../utils/currentUser'
import { walletChanged } from '../services/wallet'

// Crash, live (backend/games/crash/live.js): the lobby, the room you're in,
// the round being played there, and you. The server decides everything;
// this keeps up with it and asks.
//
// The round's path arrives a tick at a time, 10 a second. It's kept in
// `live` (a ref), with when each tick came, so the chart can draw it at 60
// frames a second without React; `round` is the same round for everything
// else on the page.
//
// Returns { connected, lobby, room, round, me, live, notice, clearNotice,
//   showNotice, create, join, spectate, leave, setBet, ready, startGame,
//   answer, invite, solo, allIn, cashOut }.
// Each action resolves to the server's answer, or throws its reason.

const blankLive = () => ({ roundId: null, path: [], lastTickAt: 0, status: null, endedBy: null, config: null, cashouts: new Map(), crashedAt: 0 })

export default function useCrash() {
  const [connected, setConnected] = useState(false)
  const [lobby, setLobby] = useState([])
  const [room, setRoom] = useState(null)
  const [round, setRound] = useState(null)
  const [me, setMe] = useState(null)
  const [notice, setNotice] = useState('')
  const socketRef = useRef(null)
  const live = useRef(blankLive())
  // The room this page is showing: news of any other is ignored.
  const roomIdRef = useRef(null)
  const showRoom = useCallback((next) => {
    roomIdRef.current = next?.id ?? null
    setRoom(next)
  }, [])

  // A round as the server sends it with the room: take it in.
  const adoptRound = useCallback((next) => {
    if (!next) {
      setRound(null)
      return
    }
    const now = performance.now()
    const current = live.current
    if (current.roundId !== next.id) {
      live.current = { ...blankLive(), roundId: next.id }
    }
    const kept = live.current
    // The path: whichever is further along, what we have or what came.
    if (next.path.length > kept.path.length) {
      kept.path = [...next.path]
      kept.lastTickAt = now
    }
    if (next.status === 'over' && kept.status !== 'over' && next.endedBy === 'crash' && !kept.crashedAt) kept.crashedAt = now
    kept.status = next.status
    kept.endedBy = next.endedBy
    kept.config = next.config
    for (const player of next.players) {
      if (player.cashedAt !== null) kept.cashouts.set(player.userId, { multiplier: player.cashedAt, tick: player.cashedTick, auto: player.auto })
    }
    setRound(next)
  }, [])

  useEffect(() => {
    const socket = io({ auth: { token: getCurrentUser()?.token } })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('crash:hello', {}, (answer) => {
        if (answer?.error) {
          setNotice(answer.error)
          return
        }
        setConnected(true)
        setLobby(answer.lobby)
        setMe(answer.me)
        showRoom(answer.room)
        adoptRound(answer.room?.round ?? null)
      })
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('crash:lobby', setLobby)
    socket.on('crash:me', setMe)
    socket.on('crash:room', (next) => {
      if (roomIdRef.current !== null && roomIdRef.current !== next.id) return
      showRoom(next)
      adoptRound(next.round)
    })
    socket.on('crash:kicked', ({ message }) => {
      setNotice(message)
      showRoom(null)
      adoptRound(null)
      live.current = blankLive()
    })
    socket.on('crash:error', ({ message }) => setNotice(message))

    // A tick: the next point on the line, and anyone cashed out on it.
    socket.on('crash:tick', (event) => {
      const kept = live.current
      if (event.roundId !== kept.roundId) return
      if (event.tick === kept.path.length) kept.path.push(event.multiplier)
      kept.lastTickAt = performance.now()
      for (const out of event.cashouts) kept.cashouts.set(out.userId, { multiplier: out.multiplier, tick: out.tick, auto: out.auto })
      if (event.ended) {
        kept.endedBy = event.ended
        kept.status = 'over'
        if (event.ended === 'crash') kept.crashedAt = performance.now()
      }
      setRound((current) => {
        if (!current || current.id !== event.roundId) return current
        const players = event.cashouts.length
          ? current.players.map((player) => {
              const out = event.cashouts.find((entry) => entry.userId === player.userId)
              return out ? { ...player, cashedAt: out.multiplier, cashedTick: out.tick, auto: out.auto, payout: out.payout } : player
            })
          : current.players
        return { ...current, tick: event.tick, multiplier: event.multiplier, players, ...(event.ended && { status: 'over', endedBy: event.ended }) }
      })
    })

    // Someone cashed out by hand.
    socket.on('crash:cashout', (out) => {
      const kept = live.current
      if (out.roundId !== kept.roundId) return
      kept.cashouts.set(out.userId, { multiplier: out.multiplier, tick: out.tick, auto: out.auto })
      setRound((current) =>
        current && current.id === out.roundId
          ? { ...current, players: current.players.map((player) => (player.userId === out.userId ? { ...player, cashedAt: out.multiplier, cashedTick: out.tick, auto: out.auto, payout: out.payout } : player)) }
          : current
      )
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [adoptRound, showRoom])

  // Points change when a round takes a bet or pays out: the wallet in the
  // nav bar hears it.
  const pointsRef = useRef(null)
  useEffect(() => {
    if (me?.points === undefined) return
    if (pointsRef.current !== null && pointsRef.current !== me.points) walletChanged()
    pointsRef.current = me.points
  }, [me?.points])

  const request = useCallback(
    (event, payload = {}) =>
      new Promise((resolve, reject) => {
        const socket = socketRef.current
        if (!socket?.connected) {
          reject(new Error('Not connected. Trying again…'))
          return
        }
        socket.emit(event, payload, (answer) => {
          if (answer?.error) reject(new Error(answer.error))
          else resolve(answer)
        })
      }),
    []
  )

  const enter = useCallback(
    (answer) => {
      if (answer?.room) {
        showRoom(answer.room)
        adoptRound(answer.room.round)
      }
      return answer
    },
    [adoptRound, showRoom]
  )

  return {
    connected,
    lobby,
    room,
    round,
    me,
    live,
    notice,
    clearNotice: () => setNotice(''),
    showNotice: setNotice,
    create: () => request('crash:create').then(enter),
    // Into a room, to play, or with `spectate` to watch.
    join: (roomId, spectate = false) => request('crash:join', { roomId, spectate }).then(enter),
    // Sit rounds out (`on`), or take a seat again.
    spectate: (on) => request('crash:spectate', { on }),
    leave: () =>
      request('crash:leave').then(() => {
        showRoom(null)
        adoptRound(null)
        live.current = blankLive()
      }),
    setBet: (bet, autoAt) => request('crash:bet', { bet, autoAt }),
    ready: (on, bet, autoAt) => request('crash:ready', { ready: on, bet, autoAt }),
    // Start Game, without everyone ready; and the answer to its prompt.
    startGame: () => request('crash:start'),
    answer: (join) => request('crash:answer', { join }),
    invite: (userId) => request('crash:invite', { userId }),
    solo: (bet, autoAt) => request('crash:solo', { bet, autoAt }).then(enter),
    allIn: () => request('crash:allin').then(enter),
    cashOut: () => request('crash:cashout'),
  }
}
