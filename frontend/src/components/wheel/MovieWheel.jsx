import { useCallback, useEffect, useRef, useState } from "react";
import Confetti from "./Confetti";
import WheelSvg, { sliceColor } from "./WheelSvg";

const SPIN_MS = 5500;

export default function MovieWheel({
  endpoint = "/api/wheel",
  title: heading = "Movie wheel",
  description = "Add the films you'd like to watch. When we're ready, spin the wheel and wherever it lands is what we watch.",
}) {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const spinTimer = useRef(null);

  const api = useCallback(
    async (options = {}) => {
      const res = await fetch(endpoint, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      return data;
    },
    [endpoint]
  );

  const load = useCallback(async () => {
    try {
      const data = await api();
      setItems(data.entries);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
    return () => clearTimeout(spinTimer.current);
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api({ method: "POST", body: JSON.stringify({ title }) });
      setTitle("");
      setWinner(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSpin() {
    if (spinning || items.length < 2) return;
    setError("");
    setWinner(null);

    const idx = Math.floor(Math.random() * items.length);
    const seg = 360 / items.length;
    // land somewhere inside the winning slice, not always dead centre
    const jitter = (Math.random() - 0.5) * seg * 0.7;
    const targetMod = (360 - ((idx + 0.5) * seg + jitter) + 360) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = (targetMod - currentMod + 360) % 360;

    setSpinning(true);
    setRotation(rotation + 360 * 6 + delta);

    spinTimer.current = setTimeout(() => {
      setSpinning(false);
      setWinner(items[idx]);
      setConfettiKey((k) => k + 1);
    }, SPIN_MS + 100);
  }

  async function handleClear() {
    if (!window.confirm("Clear every movie from the wheel and start a new round?")) return;
    try {
      await api({ method: "DELETE" });
      setWinner(null);
      setRotation(0);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="p-8 text-center">Loading the wheel…</p>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Confetti fire={confettiKey} />
      <h1 className="text-3xl font-bold">{heading}</h1>
      <p className="mt-1 text-neutral-400">{description}</p>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <section>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-600 p-10 text-center text-neutral-400">
              The wheel is empty. Add the first movie!
            </div>
          ) : (
            <WheelSvg items={items} rotation={rotation} spinning={spinning} spinMs={SPIN_MS} />
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
              <p className="mt-2 text-sm text-neutral-400">Add at least 2 movies to spin.</p>
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
          <form onSubmit={handleSubmit} className="flex gap-2">
            <label htmlFor="movie-title" className="sr-only">
              Movie title
            </label>
            <input
              id="movie-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              placeholder="Movie title"
              className="min-w-0 flex-1 rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2"
            />
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="rounded-lg bg-amber-300 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-40"
            >
              Add to wheel
            </button>
          </form>

          {error && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">On the wheel ({items.length})</h2>
            {items.length > 0 && (
              <button onClick={handleClear} className="text-sm text-neutral-400 underline hover:text-neutral-200">
                Clear wheel
              </button>
            )}
          </div>
          <ul className="mt-2 divide-y divide-neutral-800">
            {items.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: sliceColor(i) }}
                  aria-hidden="true"
                />
                <span>{s.title}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}