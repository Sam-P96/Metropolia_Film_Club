// Checking quiz answers (spec §7, Answer checking), with no database.

// A typed answer, ready to compare: no accents, lowercase, no punctuation,
// single spaces, and no leading "The". "The Lord of the Rings!" and "lord
// of the rings" come out the same.
function normaliseText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/['’`]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/^the\s+/, "");
}

// How many single-letter changes turn `a` into `b`.
function editDistance(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        for (let j = 1; j <= b.length; j++) {
            row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        previous = row;
    }
    return previous[b.length];
}

// How alike two typed answers are, from 0 to 1, after normalising. Spaces
// don't count against it either: "spiderman" is "Spider-Man".
function similarity(a, b) {
    const x = normaliseText(a);
    const y = normaliseText(b);
    if (!x || !y) return 0;
    const score = (p, q) => 1 - editDistance(p, q) / Math.max(p.length, q.length);
    return Math.max(score(x, y), score(x.replace(/ /g, ""), y.replace(/ /g, "")));
}

// Whether `input` is at least `threshold` similar to any accepted answer.
function isTypedMatch(input, accepted, threshold) {
    if (!normaliseText(input)) return false;
    return accepted.some((answer) => similarity(input, answer) >= threshold - 1e-9);
}

// A typed number: "1.5", "1,5" and "1.50" are all 1.5, "1" and "1,00"
// are 1. Anything that isn't a plain number is null.
function parseNumber(input) {
    const text = String(input ?? "").trim().replace(/\s+/g, "").replace(",", ".");
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(text)) return null;
    const value = Number(text);
    return Number.isFinite(value) ? value : null;
}

// Whether `input` is the number `answer`, compared at `decimals` decimals
// if given, exactly otherwise.
function isNumberMatch(input, answer, decimals = null) {
    const value = parseNumber(input);
    if (value === null) return false;
    if (decimals === null) return value === answer;
    const scale = 10 ** decimals;
    return Math.round(value * scale) === Math.round(answer * scale);
}

module.exports = { normaliseText, editDistance, similarity, isTypedMatch, parseNumber, isNumberMatch };
