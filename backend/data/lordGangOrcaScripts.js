// Every word Lord Gang Orca's feature says, in one place, to edit freely
// without touching the logic (utils/orca/, games/poker/table.js). Speakers:
//   orca      Lord Gang Orca
//   dolphine  Goon Dolphine, his enforcer
//   kaveri    Kaveri, the club's bunny
//   shark     King Loan Shark (at the poker table)
// Scripts are lists of steps, shown one after another:
//   { type: "narration", text }          plain text on the page
//   { type: "bubble", speaker, text }    a speech bubble with their picture
// In any text, *like this* shows in italics.
//
// The question answers live here too, but only the server reads this file:
// the page is only ever sent a question and its options, never which is
// right.

const narration = (text) => ({ type: "narration", text });
const say = (speaker) => (text) => ({ type: "bubble", speaker, text });
const dolphine = say("dolphine");
const kaveri = say("kaveri");

module.exports = {
    names: {
        orca: "Lord Gang Orca",
        dolphine: "Goon Dolphine",
        kaveri: "Kaveri",
        shark: "King Loan Shark",
    },

    // Section 9: his lines, one picked at random from each group.
    lines: {
        greeting: ["Kid. Sit down. You hungry?", "There they are. Come in, come in.", "You came to see me. I like that."],
        beg: [
            "Here, kid. Get yourself something nice. Family looks after family.",
            "Take it. Don't spend it all in one place. Or do. I'm not your mother.",
            "You look thin, kid. Here. Eat something.",
            "The shark would charge you for this. Me? I just want you happy.",
            "Go on. Take it. Friends don't count.",
            "Everyone's a winner, kid. Except those who get in my way.",
            "You remember who helped you. That's all I ask.",
            "Here. And tell your friends who's generous in this city.",
        ],
        cooldown: [
            "Easy. Come back in an hour. Patience is a virtue, kid.",
            "Already? Sit down, have a drink. Come back in a bit.",
            "Dolphine, tell the kid what time it is.",
            "You just ate, kid. Let it settle.",
            "The money's not going anywhere. Neither am I. Give it an hour.",
            "What did I just give you? Spend that first.",
            "Kid. I said an hour. Do I look like a vending machine?",
            "Patience. The shark rushes. We don't.",
            "Sit. Have some bread. Ask me again later.",
            // His appetite: family or not, he's still an orca.
            "Kid. I love you like family. But I've eaten family before.",
            "You've got an appetite, kid. Careful. You're waking up mine.",
            "We're not like the shark. We don't grab. We wait.",
            "Ask me again before the hour's up and I'll start wondering what you taste like.",
            "Hungry, are we? So am I. Let's both be patient.",
            "Self-control, kid. It's what separates us from the fish. And you from my dinner.",
            "Orcas eat seals, kid. Seals that don't listen. You're not a seal.",
            "Every time you ask, I get a little hungrier. Think about that.",
            "Family eat together, kid. Don't make me wonder who's on the menu.",
            "People who can't wait are people who disappear. We're better than them. You can wait.",
        ],
        dailyLimit: [
            "That's enough for today. Go home. Eat something.",
            "Three times a day, kid. A man needs rules.",
            "The well's dry till tomorrow, kid. Even mine.",
            "Come back after midnight. A new day, a new envelope.",
            "Three's my number. Not four. Never four.",
            "You've had your share. Go watch a movie. Come back tomorrow.",
            "Dolphine, show the kid the door. Gently.",
        ],
        noReviews: ["I don't know you, kid. Do some work first. Post a review. Then we talk."],
        favourStart: ["I've been good to you, haven't I? Now I need a little something. Nothing big. Just a favour between family."],
        favourMode: [
            "No more money, kid. Not until you've done right by me. Take your time. I'm not going anywhere. Neither are you.",
            "You know what I need. Come back when it's done.",
            "Favours first, kid. Then we talk money.",
            "I'm a patient man. But I keep a list.",
            "The envelope stays closed until the job's done.",
            "Family helps family. Your turn.",
            "You came all this way with nothing for me? Look at the list, kid.",
        ],
        jobDone: ["See? I knew I could count on you."],
        allDone: ["Good. You've earned your seat at the table again."],
    },

    // Section 6: the favours, in his voice. {X} and {Y} become clickable
    // usernames and {review} a link to the review.
    jobs: {
        challenge: "Get {X} to sit down with {Y} for a game of Farkle or Gomoku. Friendly. Make sure they finish it.",
        review: "{X} has been quiet lately. Get them to post a review. Today.",
        dislike: "{Y} said something I didn't like. Get {X} to dislike this review: {review}.",
        like: "{Y} is a friend of the family. Get {X} to like this review: {review}.",
    },

    // Section 10: the 20 questions. `correct` is the right option's text.
    questions: [
        {
            question: "So, kid. How's the website treating you?",
            options: ["It's like family.", "It's okay, I guess.", "I'm thinking of leaving."],
            correct: "It's like family.",
            right: "Family. That's what I like to hear.",
            wrong: "Hm. Maybe you need to spend more time here.",
        },
        {
            question: "That sardine came by asking about you. You talk to him?",
            options: ["Talk to who?", "Just a little.", "He offered me a loan."],
            correct: "Talk to who?",
            right: "Heh. Good kid.",
            wrong: "...Next time, you don't talk. You walk.",
        },
        {
            question: "That bunny. Kaveri. You trust him?",
            options: ["Yes, I trust him.", "Not really.", "I think he's a double agent."],
            correct: "Yes, I trust him.",
            right: "Good. Everybody trusts Kaveri. That's what makes him useful.",
            wrong: "Careful, kid. Rumours have teeth.",
        },
        {
            question: "Let me ask you something simple. Who runs this city?",
            options: ["King Loan Shark.", "You do.", "Nobody."],
            correct: "You do.",
            right: "See? Simple.",
            wrong: "...We'll work on that.",
        },
        {
            question: "If somebody asked you where you were last night, what would you say?",
            options: ["Home, watching a movie.", "At your lounge.", "With you, boss."],
            correct: "Home, watching a movie.",
            right: "Nice and boring. I like boring.",
            wrong: "No, no, no. You were home. Watching a movie. Right?",
        },
        {
            question: "You watch a lot of movies, kid. What's the most important thing in a good movie?",
            options: ["The explosions.", "Loyalty.", "The popcorn."],
            correct: "Loyalty.",
            right: "Now you're talking like family.",
            wrong: "Explosions fade, kid. Loyalty doesn't.",
        },
        {
            question: "A friend owes you money. What do you do?",
            options: ["Break his legs.", "Give him time. He'll come around.", "Forget about it."],
            correct: "Give him time. He'll come around.",
            right: "Exactly. They always come around.",
            wrong: "That's how the shark thinks. Don't think like a fish.",
        },
        {
            question: "What do you call someone who bites the hand that feeds him?",
            options: ["Hungry.", "A shark.", "Brave."],
            correct: "A shark.",
            right: "HA! I like you, kid.",
            wrong: "No. He's a shark. Always a shark.",
        },
        {
            question: "Nice lounge, isn't it? Be a shame if something happened to it.",
            options: ["Nothing's gonna happen while I'm around.", "Is that a threat?", "It's a bit dusty."],
            correct: "Nothing's gonna happen while I'm around.",
            right: "That's what family's for.",
            wrong: "A threat? To my own lounge? Relax, kid. Relax.",
        },
        {
            question: "Dolphine tells me you've been posting reviews. Lots of them?",
            options: ["Every day, boss.", "Not lately.", "What's a review?"],
            correct: "Every day, boss.",
            right: "Hard worker. I respect that.",
            wrong: "Hm. A busy kid is a happy kid. Get busy.",
        },
        {
            question: "People call me a whale. Did you know orcas are really dolphins? Does that matter?",
            options: ["Size matters.", "You're whatever you say you are, boss.", "Technically, you're a dolphin."],
            correct: "You're whatever you say you are, boss.",
            right: "Smart answer.",
            wrong: "Technically, kid, I'm the one with the money.",
        },
        {
            question: "You ever borrowed from the shark?",
            options: ["Never.", "Once.", "I'm borrowing right now."],
            correct: "Never.",
            right: "Keep it that way.",
            wrong: "...I'm not angry, kid. I'm disappointed.",
        },
        {
            question: "What's the first rule of family?",
            options: ["Never talk outside the family.", "Always share your popcorn.", "Money comes first."],
            correct: "Never talk outside the family.",
            right: "You've been listening.",
            wrong: "No. Money comes and goes. Family stays.",
        },
        {
            question: "Dolphine smiles a lot. Why do you think that is?",
            options: ["He's just happy.", "He knows something I don't.", "I don't ask, boss."],
            correct: "I don't ask, boss.",
            right: "Good answer. Nobody asks.",
            wrong: "Don't think about it too hard, kid.",
        },
        {
            question: "If I gave you a crate to hold for me, what's the first thing you'd ask?",
            options: ["What's inside?", "Where do you want it?", "Is it heavy?"],
            correct: "Where do you want it?",
            right: "That's the right question. The only question.",
            wrong: "Curiosity's expensive, kid.",
        },
        {
            question: "Some kid's been leaving bad reviews on my favourite movie. What should happen?",
            options: ["Nothing. Opinions are free.", "Someone should have a talk with him.", "I'll write an even worse one."],
            correct: "Someone should have a talk with him.",
            right: "Just a talk. Friendly. Very friendly.",
            wrong: "Free? Nothing in this city is free, kid.",
        },
        {
            question: "So what brings you here tonight?",
            options: ["I need money.", "To pay my respects.", "I was in the neighbourhood."],
            correct: "To pay my respects.",
            right: "Respect. That's rare these days.",
            wrong: "Honest. I'll give you that.",
        },
        {
            question: "You hear things around the club. What's the word on the street?",
            options: ["The shark's getting nervous.", "Everyone loves the shark.", "I don't hear anything."],
            correct: "The shark's getting nervous.",
            right: "Heh. He should be.",
            wrong: "Then open your ears, kid.",
        },
        {
            question: "I never forget a face. Do you?",
            options: ["Never, boss.", "I forget faces all the time.", "Only the ones you tell me to."],
            correct: "Only the ones you tell me to.",
            right: "...Now *that's* family.",
            wrong: "A good memory is a dangerous thing, kid. Use it wisely.",
        },
        {
            question: "One day, I might need you. Will you be there?",
            options: ["Day or night.", "Depends what it is.", "Only on weekdays."],
            correct: "Day or night.",
            right: "I knew I could count on you.",
            wrong: "Funny. ...Not funny.",
        },
    ],

    // Section 8: when he's closed. Monday to Friday (00:00 to 16:00), that
    // weekday's Goon Dolphine story; Saturday and Sunday, Kaveri's. Then one
    // of their scenes (moments, below), and the story's `closing`, if any.
    closed: {
        1: {
            title: "Family Business",
            steps: [
                narration("You push open the back door of the jazz lounge. The chairs are up on the tables, and the boss's leather armchair is empty."),
                narration("A dolphin in a black suit and sunglasses steps out of the shadows. He's smiling. Dolphins are always smiling. It doesn't help."),
                dolphine("Boss ain't here. Family business."),
                narration("He cracks his knuckles. Somewhere across town, a siren wails."),
                dolphine("Some of the shark's boys got lost on our side of the docks. Boss went to help them find their way home. *click click* Come back at 16:00, kid."),
            ],
        },
        2: {
            title: "Making a Sale",
            steps: [
                narration("The lounge is quiet. A half-finished glass of milk sits next to the boss's armchair, still cold."),
                dolphine("You just missed him. Boss is closing a deal."),
                narration("He leans in."),
                dolphine("Big shipment. Very legal. Extremely legal. Don't ask what's in the crates."),
                narration("He straightens your collar for you."),
                dolphine("Come back at 16:00. Boss likes it when you're on time."),
            ],
        },
        3: {
            title: "Meeting the Partners",
            steps: [
                narration("You hear laughing from behind a locked door. Before you can knock, Goon Dolphine blocks the way."),
                dolphine("Nah, nah. Boss is with the partners today. The Crocodile Brothers flew in from the river."),
                narration("The laughter stops at once. Then it starts again, louder."),
                dolphine("Business is good when everyone's laughing. Business is bad when one guy stops. *click* Go home. Come back at 16:00."),
            ],
        },
        4: {
            title: "Collecting Respect",
            steps: [
                narration("Goon Dolphine is counting a stack of envelopes at the bar. He doesn't look up."),
                dolphine("Boss is making his rounds. Visiting the neighbourhood. Shaking hands."),
                narration("He licks his flipper and keeps counting."),
                dolphine("People in this city pay their respects, y'know? Boss never has to ask twice. He never even has to ask once. *click click* 16:00, kid. Don't make me remember your face for the wrong reasons."),
            ],
        },
        5: {
            title: "Sending a Message",
            steps: [
                narration("The lounge smells like smoke and seawater. A shark tooth sits on the boss's chair, wrapped in a silk handkerchief."),
                dolphine("Boss is out sending a message."),
                narration("He picks up the tooth and turns it in the light."),
                dolphine("King Loan Shark's been telling people *he* runs this town."),
                narration("He chuckles."),
                dolphine("Boss went to correct him. Politely."),
                narration("He puts the tooth in his pocket."),
                dolphine("Come back at 16:00. Bring your appetite. Boss'll be in a good mood tonight."),
            ],
        },
        weekend: {
            title: "The Double Agent",
            steps: [
                narration("You turn the corner into the alley behind the lounge and freeze."),
                narration("Kaveri is there, the club's own cheerful bunny. He's humming and skipping out of the back door with a big envelope stamped with the orca seal. In his other paw is a second envelope, stamped with a shark fin."),
                narration("He sees you, and his ears shoot straight up."),
                kaveri("OH! Hi hi hi! Fancy seeing you here!"),
                narration("He swaps the envelopes behind his back. Then he swaps them again, and then once more."),
                kaveri("Me? Oh, I'm just delivering mail! I deliver mail for *everybody*! Sharks, orcas, it's all the same to me! Teehee!"),
                narration("A shark tooth drops out of his pocket. He kicks it into a drain without looking."),
                kaveri("The boss isn't here today! It's the weekend, silly! Everybody needs a day off, even scary people!"),
                narration("He gives you a big wave and a bigger smile."),
                kaveri("Go home and watch a movie! And hey, let's keep this our little secret, okay? Okay! Byeee!"),
                narration("He hops away whistling. Behind him, the back door of the lounge creaks shut by itself."),
            ],
            // After Kaveri's scene (moments below), to end the visit.
            closing: [narration("*Come back Monday at 16:00.*")],
        },
    },

    // When he's closed, after the day's story: one little scene from
    // whoever's minding the place, at random, never the same one twice in a
    // row (utils/orca/player.js statusOf). `leadIn` comes first, so the
    // scene follows on from the story's goodbye; then, if the story has a
    // `closing`, that ends the visit. Add, change or remove scenes freely:
    // each is a list of steps, like the stories.
    moments: {
        // Monday to Friday: Goon Dolphine. Loyal to the boss, would do
        // anything for him. Just a goon, not a monster: now and then you see
        // his softer side, and he treats you like family.
        dolphine: {
            leadIn: "As you turn to go, Goon Dolphine calls after you.",
            scenes: [
                // Loyal to the boss.
                [
                    narration("He's polishing the boss's armchair with a silk handkerchief, slow and careful."),
                    dolphine("Boss found me tangled in a fishing net when I was a pup. Cut me loose with his own teeth."),
                    dolphine("Everything I got, I owe him. The suit. The sunglasses. The smile. ...Well. I came with the smile."),
                ],
                [
                    dolphine("Some guys work for money. Some guys work for respect."),
                    dolphine("Me? I work for the boss. *click* It's simpler that way."),
                ],
                [
                    dolphine("Boss says jump, I don't ask how high."),
                    narration("He thinks about it for a moment."),
                    dolphine("I'm already up there, kid. Waiting for him."),
                ],
                [
                    narration("He straightens a framed photo behind the bar: the boss, younger, next to a little dolphin in a suit three sizes too big."),
                    dolphine("That's me. First day on the job."),
                    dolphine("Boss said I'd grow into the suit. *click click* I did."),
                ],
                [
                    dolphine("King Loan Shark tried to hire me once. Offered me double."),
                    dolphine("I sent his guy back with a polite note and a fish. A whole fish."),
                    dolphine("It's a message, kid. It means no thank you."),
                ],
                [
                    dolphine("You know what I'd do for the boss?"),
                    narration("He doesn't wait for an answer."),
                    dolphine("Anything. That's the whole list. *click*"),
                ],
                // His softer side: you're family now.
                [
                    narration("He looks you up and down."),
                    dolphine("You eating okay, kid? You look thin."),
                    dolphine("Here. Crackers. Don't tell the boss I keep snacks behind the bar."),
                ],
                [
                    dolphine("Anybody giving you trouble out there?"),
                    dolphine("You tell me. Not the boss, me. I'll have a word with them. A polite word."),
                    narration("He cracks his knuckles."),
                    dolphine("...Mostly polite."),
                ],
                [
                    narration("He takes his sunglasses off for a second. His eyes are kinder than you expected."),
                    dolphine("You keep coming back. Most people don't."),
                    dolphine("That makes you family, kid. And family uses the front door. Next time, don't sneak round the back."),
                ],
                [
                    dolphine("You remind me of me, before the suit."),
                    dolphine("Hungry. Honest. Bit lost."),
                    narration("He pats your shoulder with a flipper."),
                    dolphine("Stick around. We'll look after you."),
                ],
                [
                    narration("He fixes your collar, then brushes something off your shoulder."),
                    dolphine("There. Now you look like somebody."),
                    dolphine("In this family, we look sharp. Even on the bad days. *Especially* on the bad days."),
                ],
                [
                    dolphine("Rough day?"),
                    narration("He slides a napkin across the bar. On it, he's drawn a little smiling orca."),
                    dolphine("Boss drew me one of these once, when I was a pup and things were bad. Keep it. It helps. *click*"),
                ],
                // His sister, Marina: loyalty isn't something you're born
                // with. It's something you earn.
                [
                    narration("He goes quiet, turning an empty glass round and round in his flipper."),
                    dolphine("I had a sister. Marina. Smartest dolphin in the bay."),
                    dolphine("She sold the boss out to the shark."),
                    narration("He puts the glass down, very gently."),
                    dolphine("Loyalty ain't something you're born with, kid. It's something you earn. Every day."),
                ],
                [
                    dolphine("People say blood's thicker than water."),
                    dolphine("Kid, we *live* in water."),
                    narration("For once, he isn't smiling."),
                    dolphine("Marina thought being my sister meant something. It did. Just not enough."),
                ],
                [
                    narration("There's a pink seashell on the shelf behind the bar. He never lets anyone touch it."),
                    dolphine("Marina's. My sister."),
                    dolphine("When she went to the shark, the boss asked me to take care of it. I took care of it."),
                    dolphine("*click* That's what loyal means, kid. Even when it costs you everything."),
                ],
                [
                    dolphine("You know dolphins sing? I used to."),
                    dolphine("Marina and me, when we were pups. Every night, out past the docks."),
                    narration("He clears his throat."),
                    dolphine("Anyway. Boss needed it done. I did it. Don't sing much any more."),
                ],
                [
                    dolphine("Being born into a family don't mean nothing."),
                    dolphine("Marina was born my family. She traded us for a few fish."),
                    dolphine("You? Nobody made you come here. You chose us. That's worth more than blood, kid."),
                ],
                // A drink with him: the boss is out.
                [
                    dolphine("Boss is out. And nobody drinks alone in this lounge."),
                    narration("He pulls a bar stool out for you."),
                    dolphine("Sit. What're you having? I got milk, and I got milk with ice."),
                ],
                [
                    narration("He pours two glasses of milk and slides one over to you."),
                    dolphine("Boss's private stock. Don't tell him I'm into the good stuff."),
                    dolphine("...Actually, tell him. He likes it when I'm hospitable."),
                ],
                [
                    dolphine("Quiet night. Have a drink with me, kid."),
                    narration("He raises his glass."),
                    dolphine("To the boss. Long may he swim."),
                ],
                [
                    dolphine("You look like you could use a drink."),
                    dolphine("On the house. Family never pays at this bar."),
                    narration("He wipes the counter, even though it's already clean."),
                    dolphine("So. How's life treating you? Honestly. I got time."),
                ],
                [
                    narration("He already has two glasses out."),
                    dolphine("Saw you coming down the docks. Figured you'd be thirsty."),
                    dolphine("Boss won't be back for a while. We got time. Tell me about your day."),
                ],
            ],
        },
        // Saturday and Sunday: Kaveri. The club's cheerful, friendly bunny,
        // who delivers mail for *everybody*, and doesn't see the problem.
        kaveri: {
            leadIn: "Before you reach the end of the alley, Kaveri comes hopping back.",
            scenes: [
                [
                    narration("He has a carrot in each paw."),
                    kaveri("Want one? I've got two! I always carry two. One for each side! Of my mouth! Teehee!"),
                ],
                [
                    kaveri("Did you know the boss *and* King Loan Shark both love my carrot muffins?"),
                    kaveri("Same muffins, same recipe, same Saturday! Nobody ever asks why they taste the same!"),
                    narration("He looks very pleased with himself."),
                ],
                [
                    narration("He sits down on the back step and sorts his envelopes into two neat piles."),
                    kaveri("This pile's for the orca, and this pile's for the shark!"),
                    narration("He stops and squints at them."),
                    kaveri("...Or was it the other way round? Eh! They'll work it out! They always do!"),
                ],
                [
                    kaveri("Hi hi! You look like you need a hug!"),
                    narration("He hugs you before you can answer. He smells faintly of seawater and popcorn."),
                    kaveri("Weekends are for movies and hugs, not for business! Go have some fun, okay?"),
                ],
                [
                    narration("He's carrying a film reel almost as big as he is."),
                    kaveri("Movie night at the club! You should come! Everybody's welcome! Orcas, sharks, bunnies, *you*!"),
                    kaveri("Bring snacks! I'll bring two of everything! Teehee!"),
                ],
            ],
        },
    },

    // Section 7 and 11: at Kino Poker.
    // Box Office Crash: what he says once his all-in round is over
    // (games/crash/rooms.js): won, kept some (cashed out under 1x, or broke
    // even), or lost the lot. The offer's own line is on the page
    // (frontend/src/components/crash/AllInOffer.jsx).
    crashAllIn: {
        won: [
            "Goodjob, kid. You made a profit for the family.",
            "Lucky tonight, aren't we? There's a reason for that. Stick around and you'll find out.",
            "I'm so proud of you, kid. You did well. Family's proud of you.",
        ],
        some: [
            "You blinked. Smart. Mostly.",
            "Half a meal is still a meal, kid.",
            "Walked away with something. Family respects that. A little.",
        ],
        lost: [
            "You tried your best, kid. That's all I ask.",
            "That's the game, kid. Go eat something. You'll always have a seat at my table.",
            "Loss is just a part of doing business. Don't let it get to you.",
        ],
    },

    poker: {
        // His own lines, like the other bots' (shared/poker/lines.js).
        lines: {
            check: ["Patience.", "I'll wait. I'm good at waiting."],
            call: ["I'll see it. Just to be polite.", "Call. Let's not be rude."],
            bet: ["A small contribution.", "Something for the family."],
            raise: ["Let's make it worth everyone's while.", "A little more. For respect."],
            fold: ["Not tonight.", "Keep it. A gift."],
            allIn: ["Everything. I don't do half measures.", "All of it. Family's watching."],
            draw: ["Just tidying up.", "A few changes. Nothing personal."],
            standPat: ["These will do.", "I'm happy with my hand. Are you?"],
            win: ["Thank you. Family appreciates it.", "Everyone's a winner. Mostly me."],
            lose: ["Enjoy it, kid.", "I'll remember this."],
            leave: ["Business calls. Keep the chair warm.", "Dolphine's waiting. Evening, all."],
            stay: ["A new face. Sit, sit.", "Welcome. You hungry?"],
            join: ["Evening. Deal me in.", "Room for one more?"],
            start: ["Evening, everyone. Let's keep it friendly.", "Kid. Sit down. Let's play."],
        },

        // Only while King Loan Shark and Lord Gang Orca are both seated.
        // Each is an exchange: lines one after another, by their seats.
        // `narration` is small text under the table.
        rivalry: {
            meet: [
                [{ who: "shark", text: "WHO LET THE WHALE IN?!" }, { who: "orca", text: "Evening, sardine." }],
                [{ who: "orca", text: "Mind if I sit? Of course you don't." }, { who: "shark", text: "I MIND! I MIND A LOT!" }],
                [{ who: "shark", text: "This table's MY water, blubber boy!" }, { who: "orca", text: "Your water. My table. Deal the cards." }],
            ],
            orcaBeatsShark: [
                [{ who: "orca", text: "Everyone's a winner. Except you." }],
                [{ who: "orca", text: "Don't worry, sardine. I'll lend you some. No interest." }, { who: "shark", text: "DON'T YOU DARE BE NICE TO ME!" }],
            ],
            sharkBeatsOrca: [
                [{ who: "shark", text: "HA! CHOMP CHOMP! Who's the king now?!" }, { who: "orca", text: "Enjoy it. Kings fall. Lords inherit." }],
                [{ who: "shark", text: "Read 'em and weep, blubber!" }, { who: "orca", text: "I don't weep, kid. I remember." }],
            ],
            orcaRaise: [
                [{ who: "orca", text: "Let's see how deep your pockets go, fish." }],
                [{ who: "orca", text: "Raise. You look nervous, sardine." }, { who: "shark", text: "I'M NOT NERVOUS! ...Kaveri, how much did he raise?" }],
            ],
            sharkAllIn: [
                [{ who: "shark", text: "ALL IN! CHAOS! FEAR ME!" }, { who: "orca", text: "...Sure." }],
                [{ who: "shark", text: "ALL OF IT! EVERY COIN! I LIVE FOR THIS!" }, { who: "orca", text: "And you'll die for it too, one day." }],
            ],
            orcaFold: [[{ who: "orca", text: "I'll let you have that one. Consider it charity." }]],
            sharkFold: [[{ who: "shark", text: "This hand stinks worse than your aftershave!" }, { who: "orca", text: "It's called class. Look it up." }]],
            banter: [
                [{ who: "orca", text: "Nice chips, sardine. Borrowed?" }],
                [{ who: "orca", text: "You bluff like you lend. Loud and desperate." }],
                [{ who: "orca", text: "Relax. It's just a game. For now." }],
                [{ who: "shark", text: "I've eaten bigger fish than you for BREAKFAST!" }, { who: "orca", text: "No, you haven't." }],
                [{ who: "shark", text: "My loans built this city!" }, { who: "orca", text: "Your loans broke this city. I'm fixing it." }],
                [{ who: "shark", text: "One day I'm gonna take EVERYTHING you have!" }, { who: "orca", text: "Get in line, kid. Behind the tax man." }],
            ],
            // Rare extras when Kaveri is at the table too.
            kaveri: [
                [{ who: "kaveri", text: "Boys, boys! Play nice! Teehee!" }],
                [{ who: "shark", text: "Kaveri! Whose side are you on?!" }, { who: "kaveri", text: "Yours! ...And his! Everybody's! Hehe!" }],
                [{ who: "narration", text: "Kaveri winks at the shark. Then at the orca." }],
            ],
        },
    },
};
