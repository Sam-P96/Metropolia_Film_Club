// Steal and Defend's rules, with no database: the success formula, fines
// and debt, Critical Hits, prices, selling back, the shop's roll, answer
// checking and the quiz. Run from backend/ with `npm test`.
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { STEAL } = require("../../shared/steal/config.js");
const { ITEMS, itemDef, combinedEffects, loadItems, problemWith } = require("../games/steal/items");
const {
    attemptedAmount,
    isPercent,
    critMultiplier,
    successChance,
    fineBill,
    settleBill,
    splitPaid,
    successPayout,
    wilsonRefund,
    rollOutcome,
    rollFizzle,
    itemPrice,
    sellBackValue,
    requiredFollowHours,
    rollTier,
    rollShop,
    lastDailyResetAt,
    lastWeeklyResetAt,
    shopDay,
} = require("../games/steal/rules");
const { similarity, isTypedMatch, parseNumber, isNumberMatch, normaliseText } = require("../games/steal/answers");
const { KINDS, quizSetup, buildQuiz, isCorrect, publicQuestion } = require("../games/steal/quiz");

const effectsOf = (...ids) => combinedEffects(ids.map(itemDef));

// A random source that hands out `values` in turn (each taken modulo max).
function scripted(...values) {
    let i = 0;
    return (max) => values[i++ % values.length] % max;
}

describe("the items file", () => {
    test("every item in backend/data loads, with a unique id", () => {
        const raw = require("../data/steal-and-defend-items.json");
        assert.equal(ITEMS.length, raw.length);
        assert.equal(new Set(ITEMS.map((item) => item.id)).size, ITEMS.length);
    });

    test("the six Infinity Stones are the unique Legendaries", () => {
        const stones = ITEMS.filter((item) => item.unique);
        assert.equal(stones.length, 6);
        assert.ok(stones.every((stone) => stone.tier === "Legendary"));
    });

    test("a broken entry is turned down with a reason", () => {
        const seen = new Set();
        assert.match(problemWith({ id: "x", name: "X", type: "both", tier: "Common", durability: 1, priceMultiplier: 1 }, seen), /type/);
        assert.match(problemWith({ id: "x", name: "X", type: "attack", tier: "Common", durability: 1, priceMultiplier: 1, effects: { laser: 3 } }, seen), /laser/);
        assert.equal(problemWith({ id: "x", name: "X", type: "attack", tier: "Common", durability: 1, priceMultiplier: 1, effects: { attack: 3 } }, seen), null);
    });

    test("a file that won't parse leaves no items rather than crashing", () => {
        const original = console.error;
        console.error = () => {};
        try {
            assert.deepEqual(loadItems(__filename), []);
        } finally {
            console.error = original;
        }
    });

    test("effects from different items stack", () => {
        assert.equal(effectsOf("popcorn-bucket-helmet", "vibranium-shield").defense, 15);
        assert.equal(effectsOf("paint-can-trap").fine, 20);
        assert.equal(effectsOf("getaway-car").fine, -30);
        assert.equal(combinedEffects([itemDef("vibranium-shield"), itemDef("reality-stone")], { stonesOnly: true }).defense, undefined);
    });
});

describe("the success formula", () => {
    test("the spec's example: a Mage with 8 right and a Lockpick against a Warrior with two items is 70%", () => {
        const result = successChance({
            correct: 8,
            wrong: 2,
            attacker: effectsOf("lockpick-set"),
            defender: effectsOf("vibranium-shield", "popcorn-bucket-helmet"),
            attackerClass: "mage",
            defenderClass: "warrior",
        });
        assert.deepEqual(result, { attack: 90, defense: 20, success: 70 });
    });

    test("attack is clamped to 100", () => {
        const result = successChance({ correct: 10, wrong: 0, attacker: effectsOf("lockpick-set"), attackerClass: "mage" });
        assert.equal(result.attack, 100);
        assert.equal(result.success, 100);
    });

    test("defense is capped at 75 and success never goes below 0", () => {
        const result = successChance({ correct: 1, wrong: 9, defender: { defense: 70, redPill: 5 }, defenderClass: "warrior" });
        assert.equal(result.defense, 75);
        assert.equal(result.success, 0);
    });

    test("an item can raise the defense cap", () => {
        assert.equal(successChance({ correct: 10, wrong: 0, defender: { defense: 90, defenseCap: 85 } }).defense, 85);
    });

    test("the Red Pill takes 5 per wrong answer, unanswered included", () => {
        const result = successChance({ correct: 6, wrong: 4, defender: effectsOf("red-pill") });
        assert.equal(result.defense, 20);
        assert.equal(result.success, 40);
    });
});

describe("the rolls after the quiz", () => {
    test("a roll under the chance succeeds, at or over it fails", () => {
        assert.equal(rollOutcome({ chance: 70, random: scripted(69, 99) }).outcome, "success");
        assert.equal(rollOutcome({ chance: 70, random: scripted(70) }).outcome, "fail");
    });

    test("a doomed attack (another finished first) always fails", () => {
        assert.equal(rollOutcome({ chance: 100, doomed: true, random: scripted(0) }).outcome, "fail");
    });

    test("the Neuralyzer turns 20% of successes into failures", () => {
        const defender = effectsOf("neuralyzer");
        assert.equal(rollOutcome({ chance: 100, defender, random: scripted(0, 19) }).outcome, "neuralyzed");
        assert.equal(rollOutcome({ chance: 100, defender, random: scripted(0, 20, 99) }).outcome, "success");
    });

    test("crits: 5%, 8% with Two-Face's Coin, never with Plot Armor, always with the Space Stone", () => {
        assert.equal(rollOutcome({ chance: 100, random: scripted(0, 4) }).crit, true);
        assert.equal(rollOutcome({ chance: 100, random: scripted(0, 5) }).crit, false);
        assert.equal(rollOutcome({ chance: 100, attacker: effectsOf("two-faces-coin"), random: scripted(0, 7) }).crit, true);
        assert.equal(rollOutcome({ chance: 100, defender: effectsOf("plot-armor"), random: scripted(0, 0) }).crit, false);
        assert.equal(rollOutcome({ chance: 100, attacker: effectsOf("space-stone"), defender: effectsOf("plot-armor"), random: scripted(0) }).crit, true);
    });

    test("a Power or Soul Stone attack succeeds without a roll", () => {
        const result = rollOutcome({ chance: 0, auto: true, random: scripted(99) });
        assert.equal(result.outcome, "success");
        assert.equal(result.rolls.success, undefined);
    });

    test("the Invisibility Cloak fizzles 20% of attacks", () => {
        assert.equal(rollFizzle(effectsOf("invisibility-cloak"), scripted(19)).fizzled, true);
        assert.equal(rollFizzle(effectsOf("invisibility-cloak"), scripted(20)).fizzled, false);
        assert.equal(rollFizzle({}, scripted(0)).fizzled, false);
    });
});

describe("crit multipliers and payouts", () => {
    test("x2 at 1% up to x3 at 5%, then x0.25 more each step to x4.25 at 50%", () => {
        assert.deepEqual([1, 2, 3, 4, 5].map(critMultiplier), [2, 2.25, 2.5, 2.75, 3]);
        assert.deepEqual([10, 20, 30, 40, 50].map(critMultiplier), [3.25, 3.5, 3.75, 4, 4.25]);
        assert.throws(() => critMultiplier(6), RangeError);
    });

    test("every percentage an attack can be for has a multiplier", () => {
        for (const percent of STEAL.percents) assert.equal(typeof critMultiplier(percent), "number");
    });

    test("a crit at 50% pays x4.25 and the victim still only loses half", () => {
        assert.deepEqual(successPayout({ attempted: 500, percent: 50, crit: true }), {
            victimLoses: 500,
            critBonus: 1625,
            rogueBonus: 0,
            attackerGets: 2125,
        });
    });

    test("a crit multiplies what the thief gets, not what the victim loses", () => {
        const result = successPayout({ attempted: 40, percent: 2, crit: true });
        assert.deepEqual(result, { victimLoses: 40, critBonus: 50, rogueBonus: 0, attackerGets: 90 });
    });

    test("crit amounts round up and never drift (x2.25 of 4 is exactly 9)", () => {
        assert.equal(successPayout({ attempted: 4, percent: 2, crit: true }).attackerGets, 9);
        assert.equal(successPayout({ attempted: 3, percent: 2, crit: true }).attackerGets, 7);
    });

    test("the Rogue gets 20% of the final gain on top, newly made", () => {
        assert.deepEqual(successPayout({ attempted: 50, percent: 5, attackerClass: "rogue" }), {
            victimLoses: 50,
            critBonus: 0,
            rogueBonus: 10,
            attackerGets: 60,
        });
        assert.equal(successPayout({ attempted: 50, percent: 5, crit: true, attackerClass: "rogue" }).attackerGets, 150 + 30);
    });

    test("the Reality Stone: the thief is paid and the victim loses nothing", () => {
        const result = successPayout({ attempted: 30, percent: 3, noLoss: true });
        assert.equal(result.victimLoses, 0);
        assert.equal(result.attackerGets, 30);
    });

    test("Wilson gives back 25% of what was actually lost, rounded up", () => {
        assert.equal(wilsonRefund(40, 25), 10);
        assert.equal(wilsonRefund(41, 25), 11);
        assert.equal(wilsonRefund(1, 25), 1);
        assert.equal(wilsonRefund(0, 25), 0);
    });
});

describe("the steal amount", () => {
    test("rounds up and is never below 1 PP", () => {
        assert.equal(attemptedAmount(5, 1000), 50);
        assert.equal(attemptedAmount(3, 101), 4);
        assert.equal(attemptedAmount(1, 10), 1);
        assert.equal(attemptedAmount(1, 1), 1);
        assert.equal(attemptedAmount(50, 1001), 501);
    });

    test("only 1, 2, 3, 4, 5, 10, 20, 30, 40 and 50% are allowed", () => {
        assert.deepEqual(STEAL.percents, [1, 2, 3, 4, 5, 10, 20, 30, 40, 50]);
        for (const percent of STEAL.percents) assert.equal(isPercent(percent), true);
        for (const percent of [0, 6, 9, 15, 25, 51, 100, 2.5, "5"]) assert.equal(isPercent(percent), false);
    });
});

describe("fines and debt", () => {
    test("the base fine is 80% of the attempted amount, all to the defender", () => {
        assert.deepEqual(fineBill({ attempted: 100 }), { finePercent: 80, fine: 80, revenge: 0, burned: 0, toDefender: 80, bill: 80 });
    });

    test("the spec's example: Rogue + Paint Can + Getaway Car is 75%, and the Rogue's 5% goes to nobody", () => {
        const bill = fineBill({ attempted: 100, attacker: effectsOf("getaway-car"), defender: effectsOf("paint-can-trap"), attackerClass: "rogue" });
        assert.equal(bill.finePercent, 75);
        assert.equal(bill.fine, 75);
        assert.equal(bill.toDefender, 70);
        assert.equal(bill.burned, 5);
    });

    test("the Revenge Dagger adds 100% of the attempted amount to the same bill", () => {
        const bill = fineBill({ attempted: 50, defender: effectsOf("revenge-dagger") });
        assert.equal(bill.fine, 40);
        assert.equal(bill.revenge, 50);
        assert.equal(bill.bill, 90);
        assert.equal(bill.toDefender, 90);
    });

    test("fines round up and are never below 1 PP", () => {
        assert.equal(fineBill({ attempted: 1 }).fine, 1);
        assert.equal(fineBill({ attempted: 3 }).fine, 3);
    });

    test("the spec's example: an 81 PP fine with 1 PP to pay it leaves -20", () => {
        assert.deepEqual(settleBill(81, 1), { paid: 1, unpaid: 80, covered: 0, debt: 20, forgiven: 60, collected: 1 });
    });

    test("PP parked outside the wallet can't dodge a bill: what it covers is owed in full", () => {
        // 81 owed, 1 in the wallet, 30 in a Slot Machine: 30 owed in full,
        // and 25% of the other 50.
        assert.deepEqual(settleBill(81, 1, 30), { paid: 1, unpaid: 80, covered: 30, debt: 43, forgiven: 37, collected: 31 });
        // Enough parked to cover it all: nothing forgiven.
        assert.deepEqual(settleBill(81, 1, 500), { paid: 1, unpaid: 80, covered: 80, debt: 80, forgiven: 0, collected: 81 });
        // A wallet at -20 has the first claim on what's parked.
        assert.deepEqual(settleBill(10, -20, 25), { paid: 0, unpaid: 10, covered: 5, debt: 7, forgiven: 3, collected: 5 });
        // Paying in full from the wallet never touches it.
        assert.deepEqual(settleBill(10, 50, 100), { paid: 10, unpaid: 0, covered: 0, debt: 0, forgiven: 0, collected: 10 });
    });

    test("with a Revenge Dagger in the bill, nothing is forgiven, and all of it is collected", () => {
        // The attack that showed it: a 1,314 bill (584 fine and a 730 dagger),
        // nothing in the wallet and 262 parked.
        assert.deepEqual(settleBill(1314, 0, 262, { inFull: true }), { paid: 0, unpaid: 1314, covered: 262, debt: 1314, forgiven: 0, collected: 1314 });
        assert.deepEqual(settleBill(90, 40, 0, { inFull: true }), { paid: 40, unpaid: 50, covered: 0, debt: 50, forgiven: 0, collected: 90 });
        // A wallet already below 0 owes it all on top.
        assert.deepEqual(settleBill(90, -10, 0, { inFull: true }), { paid: 0, unpaid: 90, covered: 0, debt: 90, forgiven: 0, collected: 90 });
    });

    test("debt rounds up, and paying in full leaves none", () => {
        assert.equal(settleBill(10, 7).debt, 1);
        assert.deepEqual(settleBill(10, 50), { paid: 10, unpaid: 0, covered: 0, debt: 0, forgiven: 0, collected: 10 });
        assert.equal(settleBill(10, -5).paid, 0);
    });

    test("what's paid goes to the defender first, the Rogue's extra last", () => {
        assert.deepEqual(splitPaid(72, 70), { defenderGets: 70, burned: 2 });
        assert.deepEqual(splitPaid(30, 70), { defenderGets: 30, burned: 0 });
    });
});

describe("prices and selling back", () => {
    test("price is the multiplier times the buyer's daily PP, rounded up", () => {
        assert.equal(itemPrice(6, 5), 30);
        assert.equal(itemPrice(6, 220), 1320);
        assert.equal(itemPrice(0.5, 5), 3);
        assert.equal(itemPrice(0.5, 7), 4);
    });

    test("price is never below 1 PP", () => {
        assert.equal(itemPrice(0.5, 0), 1);
        assert.equal(itemPrice(0.5, 1), 1);
    });

    test("sell-back is half the original price times the durability left", () => {
        assert.equal(sellBackValue(30, 4, 4), 15);
        assert.equal(sellBackValue(30, 2, 4), 8);
        assert.equal(sellBackValue(30, 1, 8), 2);
        assert.equal(sellBackValue(1, 1, 8), 1);
    });
});

describe("following", () => {
    test("72 hours, doubling with each unfollow after a steal, capped at 21 days", () => {
        assert.deepEqual([0, 1, 2, 3, 10].map(requiredFollowHours), [72, 144, 288, 504, 504]);
    });
});

describe("the shop's roll", () => {
    test("tiers come out 40/30/20/9/1", () => {
        const tiers = [];
        for (let roll = 0; roll < 100; roll++) tiers.push(rollTier(scripted(roll)));
        const count = (tier) => tiers.filter((t) => t === tier).length;
        assert.deepEqual(["Common", "Uncommon", "Rare", "Epic", "Legendary"].map(count), [40, 30, 20, 9, 1]);
    });

    test("nine listings, each from its rolled tier", () => {
        const picks = rollShop({ items: ITEMS, random: scripted(0, 0, 50, 0, 75, 0, 95, 0, 99, 0, 10, 1, 60, 1, 80, 1, 92, 1) });
        assert.equal(picks.length, STEAL.shop.listings);
        const tiers = picks.map((id) => itemDef(id).tier);
        assert.deepEqual(tiers.slice(0, 5), ["Common", "Uncommon", "Rare", "Epic", "Legendary"]);
    });

    test("a Legendary roll only picks a stone that doesn't exist, and never the same one twice", () => {
        const stones = ITEMS.filter((item) => item.unique).map((item) => item.id);
        const picks = rollShop({ items: ITEMS, existing: stones.slice(0, 4), count: 2, random: scripted(99, 0) });
        assert.equal(new Set(picks).size, 2);
        assert.ok(picks.every((id) => stones.slice(4).includes(id)));
    });

    test("with every stone out there, a Legendary roll becomes Epic", () => {
        const stones = ITEMS.filter((item) => item.unique).map((item) => item.id);
        const picks = rollShop({ items: ITEMS, existing: stones, count: 3, random: scripted(99, 0) });
        assert.ok(picks.every((id) => itemDef(id).tier === "Epic"));
    });
});

describe("when the day and week start over", () => {
    test("12:00 Helsinki, in winter (10:00 UTC) and summer (09:00 UTC)", () => {
        assert.equal(lastDailyResetAt(new Date("2026-11-04T09:59:00Z")).toISOString(), "2026-11-03T10:00:00.000Z");
        assert.equal(lastDailyResetAt(new Date("2026-11-04T10:00:00Z")).toISOString(), "2026-11-04T10:00:00.000Z");
        assert.equal(lastDailyResetAt(new Date("2026-07-01T09:30:00Z")).toISOString(), "2026-07-01T09:00:00.000Z");
    });

    test("Monday 12:00 for the week, and the shop's day until the next 12:00", () => {
        assert.equal(lastWeeklyResetAt(new Date("2026-11-04T12:00:00Z")).toISOString(), "2026-11-02T10:00:00.000Z");
        assert.equal(lastWeeklyResetAt(new Date("2026-11-02T09:00:00Z")).toISOString(), "2026-10-26T10:00:00.000Z");
        assert.equal(shopDay(new Date("2026-11-04T09:00:00Z")), "2026-11-03");
        assert.equal(shopDay(new Date("2026-11-04T11:00:00Z")), "2026-11-04");
    });
});

describe("checking answers", () => {
    test("numbers take . or , and optional trailing zeros", () => {
        for (const input of ["1.5", "1.50", "1,5", " 1,50 "]) assert.equal(parseNumber(input), 1.5);
        for (const input of ["1", "1.0", "1,00"]) assert.equal(parseNumber(input), 1);
        assert.equal(parseNumber("1.2.3"), null);
        assert.equal(parseNumber("twelve"), null);
        assert.equal(isNumberMatch("12,0", 12), true);
    });

    test("numbers can still be compared at a set number of decimals", () => {
        assert.equal(isNumberMatch("0.33", 1 / 3, 2), true);
        assert.equal(isNumberMatch("0,333", 1 / 3, 2), true);
        assert.equal(isNumberMatch("0.3", 1 / 3, 2), false);
    });

    test("typed answers ignore case, punctuation and a leading The", () => {
        assert.equal(normaliseText("The Lord of the Rings!"), "lord of the rings");
        assert.equal(similarity("spiderman", "Spider-Man"), 1);
        assert.equal(isTypedMatch("lord of the rings", ["The Lord of the Rings"], 0.8), true);
    });

    test("80% similar counts, 90% with the Babel Fish", () => {
        // "finlnd" is one letter off "finland" (6/7, about 86%).
        assert.equal(isTypedMatch("finlnd", ["Finland"], 0.8), true);
        assert.equal(isTypedMatch("finlnd", ["Finland"], 0.9), false);
        assert.equal(isTypedMatch("", ["Finland"], 0.8), false);
    });

    test("a country by letter has to start or end with it", () => {
        const question = { input: "text", answer: { accepted: ["Finland", "France", "Fiji"], letter: "f", edge: "start" } };
        assert.equal(isCorrect(question, "france"), true);
        assert.equal(isCorrect(question, "Prance"), false);
    });
});

describe("the quiz", () => {
    const films = [
        { tmdbId: 1, title: "X-Men", year: 2000, genres: ["Action", "Science Fiction"], rating: 4 },
        { tmdbId: 2, title: "Up", year: 2009, genres: ["Animation"], rating: 5 },
        { tmdbId: 3, title: "Heat", year: 1995, genres: ["Action", "Crime"], rating: 3.5 },
        { tmdbId: 4, title: "Alien", year: 1979, genres: ["Horror"], rating: 4.5 },
    ];
    const data = {
        watched: films,
        rated: films,
        reviews: films.map(({ tmdbId, title }) => ({ tmdbId, title })),
        reviewCount: 4,
        favourites: [{ tmdbId: 2, title: "Up" }],
        logged: new Set([1, 2, 3, 4]),
        lastFollow: { _id: "f", username: "saga" },
        others: [{ username: "a" }, { username: "b" }, { username: "c" }],
        altTitles: new Map(),
    };
    const site = { films: [...films, { tmdbId: 9, title: "Jaws", year: 1975 }, { tmdbId: 10, title: "Rocky", year: 1976 }] };
    const nobody = { watched: [], rated: [], reviews: [], reviewCount: 0, favourites: [], logged: new Set(), lastFollow: null, others: [], altTitles: new Map() };

    test("10 questions: 6 about the victim, 2 math, 2 trivia", () => {
        const questions = buildQuiz({ data, site, setup: quizSetup() });
        const kinds = (kind) => questions.filter((question) => question.kind === kind).length;
        assert.equal(questions.length, 10);
        assert.deepEqual([kinds("victim"), kinds("math"), kinds("trivia")], [6, 2, 2]);
    });

    test("the Motion Sensor makes it 9, with 5 about the victim", () => {
        const questions = buildQuiz({ data, site, setup: quizSetup({ defender: effectsOf("motion-sensor") }) });
        assert.equal(questions.length, 9);
        assert.equal(questions.filter((question) => question.kind === "victim").length, 5);
    });

    test("there are no division questions, only multiplication for math", () => {
        assert.deepEqual(KINDS.math, ["multiply"]);
        for (let run = 0; run < 25; run++) {
            const questions = buildQuiz({ data: nobody, site, setup: quizSetup({ defender: effectsOf("spinning-top") }) });
            assert.ok(questions.every((question) => question.type !== "divide" && !question.prompt.includes("÷")));
        }
    });

    test("a victim with no data gets all math and trivia", () => {
        const questions = buildQuiz({ data: nobody, site: { films: [] }, setup: quizSetup() });
        assert.equal(questions.length, 10);
        assert.ok(questions.every((question) => question.kind !== "victim"));
    });

    test("no question appears twice", () => {
        for (let run = 0; run < 25; run++) {
            const questions = buildQuiz({ data, site, setup: quizSetup() });
            const keys = questions.map((question) => `${question.type}:${question.subject}`);
            assert.equal(new Set(keys).size, keys.length);
        }
    });

    test("timers: 10s, 13s with the Heist Blueprint, 5s with the Time Stone whatever else", () => {
        assert.equal(quizSetup().seconds, 10);
        assert.equal(quizSetup({ attacker: effectsOf("heist-blueprint") }).seconds, 13);
        assert.equal(quizSetup({ attacker: effectsOf("heist-blueprint"), defender: effectsOf("time-stone") }).seconds, 5);
    });

    test("the Mind Stone hides one multiple-choice question's text, but keeps its options and answer", () => {
        const questions = buildQuiz({ data, site, setup: quizSetup({ defender: effectsOf("mind-stone") }) });
        const foggy = questions.filter((question) => question.foggy);
        assert.equal(foggy.length, 1);
        const shown = publicQuestion(foggy[0]);
        assert.equal(shown.prompt, STEAL.quiz.foggyText);
        assert.equal(shown.options.length, 4);
        assert.equal(isCorrect(foggy[0], foggy[0].answer.choice), true);
    });

    test("the page never sees an answer", () => {
        for (const question of buildQuiz({ data, site, setup: quizSetup() })) {
            assert.equal("answer" in publicQuestion(question), false);
        }
    });

    test("multiple-choice options are 4, one right, and the Funhouse Mirror brings a reshuffle per 2 seconds", () => {
        const questions = buildQuiz({ data, site, setup: quizSetup({ defender: effectsOf("funhouse-mirror") }) });
        for (const question of questions.filter((q) => q.input === "choice")) {
            assert.equal(question.options.length, 4);
            assert.equal(new Set(question.options.map((option) => option.label)).size, 4);
            assert.equal(question.shuffles.length, Math.ceil(10 / 2) + 1);
        }
    });
});
