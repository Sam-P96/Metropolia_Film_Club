import { useEffect, useRef, useState } from "react";
import Confetti from "./Confetti";
import WeightField from "./WeightField";
import WheelSvg from "./WheelSvg";
import { sliceColor } from "./wheelColors";
import { chanceOf, pickSlice, weightOf, wheelSlices } from "./wheelSlices";

const SPIN_MS = 5500;

// One wheel: the wheel and its spin button, the add form and the list of
// films. Local Wheel and the Club Wheel (MovieWheel.jsx) both use it, and
// say what this person may do.
//
// onAdd(title, weight), onWeight(item, weight), onRemove(item) and onClear()
// say whether it worked (or a promise of that); the wheel shows `error`.
export default function WheelBoard({
  items,
  error,
  busy = false,
  canAdd,
  canEdit,
  maxWeight,
  // The most weight they can add right now (0: none left).
  addWeightMax = maxWeight,
  // A line under the add form, or in its place when they can't add.
  addNote = null,
  onAdd,
  onWeight,
  onRemove,
  onClear,
  clearPrompt,
  children,
}) {
  const [title, setTitle] = useState("");
  const [addWeight, setAddWeight] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const [rotation, setRotation] = useState(0);
  // While it spins: the films as they were when it was spun, so a change
  // from someone else doesn't move the slices under the pointer.
  const [spin, setSpin] = useState(null);
  const [winner, setWinner] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const spinTimer = useRef(null);

  useEffect(() => () => clearTimeout(spinTimer.current), []);

  const spinning = spin !== null;
  const shown = spin ?? items;
  const outOfWeight = canAdd && addWeightMax < 1;

  async function handleSubmit(e) {
    e.preventDefault();
    const weight = Math.min(addWeightMax, Math.max(1, Math.round(Number(addWeight)) || 1));
    setSubmitting(true);
    const added = await onAdd(title.trim(), weight);
    setSubmitting(false);
    if (added) {
      setTitle("");
      setAddWeight("1");
      setWinner(null);
    }
  }

  function handleSpin() {
    if (spinning || items.length < 2) return;
    setWinner(null);

    const idx = pickSlice(items);
    const { start, size } = wheelSlices(items)[idx];
    // land somewhere inside the winning slice, not always dead centre
    const jitter = (Math.random() - 0.5) * size * 0.7;
    const targetMod = (360 - (start + size / 2 + jitter) + 360) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = (targetMod - currentMod + 360) % 360;

    const spunItems = items;
    setSpin(spunItems);
    setRotation(rotation + 360 * 6 + delta);

    spinTimer.current = setTimeout(() => {
      setSpin(null);
      setWinner(spunItems[idx]);
      setConfettiKey((k) => k + 1);
    }, SPIN_MS + 100);
  }

  async function handleClear() {
    if (!window.confirm(clearPrompt)) return;
    if (await onClear()) {
      setWinner(null);
      setRotation(0);
    }
  }

  return (
    // grid-cols-1: one column on phones that a long (cut short) title
    // can't stretch past the screen.
    <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-2">
      <Confetti fire={confettiKey} />
      <section>
        {shown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-600 p-10 text-center text-neutral-400">
            The wheel is empty.{canAdd && " Add the first movie!"}
          </div>
        ) : (
          <WheelSvg items={shown} rotation={rotation} spinning={spinning} spinMs={SPIN_MS} />
        )}

        <div className="mt-6 text-center">
          <button
            onClick={handleSpin}
            disabled={spinning || items.length < 2}
            className="rounded-full bg-amber-300 px-8 py-3 font-semibold text-neutral-900 transition enabled:hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {spinning ? "Spinning…" : "Spin the wheel"}
          </button>
          {items.length < 2 && (
            <p className="mt-2 text-sm text-neutral-400">It needs at least 2 movies to spin.</p>
          )}
        </div>

        {winner && !spinning && (
          <div className="mt-6 rounded-xl bg-amber-300/10 p-5 text-center ring-1 ring-amber-300/40" role="status">
            <p className="text-sm text-neutral-300">We're watching</p>
            <p className="mt-1 text-2xl font-bold text-amber-300">{winner.title}</p>
          </div>
        )}
      </section>

      <section>
        {canAdd && (
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
            <label htmlFor="movie-title" className="sr-only">
              Movie title
            </label>
            <input
              id="movie-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              disabled={outOfWeight}
              placeholder="Movie title"
              className="min-w-0 flex-1 basis-40 rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 disabled:opacity-50"
            />
            {addWeightMax > 1 && (
              <label className="flex items-center gap-2 text-sm text-neutral-400">
                Weight
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={addWeightMax}
                  value={addWeight}
                  onChange={(e) => setAddWeight(e.target.value)}
                  className="w-16 rounded-lg border border-neutral-600 bg-neutral-900 px-2 py-2 text-center text-white tabular-nums"
                />
              </label>
            )}
            <button
              type="submit"
              disabled={submitting || busy || outOfWeight || !title.trim()}
              className="rounded-lg bg-amber-300 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-40"
            >
              Add to wheel
            </button>
          </form>
        )}
        {addNote && <p className={`text-sm text-neutral-400 ${canAdd ? "mt-2" : ""}`}>{addNote}</p>}

        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-baseline justify-between">
          <h3 className="text-lg font-semibold">On the wheel ({items.length})</h3>
          {canEdit && items.length > 0 && (
            <button onClick={handleClear} disabled={busy || spinning} className="text-sm text-neutral-400 underline hover:text-neutral-200 disabled:opacity-40">
              Clear wheel
            </button>
          )}
        </div>
        <ul className="mt-2 divide-y divide-neutral-800">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-3 py-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: sliceColor(i) }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate" title={item.title}>
                {item.title}
              </span>
              <span className="shrink-0 text-xs text-neutral-500 tabular-nums" title="Chance of landing on it">
                {chanceOf(item, items)}
              </span>
              {canEdit ? (
                <>
                  <WeightField
                    value={weightOf(item)}
                    max={maxWeight}
                    disabled={busy || spinning}
                    onChange={(weight) => onWeight(item, weight)}
                    label={`Weight of ${item.title}`}
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    disabled={busy || spinning}
                    aria-label={`Remove ${item.title}`}
                    title="Remove"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-neutral-500 enabled:hover:bg-red-500/15 enabled:hover:text-red-300 disabled:opacity-30"
                  >
                    ×
                  </button>
                </>
              ) : (
                <span className="shrink-0 text-sm text-neutral-400 tabular-nums" title="Weight">
                  ×{weightOf(item)}
                </span>
              )}
            </li>
          ))}
        </ul>

        {children}
      </section>
    </div>
  );
}
