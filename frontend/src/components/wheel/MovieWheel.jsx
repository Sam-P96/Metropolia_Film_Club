import { useState } from "react";
import ClubWheel from "./ClubWheel";
import LocalWheel from "./LocalWheel";

const WHEELS = [
  { id: "local", label: "Wheel Local", about: "Your own wheel, kept on this device. Nobody else sees it." },
  { id: "club", label: "Club Wheel", about: "The club's wheel: everyone sees the same films. Moderators and admins look after it." },
];

// The Club Events page's wheels: Wheel Local (the one it opens on) and the
// Club Wheel.
export default function MovieWheel({ title, description, isAuthenticated }) {
  const [shown, setShown] = useState("local");
  const wheel = WHEELS.find((w) => w.id === shown);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-3xl font-bold">{title}</h2>
      <p className="mt-1 text-neutral-400">{description}</p>

      <div role="group" aria-label="Which wheel" className="mt-6 inline-flex rounded-full bg-neutral-900 p-1 ring-1 ring-neutral-700">
        {WHEELS.map((w) => (
          <button
            key={w.id}
            type="button"
            aria-pressed={shown === w.id}
            onClick={() => setShown(w.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              shown === w.id ? "bg-amber-300 text-neutral-900" : "text-neutral-300 hover:text-white"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-neutral-400">{wheel.about}</p>

      {shown === "local" ? <LocalWheel /> : <ClubWheel isAuthenticated={isAuthenticated} />}
    </div>
  );
}
