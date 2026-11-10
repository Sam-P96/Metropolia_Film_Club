import { haptic } from '../slots/feedback'

// Kino Farkle's haptics, through the Slot Machine's haptic() (which also
// ticks on iPhones, which have no vibration API). Patterns are [on, off,
// on, ...] in milliseconds. Your own turn buzzes firmly; the other side's
// (the bot, or another member) only lightly.
export const HAPTIC = {
  tap: 8, // tapping a die to pick it, or put it back
  roll: [12, 50, 10, 60, 12, 70, 10, 90, 14], // your dice rattling as they tumble
  land: 30, // your dice landing
  farkle: [80, 60, 160], // you Farkled: a heavy double thud
  bank: [20, 50, 35], // you banked
  hotDice: [25, 40, 25, 40, 25, 40, 60], // hot dice: all six again
  theirLand: 12, // their dice landing
  theirFarkle: [20, 60, 20], // they Farkled
  theirBank: 15, // they banked
  win: [120, 280, 120, 280, 120], // you won: 3 slow buzzes
  lose: 250, // you lost
}

const isNew = (before, after, start) => after.message?.startsWith(start) && before.message !== after.message

// Buzzes for whatever just happened at the table, going from `before` to
// `after` (the game as hooks/useServerFarkle.js shows it: index 0 is you).
// Works from what's on screen, so the other side's turns, played out roll
// by roll, buzz as they're shown.
export function feelChange(before, after) {
  if (!before || !after) return
  const mine = after.current === 0

  if (after.phase === 'over') {
    if (before.phase !== 'over') haptic(after.winner === 0 ? HAPTIC.win : HAPTIC.lose)
    return
  }
  if (after.tone === 'bad' && isNew(before, after, 'Farkle')) {
    haptic(mine ? HAPTIC.farkle : HAPTIC.theirFarkle)
    return
  }
  if (after.tone === 'good' && isNew(before, after, 'Hot dice')) {
    haptic(mine ? HAPTIC.hotDice : HAPTIC.theirLand)
    return
  }
  if (after.phase === 'banked' && before.phase !== 'banked') {
    haptic(mine ? HAPTIC.bank : HAPTIC.theirBank)
    return
  }
  if (after.phase === 'rolling' && before.phase !== 'rolling') {
    if (mine) haptic(HAPTIC.roll)
    return
  }
  if (before.phase === 'rolling' && after.phase !== 'rolling') haptic(mine ? HAPTIC.land : HAPTIC.theirLand)
}

export { haptic }
