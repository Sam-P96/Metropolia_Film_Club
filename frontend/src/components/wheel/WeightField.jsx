import { useState } from "react";

// A weight from 1 to `max`: − and + buttons, or type one in (it's sent when
// the box loses focus or on Enter).
export default function WeightField({ value, max, onChange, disabled = false, label }) {
  // What's being typed, until it's sent. null: show the weight itself.
  const [draft, setDraft] = useState(null);

  function send() {
    if (draft === null) return;
    const typed = Math.round(Number(draft));
    setDraft(null);
    if (!draft.trim() || !Number.isFinite(typed)) return;
    const weight = Math.min(max, Math.max(1, typed));
    if (weight !== value) onChange(weight);
  }

  const button = "flex h-8 w-7 items-center justify-center text-neutral-300 enabled:hover:text-white disabled:opacity-30";

  return (
    <div className="flex shrink-0 items-center rounded-lg border border-neutral-700">
      <button type="button" aria-label={`${label}: less`} disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} className={button}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        aria-label={label}
        value={draft ?? value}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={send}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="w-11 [appearance:textfield] bg-transparent text-center text-sm tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" aria-label={`${label}: more`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={button}>
        +
      </button>
    </div>
  );
}
