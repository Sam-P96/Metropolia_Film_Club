import { useState } from "react";
import WheelBoard from "./WheelBoard";
import { LOCAL_MAX_ENTRIES, LOCAL_MAX_WEIGHT, loadLocalWheel, newItemId, saveLocalWheel } from "./localWheelStore";

// Local Wheel: a wheel of your own, kept on this device. Nobody else sees it.
export default function LocalWheel() {
  const [items, setItems] = useState(loadLocalWheel);
  const [error, setError] = useState("");

  function update(next) {
    setError("");
    setItems(next);
    saveLocalWheel(next);
    return true;
  }

  function add(title, weight) {
    if (items.some((item) => item.title.toLowerCase() === title.toLowerCase())) {
      setError("That movie is already on the wheel. Change its weight instead.");
      return false;
    }
    if (items.length >= LOCAL_MAX_ENTRIES) {
      setError("The wheel is full.");
      return false;
    }
    return update([...items, { id: newItemId(), title, weight }]);
  }

  return (
    <WheelBoard
      items={items}
      error={error}
      canAdd
      canEdit
      maxWeight={LOCAL_MAX_WEIGHT}
      onAdd={add}
      onWeight={(item, weight) => update(items.map((it) => (it.id === item.id ? { ...it, weight } : it)))}
      onRemove={(item) => update(items.filter((it) => it.id !== item.id))}
      onClear={() => update([])}
      clearPrompt="Clear every movie from your wheel?"
    />
  );
}
