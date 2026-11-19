// Infinity Stone names: holding an Infinity Stone in Steal and Defend gives
// the holder's name that stone's effect, everywhere a Black Market name
// style shows (frontend/src/components/stoneNames/). The look was made in
// shared/prototype/Infinity Stone Username Effects.html.
//
// A member can have several name effects to show: a stone for each stone
// they hold, and First Place while they hold a title with its effect on
// (shared/firstPlace/config.js). One shows at a time: the one they picked
// on their profile (`nameEffect` on their account), or, if they haven't
// picked one they still have, the first of the ones they have, in
// NAME_EFFECTS order. The server (backend/utils/firstPlace.js) and the
// pages both work it out with shownNameEffect, so they always agree.
// The ids never change once members have saved them.

export const STONE_NAMES = {
  space: { item: 'space-stone', name: 'Space Stone', short: 'Space', color: '#3b82f6', lore: 'The Tesseract' },
  mind: { item: 'mind-stone', name: 'Mind Stone', short: 'Mind', color: '#facc15', lore: 'The Scepter' },
  reality: { item: 'reality-stone', name: 'Reality Stone', short: 'Reality', color: '#ef4444', lore: 'The Aether' },
  power: { item: 'power-stone', name: 'Power Stone', short: 'Power', color: '#a855f7', lore: 'The Orb' },
  time: { item: 'time-stone', name: 'Time Stone', short: 'Time', color: '#22c55e', lore: 'The Eye of Agamotto' },
  soul: { item: 'soul-stone', name: 'Soul Stone', short: 'Soul', color: '#f97316', lore: 'Vormir' },
}

export const STONE_NAME_IDS = Object.keys(STONE_NAMES)

// The First Place effect, as one of the name effects to pick from.
export const FIRST_PLACE_EFFECT = 'firstPlace'

// Every name effect, in the order they're offered (and the first one held
// is shown when nothing else has been picked).
export const NAME_EFFECTS = [FIRST_PLACE_EFFECT, ...STONE_NAME_IDS]

// A Steal and Defend item key ('space-stone') -> its stone ('space'), or
// null for anything that isn't a stone.
export function stoneOfItem(key) {
  return STONE_NAME_IDS.find((id) => STONE_NAMES[id].item === key) ?? null
}

// The name effects a member can show: First Place if `firstPlace` (they
// hold a title and have its effect on), then each stone in `stones` (the
// stone ids they hold), in NAME_EFFECTS order.
export function nameEffectOptions({ stones = [], firstPlace = false } = {}) {
  return NAME_EFFECTS.filter((id) => (id === FIRST_PLACE_EFFECT ? firstPlace : stones.includes(id)))
}

// The one name effect that shows: `chosen` (what they picked) if they can
// still show it, otherwise the first they can. null: none, so their Black
// Market name style (or plain name) shows.
export function shownNameEffect({ stones = [], firstPlace = false, chosen = null } = {}) {
  const options = nameEffectOptions({ stones, firstPlace })
  return options.includes(chosen) ? chosen : (options[0] ?? null)
}

export const isNameEffect = (id) => typeof id === 'string' && NAME_EFFECTS.includes(id)
