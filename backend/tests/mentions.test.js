// Tagging members in cuts (shared/mentions.js): finding "@name" tags,
// suggesting the closest names, and the tag being typed. No database.
//
// From backend/: npm test (or node --test tests/mentions.test.js)
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { closestNames, findMentions, mentionAt } = require("../../shared/mentions.js");

const NAMES = ["Sam", "Sam P", "samantha", "Kim", "kimberly", "Bob_99", "Lee", "Sami"];
const tagsIn = (text) => findMentions(text, NAMES).map((tag) => [tag.name, text.slice(tag.start, tag.end)]);

describe("tags", () => {
    test("the longest username that fits, any case, ending at a space, punctuation or the end", () => {
        assert.deepEqual(tagsIn("hi @Sam P and @kim!"), [["Sam P", "@Sam P"], ["Kim", "@kim"]]);
        assert.deepEqual(tagsIn("@sam, @SAMANTHA and @nobody"), [["Sam", "@sam"], ["samantha", "@SAMANTHA"]]);
        assert.deepEqual(tagsIn("@Sami's cut"), [["Sami", "@Sami"]]);
        assert.deepEqual(tagsIn("@Samx isn't anyone"), []);
    });

    test("an email address isn't a tag", () => {
        assert.deepEqual(tagsIn("mail me@kim.com or @Bob_99."), [["Bob_99", "@Bob_99"]]);
    });
});

describe("suggestions", () => {
    test("the 3 closest: starting with it (shortest first), then a word in it, then holding it", () => {
        assert.deepEqual(closestNames("sa", NAMES), ["Sam", "Sami", "Sam P"]);
        assert.deepEqual(closestNames("p", ["Sam P", "Pip", "apple"]), ["Pip", "Sam P", "apple"]);
        assert.deepEqual(closestNames("99", NAMES), ["Bob_99"]);
    });

    test("a typo or a swapped pair still finds them", () => {
        assert.deepEqual(closestNames("kmi", NAMES), ["Kim", "kimberly"]);
        assert.deepEqual(closestNames("bpb", NAMES), ["Bob_99"]);
    });

    test("just \"@\": the first 3 by name", () => {
        assert.deepEqual(closestNames("", NAMES), ["Bob_99", "Kim", "kimberly"]);
    });

    test("the tag being typed: open after \"@\", past a space only while a name could still fit", () => {
        assert.deepEqual(mentionAt("hey @Sa", 7, NAMES), { start: 4, query: "Sa" });
        assert.deepEqual(mentionAt("hey @Sam P", 10, NAMES), { start: 4, query: "Sam P" });
        assert.equal(mentionAt("hey @Sam x", 10, NAMES), null);
        assert.equal(mentionAt("me@kim", 6, NAMES), null);
        assert.equal(mentionAt("@Sam\nnext", 9, NAMES), null);
    });
});
