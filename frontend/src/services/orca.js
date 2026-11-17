import { api } from './api'

// Lord Gang Orca (backend/routes/orcaRouter.js). Every answer that has
// something to say comes with `steps`: what to show, in order
// ({ type: 'narration' | 'bubble', speaker?, text }).

// His page: { open, speaker, story, steps, news, names, reviews, begAmount,
// begs: { used, perDay }, cooldownUntil, nextOpening, question, favour:
// { on, done, needed, jobs, jobTexts, refreshAt } }.
export function getOrca() {
  return api('/orca')
}

// The Games page's box: { open, begs, cooldownUntil, favour }.
export function getOrcaSummary() {
  return api('/orca/summary')
}

// Ask the boss: { steps, paid?, question?, cooldownUntil? }.
export function begOrca() {
  return api('/orca/beg', { method: 'POST' })
}

// The answer to his question (the option's text): { steps, paid, right }.
export function answerOrca(option) {
  return api('/orca/answer', { method: 'POST', body: { option } })
}
