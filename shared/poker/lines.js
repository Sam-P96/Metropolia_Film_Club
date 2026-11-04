// What the Kino Poker bots say, in speech bubbles by their seats. Edit
// freely: each event is a list, and one line is picked at random each time.
// Keep lines short, so a bubble fits on a phone.
//
//   check, call, bet, raise, fold, allIn   their own actions
//   draw       they swap some cards          standPat  they keep all 5
//   win        they win a pot                lose      they lose a showdown
//   leave      they give up their seat for a new member
//   stay       they stay when a new member sits down
//   join       they come back to fill the table
//   start      the first hand after the table opens: every bot says hello
//
// How often each is said is in ./config.js (POKER.speech.chance).
export const LINES = {
  shark: {
    check: ["I'll let you sweat a little longer.", 'Take your time. I charge by the minute.'],
    call: ['Fine. Interest is accruing.', "I'll match it. You'll pay me back."],
    bet: ["Let's make this interesting.", "Everybody pays. That's the rule."],
    raise: ['Higher! I love it when you panic.', 'Raise! Your debt just doubled.'],
    fold: ['Keep it. Consider it a loan.', "Take it. I'll collect later."],
    allIn: ['EVERYTHING! Chaos is good for business!', 'ALL OF IT! Who needs savings?'],
    draw: ['Fresh cards, fresh trouble.', 'New paper. Same shark.'],
    standPat: ["I don't need cards. I need victims.", "Keep your deck. I'm already dangerous."],
    win: ['Pay up. With interest.', 'Thank you for your business.'],
    lose: ['Enjoy it. I know where you live.', "Lucky. Luck isn't collateral."],
    leave: ["Collections calls. Don't spend it all.", 'Business calls. Keep my seat warm.'],
    stay: ['Fresh fish! Welcome to my waters.', 'A new customer! Have a seat.'],
    join: ['Miss me? The interest did.', "I'm back. Who owes me?"],
    start: ["Welcome to my table. Everything here has a price.", "Sit down, sit down. The meter's running."],
  },
  kaveri: {
    check: ['Check! No spoilers yet!', 'Check! Waiting for the twist.'],
    call: ["I'm in! Popcorn's on me!", 'Calling! Grab a seat!'],
    bet: ["Ooh, I've got a good feeling!", 'A little bet for the opening scene!'],
    raise: ['Plot twist! I raise!', 'Sequel time! Raising!'],
    fold: ["Not my movie. I'll just watch!", "I'll sit this scene out!"],
    allIn: ['Big finale! All my carrots!', 'Director\'s cut! Everything in!'],
    draw: ['Recasting a few roles!', 'A few reshoots, coming up!'],
    standPat: ['This cast is perfect!', 'No reshoots needed!'],
    win: ['Roll credits! What a show!', 'Two thumbs and two ears up!'],
    lose: ['Aww. Good game, friend!', 'What a plot! You earned it!'],
    leave: ["Take my seat! I'll grab snacks!", 'Your turn on screen! Snack break!'],
    stay: ['Hi hi! A new kaveri!', 'Welcome to the club, friend!'],
    join: ["I'm back with snacks!", 'Room for one more bunny?'],
    start: ["Lights down! The show's starting!", 'Hi everyone! Good luck, have fun!'],
  },
  maverick: {
    check: ['Patience pays. Usually.', "I'll wait and see."],
    call: ["I'll see that. Out of curiosity.", 'Call. Let\'s see where this goes.'],
    bet: ['A modest wager. Nothing more.', 'Just a little something.'],
    raise: ['Shall we raise the stakes?', 'Let\'s make it worth our while.'],
    fold: ['Live to play another hand.', 'Not this time, friends.'],
    allIn: ['Sometimes you trust the cards.', 'All in. Fortune favours the bold.'],
    draw: ['Just a small adjustment.', 'A touch of refinement.'],
    standPat: ["I'm happy with what I've got.", "I'll play these, thank you."],
    win: ['Never doubted it. Mostly.', 'A pleasure doing business.'],
    lose: ['Well. That was educational.', 'Well played. I tip my hat.'],
    leave: ['A gentleman knows when to leave.', 'The table is yours, friend.'],
    stay: ['Pull up a chair. Bring your wallet.', 'Welcome. Mind the shark.'],
    join: ['Room for a gambling man?', 'Deal me back in, gentlemen.'],
    start: ["Evening, all. Let's play some cards.", 'Ladies, gentlemen. Shall we begin?'],
  },
}
