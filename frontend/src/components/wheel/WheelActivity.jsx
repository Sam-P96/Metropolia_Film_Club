import { useState } from "react";
import { timeAgo } from "../../utils/timeAgo";

// How many lines show before "Show more".
const SHOWN = 3;

function describe(a) {
  switch (a.action) {
    case "add":
      return `${a.user} added ${a.title}${a.weight > 1 ? ` (weight ${a.weight})` : ""}`;
    case "back":
      return `${a.user} added ${a.weight} weight to ${a.title}`;
    case "weight":
      return `${a.user} set ${a.title}'s weight to ${a.weight}`;
    case "remove":
      return `${a.user} removed ${a.title}`;
    case "clear":
      return `${a.user} cleared the wheel`;
    case "open":
      return `${a.user} opened the wheel to every member`;
    case "close":
      return `${a.user} closed the wheel to members`;
    case "memberWeight":
      return a.weight === null
        ? `${a.user} let each member add as much weight as they like`
        : `${a.user} let each member add ${a.weight} weight`;
    default:
      return `${a.user} changed the wheel`;
  }
}

// The Club Wheel's public activity: the latest 3, and the rest (up to the
// last 50) on "Show more".
export default function WheelActivity({ activity }) {
  const [expanded, setExpanded] = useState(false);
  const lines = expanded ? activity : activity.slice(0, SHOWN);

  return (
    <section className="mt-10 rounded-xl bg-list p-5 ring-1 ring-white/10" aria-labelledby="wheel-activity">
      <h3 id="wheel-activity" className="text-lg font-semibold">
        Wheel activity
      </h3>
      {activity.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">Nothing yet.</p>
      ) : (
        <ul className={`mt-2 divide-y divide-white/5 ${expanded ? "max-h-96 overflow-y-auto pr-1" : ""}`}>
          {lines.map((a) => (
            <li key={a.id} className="flex items-baseline justify-between gap-4 py-2 text-sm">
              <span className="min-w-0 break-words text-neutral-200">{describe(a)}</span>
              <time dateTime={a.at} className="shrink-0 text-xs text-neutral-500">
                {timeAgo(a.at)}
              </time>
            </li>
          ))}
        </ul>
      )}
      {activity.length > SHOWN && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="mt-3 text-sm text-amber-300 underline-offset-2 hover:underline"
        >
          {expanded ? "Show less" : `Show more (${activity.length - SHOWN})`}
        </button>
      )}
    </section>
  );
}
