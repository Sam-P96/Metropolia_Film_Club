// Who can bounce in Forrest Bounce: the frog and the rabbit, which everyone
// has, and any animal (or animal's head) a member bought as a piece in the
// Infinite Gomoku shop (shared/gomoku/catalogue.js). Read by the server
// (backend/utils/forrest.js) to check a choice, and the page to offer it.

import { ALL_ITEMS } from '../gomoku/catalogue.js'
import { DEFAULT_BUDDIES } from './rules.js'

// Every animal emoji, and animal faces (the cat faces count). Compared
// without the "show as emoji" mark (U+FE0F), so 🕷️ and 🕷 are the same.
const ANIMALS = new Set(
  [
    '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🐈‍⬛', '🦁', '🐯', '🐅', '🐆',
    '🐴', '🫎', '🫏', '🐎', '🦄', '🦓', '🦌', '🦬', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪',
    '🐫', '🦙', '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿', '🦫', '🦔', '🦇', '🐻', '🐻‍❄️',
    '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊', '🦅', '🦆', '🦢', '🦉',
    '🦤', '🪶', '🦩', '🦚', '🦜', '🪽', '🐦‍⬛', '🪿', '🐦‍🔥', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳',
    '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🪼', '🦀', '🦞', '🦐', '🦑', '🦪', '🐌', '🦋', '🐛', '🐜', '🐝',
    '🪲', '🐞', '🦗', '🪳', '🕷', '🦂', '🦟', '🪰', '🪱', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈',
    '🙉', '🙊',
  ].map((emoji) => emoji.replace(/️/g, ''))
)

export const isAnimal = (emoji) => typeof emoji === 'string' && ANIMALS.has(emoji.replace(/️/g, ''))

const DEFAULT_NAMES = { '🐸': 'Frog', '🐰': 'Rabbit' }

// The buddies a member can choose from, given the Gomoku shop ids they own:
// [{ emoji, name, from: 'default' | 'gomoku' }], the defaults first.
export function buddyChoices(ownedIds = []) {
  const owned = new Set(ownedIds)
  const choices = DEFAULT_BUDDIES.map((emoji) => ({ emoji, name: DEFAULT_NAMES[emoji], from: 'default' }))
  for (const item of ALL_ITEMS) {
    if (item.kind !== 'piece' || item.look?.type !== 'emoji' || !owned.has(item.id) || !isAnimal(item.look.emoji)) continue
    if (choices.some((choice) => choice.emoji === item.look.emoji)) continue
    choices.push({ emoji: item.look.emoji, name: item.name, from: 'gomoku' })
  }
  return choices
}
