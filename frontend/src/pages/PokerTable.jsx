import '@fontsource/bebas-neue'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import TableScene from '../components/poker/TableScene'
import { ActionBar, DrawBar, EmojiButton, JoinPanel } from '../components/poker/Controls'
import { GLASS, POKER_FADE, QUIET, RED } from '../components/poker/style'
import { FX, HAPTIC, haptic, isMuted, setMuted, wakeAudio } from '../components/poker/feedback'
import { setVfx, vfxOn } from '../components/poker/vfx'
import { loadGlow } from '../components/poker/glow'
import CoinIcon from '../components/wallet/CoinIcon'
import useGameFrame from '../hooks/useGameFrame'
import usePokerTable from '../hooks/usePokerTable'
import useWallet from '../hooks/useWallet'
import { walletChanged } from '../services/wallet'
import { backdropImage } from '../utils/gameBackdrop'
import { POKER } from '../../../shared/poker/config.js'

let nextId = 0
const id = () => ++nextId

// Ticks a few times a second, for the timers.
function useNow(offset) {
  const [now, setNow] = useState(() => Date.now() + offset)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 250)
    return () => clearInterval(timer)
  }, [offset])
  return now
}

// The bots' speech bubbles: each bot has its own, popping up the moment it
// acts and gone after POKER.speech.bubbleSeconds (a new line replaces its
// last one). `delayMs` holds one back (the hellos, one after another). Every
// bubble has its own timer to take it down, so none can get stuck.
function useBubbles() {
  const [bubbles, setBubbles] = useState([])
  const timers = useRef(new Set())
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])
  const later = useCallback((fn, ms) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
  }, [])
  const add = useCallback(
    (bubble, delayMs = 0) =>
      later(() => {
        setBubbles((list) => [...list.filter((other) => other.seat !== bubble.seat), bubble])
        FX.speech()
        later(() => setBubbles((list) => list.filter((other) => other.id !== bubble.id)), POKER.speech.bubbleSeconds * 1000)
      }, delayMs),
    [later]
  )
  return { bubbles, add }
}

// What's happening, in one line above the controls.
function statusLine(view, now) {
  const hand = view.hand
  const seconds = (at) => Math.max(0, Math.ceil((at - now) / 1000))
  if (view.status === 'empty') return 'The table is open. Sit down, and three bots will join you.'
  if (hand?.phase === 'done' && hand.results) {
    const names = new Map(view.seats.map((seat) => [seat.seat, seat.seat === view.you.seat ? 'You' : seat.name]))
    const top = [...hand.results.winners].filter((winner) => winner.won > 0).sort((a, b) => b.amount - a.amount)[0]
    if (top) return `${names.get(top.seat) ?? 'Someone'} ${names.get(top.seat) === 'You' ? 'win' : 'wins'} ${top.amount}${top.label ? ` with ${top.label}` : ''}`
  }
  if (!hand || view.status === 'waiting') return view.nextHandAt ? `Next hand in ${seconds(view.nextHandAt)}…` : 'Waiting for players…'
  const turn = view.seats.find((seat) => seat.isTurn)
  if (view.you.myTurn) return hand.phase === 'draw' ? 'Your draw.' : 'Your turn.'
  if (!turn) return '…'
  return hand.phase === 'draw' ? `${turn.name} is drawing…` : `${turn.name} is thinking…`
}

// Under the table, while you're seated and it isn't your turn.
function idleLine(view) {
  const me = view.seats.find((seat) => seat.seat === view.you.seat)
  const live = view.hand && view.hand.phase !== 'done'
  const chips = (
    <span>
      Your chips <span className="font-bold text-brand-gold tabular-nums">{view.you.stack}</span>
    </span>
  )
  if (live && me?.allIn) return <>{chips}<span>All in. Good luck.</span></>
  if (live && (!me?.inHand || me.folded)) return <>{chips}<span>Back in next hand.</span></>
  if (live) return <>{chips}<span>Pot <span className="font-bold text-white tabular-nums">{view.hand.pot}</span></span></>
  return chips
}

// Kino Poker's table (spec): fills the screen under the nav bar without
// scrolling, phone first. The table and everyone at it in the middle, your
// own cards along the bottom, and what you can do under them.
export default function PokerTable() {
  const frame = useGameFrame()
  const wallet = useWallet(true)
  const { bubbles, add: addBubble } = useBubbles()
  const [emojis, setEmojis] = useState([])
  const [slides, setSlides] = useState([])
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState({ key: null, cards: [] })
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [sound, setSound] = useState(() => !isMuted())
  const [vfx, setVfxShown] = useState(vfxOn)
  // The glow's colour, picked in Options on the intro page.
  const [glow] = useState(loadGlow)
  // Your seat, for the events' sounds (a pot you won sounds different).
  const me = useRef(null)

  const flash = useCallback((text) => {
    const item = { id: id(), text }
    setToast(item)
    setTimeout(() => setToast((current) => (current?.id === item.id ? null : current)), 3500)
  }, [])

  const onEvent = useCallback(
    (event) => {
      if (event.type === 'say') addBubble({ id: id(), seat: event.seat, name: event.name, text: event.text }, event.delayMs)
      if (event.type === 'emoji') {
        const item = { id: id(), seat: event.seat, emoji: event.emoji }
        setEmojis((list) => [...list, item])
        setTimeout(() => setEmojis((list) => list.filter((other) => other.id !== item.id)), POKER.emoji.showSeconds * 1000)
      }
      // The sounds of the table (components/poker/feedback.js).
      if (event.type === 'deal') FX.deal((event.order?.length ?? 0) * 5)
      if (event.type === 'action') {
        if (event.action === 'fold') FX.fold()
        else if (event.action === 'check') FX.check()
        else FX.chips(event.amount, { allIn: event.action === 'allIn' })
      }
      if (event.type === 'draw') {
        if (event.count) FX.draw(event.count)
        else FX.standPat()
      }
      if (event.type === 'reshuffle') FX.reshuffle()
      if (event.type === 'emoji') FX.emoji()
      if (event.type === 'win') {
        const won = event.winners.some((winner) => winner.seat === me.current && winner.amount > 0)
        FX.win(won)
        if (won) haptic(HAPTIC.win)
        const items = event.winners.filter((winner) => winner.amount > 0).map((winner) => ({ id: id(), seat: winner.seat, amount: winner.amount }))
        setSlides(items)
        setTimeout(() => setSlides([]), 1400)
      }
      if (event.type === 'message') flash(event.text)
      if (event.type === 'cashedOut') {
        flash(`Cashed out ${event.stack} chips: ${event.paid?.pp ?? 0} PP and ${event.paid?.ppp ?? 0} P-PP back in your wallet.`)
        walletChanged()
      }
    },
    [addBubble, flash]
  )

  const { state: view, connected, offset, send } = usePokerTable({ onEvent })
  const now = useNow(offset)
  useEffect(() => {
    me.current = view?.you.seat ?? null
  })

  const run = async (event, payload) => {
    haptic(HAPTIC.press)
    setBusy(true)
    const reply = await send(event, payload)
    setBusy(false)
    if (reply?.error) flash(reply.error)
    return reply
  }

  const hand = view?.hand
  const you = view?.you
  const seated = you?.seat !== null && you?.seat !== undefined
  const mySeat = seated ? view.seats.find((seat) => seat.seat === you.seat) : null
  // Leaving now folds your hand, so it asks first.
  const inHand = Boolean(hand && hand.phase !== 'done' && mySeat?.inHand && !mySeat.folded)
  const pickKey = hand ? `${hand.id}:${hand.phase}` : null
  const picked = pick.key === pickKey ? pick.cards : []
  const toggle = (index) => {
    const cards = picked.includes(index) ? picked.filter((i) => i !== index) : picked.length < POKER.maxDraw ? [...picked, index] : picked
    FX.select(cards.includes(index))
    haptic(HAPTIC.card)
    setPick({ key: pickKey, cards })
  }

  // Your turn: a ping and a buzz as it comes round, then a tick for each of
  // its last 5 seconds.
  const turnKey = you?.myTurn ? hand?.deadline : null
  const secondsLeft = turnKey ? Math.ceil((turnKey - now) / 1000) : null
  useEffect(() => {
    if (!turnKey) return
    FX.turn()
    haptic(HAPTIC.turn)
  }, [turnKey])
  useEffect(() => {
    if (secondsLeft !== null && secondsLeft >= 1 && secondsLeft <= 5) FX.tick(secondsLeft <= 2)
  }, [secondsLeft])

  const toggleSound = () => {
    setMuted(sound)
    setSound(!sound)
    if (!sound) FX.select(true)
  }

  // The VFX button: your best hand's glow and lightning, on or off.
  const toggleVfx = () => {
    setVfx(!vfx)
    setVfxShown(!vfx)
    FX.select(!vfx)
    haptic(HAPTIC.press)
  }

  // Full of members: the queue. Mid-hand: a seat between hands. Otherwise
  // straight in.
  const fullOfMembers = view ? view.seats.filter((seat) => seat.kind === 'human' && !seat.leaving).length >= POKER.seats : false
  const joinLabel = fullOfMembers || view?.queue ? 'Join the queue' : view?.status === 'playing' || hand ? 'Sit in next hand' : 'Sit down'

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="fixed inset-x-0 z-40 flex flex-col overflow-hidden bg-ink"
        // Browsers only allow sound after a tap: the first one wakes it.
        onPointerDown={wakeAudio}
        style={{ top: frame.top, height: frame.height, backgroundImage: backdropImage(POKER_FADE), backgroundAttachment: 'fixed' }}
      >
        <header className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 sm:gap-2">
          <Link to="/games/poker" aria-label="Back to Kino Poker" className="px-1 text-white/60 transition-colors duration-300 hover:text-white">
            ←
          </Link>
          <h1 className="hidden shrink-0 font-['Bebas_Neue'] text-2xl leading-none tracking-wide text-white sm:block">
            Kino <span className="text-brand-gold">Poker</span>
          </h1>
          <p className="min-w-0 flex-1 truncate text-center text-xs text-white/75 sm:text-sm" aria-live="polite">
            {!connected ? <span className="text-brand-red">Reconnecting…</span> : view ? statusLine(view, now) : 'Connecting…'}
          </p>
          {wallet && (
            <span className="hidden items-center gap-2 text-xs font-bold text-white md:flex">
              <CoinIcon kind="pp" size={14} /> {wallet.pp}
              <CoinIcon kind="ppp" size={14} /> {wallet.ppp}
            </span>
          )}
          <button
            type="button"
            onClick={toggleVfx}
            aria-pressed={vfx}
            aria-label={vfx ? 'Turn off the glow and lightning on your best hand' : 'Turn on the glow and lightning on your best hand'}
            title={vfx ? 'Glow and lightning: on' : 'Glow and lightning: off'}
            className={`${QUIET} min-h-9 px-2 text-xs tracking-wider ${vfx ? 'text-brand-gold!' : 'text-white/45! line-through'}`}
          >
            VFX
          </button>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!sound}
            aria-label={sound ? 'Mute the sound' : 'Turn the sound on'}
            title={sound ? 'Mute' : 'Sound on'}
            className={`${QUIET} min-h-9 px-2 text-base`}
          >
            {sound ? '🔊' : '🔇'}
          </button>
          {seated && <EmojiButton disabled={!connected} onSend={(emoji) => run('poker:emoji', { emoji })} />}
          {seated &&
            (confirmLeave ? (
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmLeave(false)
                    run('poker:leave')
                  }}
                  className={`${RED} min-h-9`}
                >
                  Fold &amp; leave
                </button>
                <button type="button" onClick={() => setConfirmLeave(false)} className={`${QUIET} min-h-9`}>
                  Stay
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => (inHand ? setConfirmLeave(true) : run('poker:leave'))} className={`${QUIET} min-h-9`}>
                Leave
              </button>
            ))}
        </header>

        <div className="relative min-h-0 flex-1">
          {view ? (
            <TableScene
              view={view}
              selected={picked}
              onToggle={you?.mustDraw ? toggle : undefined}
              bubbles={bubbles}
              emojis={emojis}
              slides={slides}
              now={now}
              vfx={vfx}
              glow={glow}
            />
          ) : (
            <p className="absolute inset-0 grid place-items-center text-white/60">Finding the table…</p>
          )}
          <AnimatePresence>
            {toast && (
              <motion.p
                key={toast.id}
                role="status"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute inset-x-3 top-2 z-40 mx-auto max-w-sm rounded-xl border border-brand-gold/40 bg-ink/90 px-3 py-2 text-center text-sm text-white shadow-xl"
              >
                {toast.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <footer className={`${GLASS} relative z-30 mx-2 mb-2 shrink-0 rounded-2xl p-2.5`}>
          {!view ? (
            <p className="py-3 text-center text-xs text-white/50">Connecting…</p>
          ) : !seated ? (
            <JoinPanel
              key={you.queued ? 'queued' : 'join'}
              queued={you.queued}
              wallet={wallet}
              label={joinLabel}
              busy={busy || !connected}
              onJoin={(buyIn) => run('poker:join', { buyIn }).then((reply) => reply?.ok && walletChanged())}
              onLeaveQueue={() => run('poker:leave')}
            />
          ) : you.myTurn && you.mustDraw ? (
            <DrawBar selected={picked} busy={busy} onDraw={(cards) => run('poker:draw', { discards: cards })} />
          ) : you.myTurn && you.legal ? (
            <ActionBar key={`${hand.id}:${hand.phase}:${hand.currentBet}`} legal={you.legal} pot={hand.pot} busy={busy} onAct={(action, amount) => run('poker:act', { action, amount })} />
          ) : (
            <p className="flex min-h-11 items-center justify-center gap-3 text-center text-xs text-white/60">{idleLine(view)}</p>
          )}
        </footer>
      </div>
    </MotionConfig>
  )
}
