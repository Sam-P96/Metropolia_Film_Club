import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useApi from "../../hooks/useApi";
import {
  addToClubWheel,
  clearClubWheel,
  getClubWheel,
  removeFromClubWheel,
  setClubWheelSettings,
  setClubWheelWeight,
} from "../../services/wheel";
import WeightField from "./WeightField";
import WheelActivity from "./WheelActivity";
import WheelBoard from "./WheelBoard";

// How often it checks for everyone else's changes while the page is open.
const POLL_MS = 30 * 1000;

// What the add form says: how much weight they have left, or why they
// can't add.
function addNote(wheel, isAuthenticated) {
  const { you, open, memberWeight } = wheel;
  if (you.canEdit) return null;
  if (!open) return "Only moderators and admins add films right now.";
  if (!isAuthenticated) return <><Link to="/login" className="text-amber-300 underline">Log in</Link> to add films.</>;
  if (you.weightLeft === null) return null;
  if (you.weightLeft === 0) return `You've added all your weight (${memberWeight}). It comes back when your films come off the wheel.`;
  return `You can add ${you.weightLeft} more weight, to one film or spread over several.`;
}

// Admins: open the wheel to members, and how much weight each can add.
function MemberSettings({ wheel, busy, onChange }) {
  const unlimited = wheel.memberWeight === null;

  return (
    <div className="mt-8 rounded-xl border border-neutral-700 p-4">
      <h3 className="text-sm font-semibold text-neutral-300">Admin: members</h3>
      <label className="mt-3 flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={wheel.open}
          disabled={busy}
          onChange={(e) => onChange({ open: e.target.checked })}
          className="h-4 w-4 accent-amber-300"
        />
        Every member can add films
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span>Weight each member can add</span>
        {!unlimited && (
          <WeightField
            value={wheel.memberWeight}
            max={wheel.maxWeight}
            disabled={busy}
            onChange={(memberWeight) => onChange({ memberWeight })}
            label="Weight each member can add"
          />
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={unlimited}
            disabled={busy}
            onChange={(e) => onChange({ memberWeight: e.target.checked ? null : 1 })}
            className="h-4 w-4 accent-amber-300"
          />
          No limit
        </label>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        In all, over one film or several. Moderators and admins have no limit.
      </p>
    </div>
  );
}

// The Club Wheel: the same for everyone. Moderators and admins look after
// it; an admin can open it so every member can add films too.
export default function ClubWheel({ isAuthenticated }) {
  const { data: wheel, error: loadError, loading, setData } = useApi(getClubWheel, [isAuthenticated]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Keep up with everyone else. A failed check changes nothing.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) getClubWheel().then(setData, () => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [setData]);

  // Each change answers with the whole wheel.
  async function send(request) {
    setError("");
    setBusy(true);
    try {
      setData(await request());
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="p-8 text-center text-neutral-400">Loading the Club Wheel…</p>;
  if (!wheel) {
    return (
      <p className="p-8 text-center text-red-400" role="alert">
        {loadError?.message ?? "Couldn't load the Club Wheel."}
      </p>
    );
  }

  const { you } = wheel;

  return (
    <>
      <WheelBoard
        items={wheel.entries}
        error={error}
        busy={busy}
        canAdd={you.canAdd}
        canEdit={you.canEdit}
        maxWeight={wheel.maxWeight}
        addWeightMax={you.weightLeft ?? wheel.maxWeight}
        addNote={addNote(wheel, isAuthenticated)}
        onAdd={(title, weight) => send(() => addToClubWheel(title, weight))}
        onWeight={(item, weight) => send(() => setClubWheelWeight(item.id, weight))}
        onRemove={(item) => send(() => removeFromClubWheel(item.id))}
        onClear={() => send(clearClubWheel)}
        clearPrompt="Clear every movie from the Club Wheel and start a new round? Everyone will see it."
      >
        {you.canManage && <MemberSettings wheel={wheel} busy={busy} onChange={(changes) => send(() => setClubWheelSettings(changes))} />}
      </WheelBoard>

      <WheelActivity activity={wheel.activity} />
    </>
  );
}
