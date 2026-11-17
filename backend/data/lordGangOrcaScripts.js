// Every word Lord Gang Orca's feature says, in one place, to edit freely
// without touching the logic (utils/orca/, games/poker/table.js). Speakers:
//   orca      Lord Gang Orca
//   dolphine  Dolphine Goon, his enforcer
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
        dolphine: "Dolphine Goon",
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
    // weekday's Dolphine Goon story; Saturday and Sunday, Kaveri's.
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
                narration("You hear laughing from behind a locked door. Before you can knock, Dolphine Goon blocks the way."),
                dolphine("Nah, nah. Boss is with the partners today. The Crocodile Brothers flew in from the river."),
                narration("The laughter stops at once. Then it starts again, louder."),
                dolphine("Business is good when everyone's laughing. Business is bad when one guy stops. *click* Go home. Come back at 16:00."),
            ],
        },
        4: {
            title: "Collecting Respect",
            steps: [
                narration("Dolphine Goon is counting a stack of envelopes at the bar. He doesn't look up."),
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
                narration("*Come back Monday at 16:00.*"),
            ],
        },
    },

    // Section 7 and 11: at Kino Poker.
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
