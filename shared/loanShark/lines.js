// Loan Shark: everything King Loan Shark and Kaveri say, in this
// one file, so the lines can be changed without touching the code. The
// page (frontend/src/pages/LoanShark.jsx) and the server
// (backend/utils/loanShark/) both read it.
//
// Adding or removing lines is fine. Kaveri's notifications store which
// line they were sent with, so after removing some, older ones may show a
// different line.

// What King Loan Shark says in his speech bubble, by the member's
// situation. A new line each time the page opens, never the same one twice
// in a row.
export const SHARK_LINES = {
  // No shark debt.
  clear: [
    "Ah, a fresh face. Everybody needs a little help sometimes. I'm a helper.",
    'My door is always open. Mostly because I ate it.',
    "Money's tight? I've got money. I've got so much money. Look at it.",
    "No debt? A clean slate. How boring. Let's fix that.",
    'Welcome to my office. Mind the teeth.',
  ],
  // In debt, and the next 12:00 check is covered (or isn't due yet).
  covered: [
    'Paid ahead. I like that. Responsible. Almost suspicious.',
    "You're good for now, minnow. Enjoy the quiet.",
    "Relax. Nobody's getting bitten today.",
    'See? This is what a healthy relationship looks like.',
  ],
  // In debt, and the next 12:00 check isn't covered.
  due: [
    "Payment's due by noon. I'm sure you remember. I'd hate to remind you in person.",
    'Just a friendly reminder. Emphasis on friendly. For now.',
    "Tick tock. I'm a shark, I don't own a clock. But Kaveri does.",
    'I believe in you. I also believe in consequences.',
  ],
  // Missed a payment: the rate is above where it started, below the top.
  missed: [
    "You missed a payment. That's fine. I'm fine. Your interest rate isn't fine.",
    'I waited by the phone all day. You never called. The rate doubled out of sadness.',
    'Forgetting is human. Doubling is shark.',
    "I'm not angry. I'm just disappointed. And also angry.",
  ],
  // The rate is at the top, and Kaveri is collecting.
  collector: [
    "160%. You've reached the top. Unfortunately, so has my patience.",
    "I sent Kaveri. He's small. He's fluffy. You should be terrified.",
    "Every day at noon, a little bunny takes a little money. Until it's done.",
    'We had something special. Now we have a collections arrangement.',
  ],
}

// The warning strip under the stats when a payment is due, was missed, or
// Kaveri is collecting: one of these at random.
export const WARNING_LINES = [
  'There will be consequences.',
  'There will be consequences. Tasteful ones. Like a fine wine.',
  'There will be consequences. Not big ones. Medium ones. Okay, big ones.',
  "King Loan Shark never forgets. He has a notebook. It's very wet.",
  'Pay on time, or the bunny comes.',
]

// Kaveri's notification each day he collects. {amount} is the
// PP he took, {left} what's still owed. Never the same line two days in a
// row.
export const COLLECTOR_LINES = [
  'Kaveri arrived and took {amount} PP. You still owe {left}.',
  'Kaveri knocked once. The door is gone now. So is {amount} PP.',
  "Kaveri didn't say a word. He just held out his paw. You gave him {amount} PP.",
  'Kaveri found your wallet behind the couch. {amount} PP collected. {left} to go.',
  'Kaveri asked nicely. That was the scariest part. {amount} PP taken.',
  "Kaveri threw a vending machine through your window. Inside was a note: \"{amount} PP. Thanks.\"",
  'Kaveri is sitting on your bed, eating your popcorn. He took {amount} PP on the way in.',
  'Kaveri says King Loan Shark sends his regards. {amount} PP collected.',
  "Kaveri took {amount} PP and left a carrot on your pillow. You don't know what it means.",
  "Kaveri was here. You know because {amount} PP isn't.",
  'Kaveri cracked his knuckles. All four of them. {amount} PP gone. {left} left.',
  "Kaveri paused your movie at the best part. {amount} PP taken. He'll be back tomorrow.",
]

// Instead of a line above, the day Kaveri takes the last of it.
export const COLLECTOR_CLEARED_LINE =
  'Kaveri took the last {amount} PP, tipped his hat, and hopped away. Your debt to King Loan Shark is cleared… for now.'

// A line with {amount} and {left} filled in.
export function fillLine(line, { amount = 0, left = 0 } = {}) {
  return line.replaceAll('{amount}', amount.toLocaleString('en-US')).replaceAll('{left}', left.toLocaleString('en-US'))
}

// A random index into a list of `count` lines that isn't `last` (when
// there's more than one to pick from). `random` gives 0 to 1, for tests.
export function pickLine(count, last = null, random = Math.random) {
  if (count <= 1) return 0
  const options = [...Array(count).keys()].filter((index) => index !== last)
  return options[Math.floor(random() * options.length)]
}
