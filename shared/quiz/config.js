// The Daily Quiz's numbers, for the server (backend/utils/quiz.js) and the
// pages (frontend/src/components/quiz/). Change them here.
//
// Every day there's one quiz, the same for everyone: QUIZ.questions
// multiple-choice film questions. A new one comes at 12:00 (Helsinki),
// lunch time, and each member can play each one once. Playing earns a quiz
// point, and each right answer another. Every Monday at 12:00 one member
// is drawn to win the prize, each point being one ticket, and everyone's
// points go back to 0. Whoever played all 7 of that week's quizzes (a 7 day
// streak) gets a bonus too.

export const QUIZ = {
  name: 'Daily Quiz',
  questions: 5,

  // Seconds to get ready after pressing Play, and to answer each question.
  countdownSeconds: 3,
  timerSeconds: 15,
  // How late an answer can arrive and still count, for the trip from the
  // page to the server.
  graceMs: 1500,

  // Each question has this chance of being the next one in the queue of
  // questions moderators and admins have written, if there is one, instead
  // of a film question made up from the club's films.
  customChance: 0.5,

  // Quiz points: one for playing, one more for each right answer.
  points: { played: 1, perCorrect: 1 },

  // A new quiz every day at this hour, Helsinki time.
  zone: 'Europe/Helsinki',
  dayStartHour: 12,

  // The weekly draw: Monday (1) at 12:00. The prize is the bigger of `min`
  // and `richestPercent`% of the richest member's points (PP and P-PP
  // together), paid in P-PP.
  draw: { weekday: 1, hour: 12 },
  prize: { min: 1000, richestPercent: 20 },

  // At the draw, everyone who played every one of the week's `days`
  // quizzes gets `bonus` P-PP.
  streak: { days: 7, bonus: 500 },

  // Questions written by moderators and admins.
  custom: { maxQuestion: 300, maxAnswer: 120 },
}

// This week's prize, for the richest member holding `richest` points.
export function quizPrize(richest) {
  return Math.max(QUIZ.prize.min, Math.floor((Math.max(0, richest) * QUIZ.prize.richestPercent) / 100))
}

// What a correct answer looks like in the bulk upload: 1 to 4, the place
// of the right one among `answers`.
export const BULK_TEMPLATE = [
  {
    question: 'Who directed Jaws (1975)?',
    answers: ['Steven Spielberg', 'George Lucas', 'Martin Scorsese', 'Ridley Scott'],
    correct: 1,
  },
  {
    question: 'Which film won the first Academy Award for Best Picture?',
    answers: ['Sunrise', 'Wings', 'The Jazz Singer', 'Metropolis'],
    correct: 2,
  },
]
