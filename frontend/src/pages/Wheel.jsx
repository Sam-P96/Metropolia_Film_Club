import { useCallback, useEffect, useRef, useState } from "react";

// Confetti (no dependencies)
const CONFETTI_COLORS = ["#fcd34d", "#f87171", "#60a5fa", "#4ade80", "#c084fc", "#ffffff"];

// Pass a number that goes up each time you want a burst (0 = nothing).
function Confetti({ fire }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const pieces = Array.from({ length: 180 }, (_, i) => {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 16,
        vy: -4 - Math.random() * 12,
        size: 15 + Math.random() * 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.4,
      };
    });

    let frame;
    const start = performance.now();

    const tick = (now) => {
      ctx.clearRect(0, 0, w, h);
      let alive = false;

      for (const p of pieces) {
        p.vy += 0.35; // gravity
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < h + 20) alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      if (alive && now - start < 6000) {
        frame = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);
    };
  }, [fire]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}

async function api(options = {}) {
  const res = await fetch("/api/wheel", {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

// Wheel geometry 
const SIZE = 400;
const C = SIZE / 2;
const R = C - 8;
const SPIN_MS = 5500;

// angle is degrees clockwise from the top, where the pointer sits
const point = (angle, radius = R) => {
  const rad = (angle * Math.PI) / 180;
  return [C + radius * Math.sin(rad), C - radius * Math.cos(rad)];
};

const slicePath = (i, seg) => {
  const [x1, y1] = point(i * seg);
  const [x2, y2] = point((i + 1) * seg);
  return `M${C},${C} L${x1},${y1} A${R},${R} 0 ${seg > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
};

const sliceColor = (i) => `hsl(${(i * 47) % 360} 55% ${i % 2 ? 42 : 34}%)`;
const clip = (s, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function WheelSvg({ items, rotation, spinning }) {
  const seg = 360 / items.length;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1" aria-hidden="true">
        <div className="h-0 w-0  border-x-14 border-t-26 border-x-transparent border-t-amber-300 drop-shadow" />
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Wheel with ${items.length} movies`}
        className="w-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.6, 0.1, 1)`
            : "none",
        }}
      >
        {items.length === 1 ? (
          <circle cx={C} cy={C} r={R} fill={sliceColor(0)} />
        ) : (
          items.map((item, i) => (
            <path key={item.id} d={slicePath(i, seg)} fill={sliceColor(i)} stroke="#0a0a0a" strokeWidth="2" />
          ))
        )}

        {items.map((item, i) => {
          const mid = items.length === 1 ? 0 : (i + 0.5) * seg;
          const [tx, ty] = point(mid, R - 14);
          return (
            <text
              key={item.id}
              x={tx}
              y={ty}
              fill="white"
              fontSize={items.length > 14 ? 10 : 13}
              fontWeight="600"
              textAnchor="end"
              dominantBaseline="middle"
              transform={`rotate(${mid - 90} ${tx} ${ty})`}
            >
              {clip(item.title)}
            </text>
          );
        })}

        <circle cx={C} cy={C} r="18" fill="#0a0a0a" stroke="#fcd34d" strokeWidth="3" />
      </svg>
    </div>
  );
}

export default function Wheel() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api();
      setItems(data.entries);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
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

    setTimeout(() => {
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
      <h1 className="text-3xl font-bold">Movie wheel</h1>
      <p className="mt-1 text-neutral-400">
        Add the films you'd like to watch. When we're ready, spin the wheel and
        wherever it lands is what we watch.
      </p>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <section>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-600 p-10 text-center text-neutral-400">
              The wheel is empty. Add the first movie!
            </div>
          ) : (
            <WheelSvg items={items} rotation={rotation} spinning={spinning} />
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