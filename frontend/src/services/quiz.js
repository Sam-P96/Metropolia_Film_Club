import { api } from './api'

// The Daily Quiz (backend/routes/quizRouter.js).

// Today's quiz and this week: { day, total, timerSeconds, countdownSeconds,
// attempt, played, week: { start, drawAt, prize, myPoints, totalPoints,
// players }, lastDraw, canManage }.
export function getQuizState() {
  return api('/quiz')
}

// Play (or carry on), and answer. Each resolves to the question they're on,
// { done: false, index, total, question: { prompt, options }, secondsLeft },
// or the score, { done: true, total, result: { correct, total, points } }.
export function startQuiz() {
  return api('/quiz/start', { method: 'POST' })
}

export function answerQuiz(index, choice) {
  return api('/quiz/answer', { method: 'POST', body: { index, choice } })
}

// This week's Quiz Leaderboard: { entries: [{ user, points, share }], total,
// prize, drawAt }.
export function getQuizLeaderboard() {
  return api('/quiz/leaderboard')
}

// ---- Moderators and admins: the queue of questions they write. Each
// resolves to { questions } (the queue as it now is), and more.

export function getQuizQueue() {
  return api('/quiz/questions')
}

// { text, answers: [4], correct: 0 to 3 }
export function addQuizQuestion(question) {
  return api('/quiz/questions', { method: 'POST', body: question })
}

// The bulk JSON: [{ question, answers: [4], correct: 1 to 4 }].
export function addQuizQuestions(list) {
  return api('/quiz/questions/bulk', { method: 'POST', body: list })
}

export function editQuizQuestion(id, question) {
  return api(`/quiz/questions/${id}`, { method: 'PUT', body: question })
}

// 1 is next; past the end is the end.
export function moveQuizQuestion(id, position) {
  return api(`/quiz/questions/${id}/move`, { method: 'POST', body: { position } })
}

// The whole queue in a random order.
export function shuffleQuizQuestions() {
  return api('/quiz/questions/shuffle', { method: 'POST' })
}

export function deleteQuizQuestion(id) {
  return api(`/quiz/questions/${id}`, { method: 'DELETE' })
}
