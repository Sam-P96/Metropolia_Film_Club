import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import Board from '../components/gomoku/Board'
import GomokuPage, { CARD } from '../components/gomoku/GomokuChrome'
import PlayersBar from '../components/gomoku/PlayersBar'
import { QUIET_BUTTON, SMALL_BUTTON } from '../components/steal/style'
import useApi from '../hooks/useApi'
import { devAcceptAsThem, devForgetReplay, devPlayTheirMove, devRefundShop, devUnsee, getGomokuDev, getGomokuLobby } from '../services/gomoku'
import { walletChanged } from '../services/wallet'
import { DEFAULTS, KINDS, KIND_LABELS, itemsOfKind, pieceAgainst } from '../../../shared/gomoku/catalogue.js'
import { DEFAULT_SIZE, boardOf, isFull, winningLine } from '../../../shared/gomoku/rules.js'

const BACK = { to: '/games/gomoku', label: 'Infinite Gomoku' }
const PANEL = 'rounded-2xl border-2 border-dashed border-sky-400/50 bg-sky-950/40 p-5 text-center text-sm text-white/70 sm:p-6'
const TITLE = 'text-center text-xs font-semibold tracking-widest text-sky-300 uppercase'
const FIELD = 'w-full rounded-lg border border-white/15 bg-ink/70 px-3 py-2 text-sm text-white focus:border-brand-gold focus:outline-none'

function Picker({ label, kind, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5 font-medium text-white/80">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className={FIELD}>
        {itemsOfKind(kind).map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} · {item.category} · {item.price ? `${item.price} PP` : 'free'}
          </option>
        ))}
      </select>
    </label>
  )
}

// Everything in the shop on one board, nothing bought or saved: pick any
// piece and shockwave for each side, any board and grid, and put stones
// down. With the same piece on both sides, theirs shows the way it would
// in a real game (catalogue.js pieceAgainst).
function Lab() {
  const size = DEFAULT_SIZE
  const [mine, setMine] = useState({ ...DEFAULTS })
  const [theirPiece, setTheirPiece] = useState(DEFAULTS.piece)
  const [theirWave, setTheirWave] = useState('wave.fire')
  const [confirmStep, setConfirmStep] = useState(true)
  const [moves, setMoves] = useState([])
  const [winLine, setWinLine] = useState([])
  const [selected, setSelected] = useState(null)
  const [impact, setImpact] = useState(null)
  const impacts = useRef(0)

  const pieces = [{ id: mine.piece, invert: false }, pieceAgainst(mine.piece, theirPiece)]
  const waves = [mine.shockwave, theirWave]
  const next = moves.length % 2
  const full = isFull(boardOf(size, moves))
  const over = winLine.length > 0 || full
  const winner = winLine.length ? moves.at(-1).seat : null
  const result = winner !== null ? { title: `${winner === 0 ? 'You' : 'Them'} win!`, detail: 'Five in a row.', tone: 'win' } : full ? { title: 'Draw', tone: 'draw' } : null

  const land = (x, y, seat, confirmed = false) => {
    impacts.current += 1
    setImpact({ x, y, wave: waves[seat], key: impacts.current, confirmed })
  }
  const put = (x, y) => {
    const after = [...moves, { x, y, seat: next }]
    setMoves(after)
    setWinLine(winningLine(boardOf(size, after), size, x, y) ?? [])
    setSelected(null)
    land(x, y, next, confirmStep)
  }
  const clear = () => {
    setMoves([])
    setWinLine([])
    setSelected(null)
  }

  return (
    <section className={`${PANEL} flex flex-col gap-4`} aria-labelledby="lab-heading">
      <h2 id="lab-heading" className={TITLE}>
        Lab: try everything, buy nothing
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {KINDS.map((kind) => (
          <Picker key={kind} label={`Your ${KIND_LABELS[kind].slice(0, -1).toLowerCase()}`} kind={kind} value={mine[kind]} onChange={(id) => setMine({ ...mine, [kind]: id })} />
        ))}
        <Picker label="Their piece" kind="piece" value={theirPiece} onChange={setTheirPiece} />
        <Picker label="Their shockwave" kind="shockwave" value={theirWave} onChange={setTheirWave} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <label className="flex items-center gap-2 text-white/80">
          <input type="checkbox" checked={confirmStep} onChange={(event) => setConfirmStep(event.target.checked)} /> Confirm button
        </label>
        <button type="button" onClick={clear} className={`${SMALL_BUTTON} border border-white/20 text-white`}>
          Clear the board
        </button>
        <button
          type="button"
          disabled={!moves.length}
          onClick={() => land(moves.at(-1).x, moves.at(-1).y, moves.at(-1).seat)}
          className={`${SMALL_BUTTON} border border-white/20 text-white`}
        >
          Land the last one again
        </button>
      </div>

      <PlayersBar
        players={[
          { name: 'You', user: null, piece: pieces[0], first: true },
          { name: 'Them', user: null, piece: pieces[1], first: false },
        ]}
        current={next}
        winner={winner}
        over={over}
      />
      <div className="mx-auto w-full max-w-xl">
        <Board
          size={size}
          moves={moves}
          pieceFor={(seat) => pieces[seat]}
          boardId={mine.board}
          gridId={mine.grid}
          ghost={pieces[next]}
          selected={selected}
          onSelect={(x, y) => (confirmStep ? setSelected({ x, y }) : put(x, y))}
          canPlay={!over}
          winLine={winLine}
          impact={impact}
          result={result}
          label="The lab's board"
        />
      </div>
      {confirmStep && !over && (
        <button type="button" disabled={!selected} onClick={() => put(selected.x, selected.y)} className={`${QUIET_BUTTON} self-center`}>
          Place {next === 0 ? 'your' : 'their'} piece
        </button>
      )}
    </section>
  )
}

// The server's developer tools, on your For Fun games: answer your own
// challenge as the other member, play their turns, make a move land again.
function ServerTools() {
  const dev = useApi(() => getGomokuDev(), [])
  const [reloads, setReloads] = useState(0)
  const lobby = useApi(() => getGomokuLobby(), [reloads], { enabled: Boolean(dev.data?.on) })
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = async (action, done) => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await action()
      setMessage({ text: done(result) })
      setReloads((count) => count + 1)
    } catch (error) {
      setMessage({ text: error.message, error: true })
    } finally {
      setBusy(false)
    }
  }

  if (dev.loading) return <p className={PANEL}>Asking the server about its developer tools…</p>
  if (!dev.data?.on) {
    return (
      <section className={PANEL}>
        <h2 className={TITLE}>Server tools are off</h2>
        <p className="mt-2">
          They only answer on your own computer, with <code className="text-sky-200">GOMOKU_DEV_TOOLS=true</code> in <code>backend/.env</code> (restart
          the backend after adding it). Never set it where the site is hosted. The lab above works without them.
        </p>
      </section>
    )
  }

  const fun = (list) => (list ?? []).filter((match) => match.forFun)
  const sent = fun(lobby.data?.outgoing)
  const games = fun(lobby.data?.games)
  const anyGames = lobby.data?.games ?? []
  const finished = (lobby.data?.recent ?? []).filter((match) => match.replay?.available)
  const opponent = (match) => match.players[1 - match.mySeat].username

  return (
    <section className={`${PANEL} flex flex-col gap-4`} aria-labelledby="server-heading">
      <h2 id="server-heading" className={TITLE}>
        Server tools (your computer only)
      </h2>
      <p>
        These act in your For Fun games only, never games for PP. The other member really is in the game, and sees it on their Notifications page,
        so try them with your own second account, or someone who knows. Games touched here don&apos;t tell followers how they ended.
      </p>

      <div>
        <h3 className="font-semibold text-white">Your For Fun challenges, waiting on them</h3>
        {sent.length === 0 ? (
          <p className="mt-1 text-white/50">None. Send one from Play For Fun → Play Online.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {sent.map((match) => (
              <li key={match._id} className="flex flex-wrap items-center justify-center gap-2">
                <span>vs {opponent(match)}</span>
                <button
                  type="button"
                  disabled={busy}
                  className={`${SMALL_BUTTON} bg-sky-400 text-ink`}
                  onClick={() => run(() => devAcceptAsThem(match._id), () => `Accepted as ${opponent(match)}: they move first.`)}
                >
                  Accept as them
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-white">Your games</h3>
        {anyGames.length === 0 ? (
          <p className="mt-1 text-white/50">None being played.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {anyGames.map((match) => {
              const theirTurn = match.current !== match.mySeat
              return (
                <li key={match._id} className="flex flex-wrap items-center justify-center gap-2">
                  <Link to={`/games/gomoku/${match._id}`} className="text-sky-200 underline underline-offset-4 hover:text-white">
                    vs {opponent(match)}, move {match.moveCount + 1}
                  </Link>
                  <span className="text-white/50">{match.forFun ? 'For Fun' : 'For PP'}</span>
                  {games.includes(match) && (
                    <button
                      type="button"
                      disabled={busy || !theirTurn}
                      title={theirTurn ? undefined : "It's your turn"}
                      className={`${SMALL_BUTTON} bg-sky-400 text-ink`}
                      onClick={() => run(() => devPlayTheirMove(match._id), (after) => (after.status === 'over' ? 'Played their move: game over.' : 'Played their move. Open the game to see it land.'))}
                    >
                      Play their move
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy || !match.moveCount}
                    className={`${SMALL_BUTTON} border border-sky-400/60 text-sky-100`}
                    onClick={() => run(() => devUnsee(match._id), () => 'The newest stone will land again when you open the game.')}
                  >
                    Land the newest stone again
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-white">Finished games with a replay</h3>
        {finished.length === 0 ? (
          <p className="mt-1 text-white/50">None. Replays are kept for a week after a game ends.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {finished.map((match) => (
              <li key={match._id} className="flex flex-wrap items-center justify-center gap-2">
                <Link to={`/games/gomoku/${match._id}`} className="text-sky-200 underline underline-offset-4 hover:text-white">
                  vs {opponent(match)}
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  className={`${SMALL_BUTTON} border border-sky-400/60 text-sky-100`}
                  onClick={() => run(() => devForgetReplay(match._id), () => 'Replay deleted, as it would be after a week. Only the final board is left.')}
                >
                  Delete the replay now
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-white">The shop</h3>
        <button
          type="button"
          disabled={busy}
          className={`${SMALL_BUTTON} mt-2 bg-sky-400 text-ink`}
          onClick={() =>
            run(devRefundShop, (result) => {
              walletChanged()
              return result.message
            })
          }
        >
          Undo my purchases (points back)
        </button>
      </div>

      {message && (
        <p role="status" className={message.error ? 'text-red-300' : 'text-emerald-300'}>
          {message.text}
        </p>
      )}
    </section>
  )
}

// /games/gomoku/dev: Infinite Gomoku's developer tool. The route only
// exists in the Vite dev server (App.jsx: import.meta.env.DEV), so a
// production build has no page here at all, and the server's half answers
// only on your own computer (backend/middleware/devTools.js).
export default function GomokuDev() {
  return (
    <GomokuPage back={BACK} wide subtitle="Developer tool: only while testing on your own computer.">
      <p className={`${CARD} text-sm text-white/70`}>
        The lab tries every piece, shockwave, board and grid with nothing bought. The server tools let you play a For Fun game on your own.
      </p>
      <Lab />
      <ServerTools />
    </GomokuPage>
  )
}
