const fs = require("fs");
const path = require("path");
const { STEAL } = require("../../../shared/steal/config.js");

// Steal and Defend's items, read from backend/data/steal-and-defend-items.json
// when the server starts. Editing that file (and restarting) changes the
// game: nothing about an item lives anywhere else. Each item's `effects`
// says what it does, in the keys below; `effect` is just the sentence the
// pages show.

const ITEMS_FILE = path.join(__dirname, "..", "..", "data", "steal-and-defend-items.json");

// Every effect an item can have, and how two equipped items with the same
// one add up. Different items always stack (spec §10.1).
//   sum   added together            max   the biggest wins
//   min   the smallest wins          any   on if any item has it
const EFFECTS = {
    attack: "sum", //              + attack rate
    defense: "sum", //             - the attacker's rate
    fine: "sum", //                + or - percentage points on a failed thief's fine
    redPill: "sum", //             - attack rate per wrong answer
    revenge: "sum", //             % of the attempted amount the failed thief also owes
    wilson: "sum", //              % of what a robbed defender lost, given back
    extraDurabilityLoss: "sum", // durability a failed thief's equipped items also lose
    fewerQuestions: "sum", //      victim questions taken out of the quiz
    timerBonus: "sum", //          seconds added to each question
    retries: "sum", //             wrong answers that can be tried again
    foggyQuestions: "sum", //      multiple-choice questions shown without their text
    fizzle: "sum", //              % chance an attack fizzles when it starts
    neuralyzer: "sum", //          % chance a successful roll fails anyway
    typedMatch: "max", //          how similar typed answers must be (0 to 1)
    mathMax: "max", //             the biggest number in math questions
    critChance: "max", //          % chance of a Critical Hit
    defenseCap: "max", //          the most defense can add up to
    immunityDays: "max", //        days the robbed defender can't attack back
    reshuffleSeconds: "min", //    multiple-choice options reshuffle this often
    timerOverride: "min", //       seconds per question, whatever else says
    critImmune: "any", //          no Critical Hits against them
    seeDefenderItems: "any", //    the attacker sees the defender's equipped items
    forceCrit: "any", //           every success is a Critical Hit
    noLoss: "any", //              the defender loses nothing when robbed
    autoSuccess: "any", //         no quiz: the attack just succeeds
    destroyDefenderItems: "any", // with autoSuccess: breaks a stoneless defender's items
};

const TYPES = ["attack", "defense"];

// Why `item` (one entry of the JSON) isn't usable, or null if it is.
function problemWith(item, seen) {
    if (!item || typeof item !== "object") return "isn't an object";
    if (typeof item.id !== "string" || !/^[a-z0-9-]+$/.test(item.id)) return "needs an id in lowercase letters, numbers and dashes";
    if (seen.has(item.id)) return `has the same id as another item (${item.id})`;
    if (typeof item.name !== "string" || !item.name.trim()) return "needs a name";
    if (!TYPES.includes(item.type)) return `has type "${item.type}", not attack or defense`;
    if (!STEAL.tiers.includes(item.tier)) return `has tier "${item.tier}", which isn't one of ${STEAL.tiers.join(", ")}`;
    if (!Number.isInteger(item.durability) || item.durability < 1) return "needs a durability of 1 or more";
    if (typeof item.priceMultiplier !== "number" || !(item.priceMultiplier > 0)) return "needs a priceMultiplier above 0";
    const effects = item.effects ?? {};
    if (typeof effects !== "object" || Array.isArray(effects)) return "has effects that aren't an object";
    for (const [key, value] of Object.entries(effects)) {
        if (!Object.hasOwn(EFFECTS, key)) return `has an effect "${key}" the game doesn't know`;
        if (EFFECTS[key] === "any" ? typeof value !== "boolean" : typeof value !== "number") {
            return `has effect "${key}" set to ${JSON.stringify(value)}`;
        }
    }
    return null;
}

// The items, checked. A broken entry is left out (and said so in the log)
// rather than taking the whole site down; a file that won't parse leaves
// the shop empty.
function loadItems(file = ITEMS_FILE) {
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        console.error(`Steal and Defend: couldn't read ${file}:`, error.message);
        return [];
    }
    if (!Array.isArray(raw)) {
        console.error(`Steal and Defend: ${file} should be a list of items.`);
        return [];
    }

    const seen = new Set();
    const items = [];
    raw.forEach((item, index) => {
        const problem = problemWith(item, seen);
        if (problem) {
            console.error(`Steal and Defend: item ${index + 1} (${item?.name ?? "no name"}) ${problem}, so it's left out.`);
            return;
        }
        seen.add(item.id);
        items.push(Object.freeze({
            id: item.id,
            name: item.name.trim(),
            type: item.type,
            tier: item.tier,
            unique: item.unique === true,
            effect: typeof item.effect === "string" ? item.effect : "",
            effects: Object.freeze({ ...(item.effects ?? {}) }),
            durability: item.durability,
            dailyTickdown: item.dailyTickdown === true,
            priceMultiplier: item.priceMultiplier,
        }));
    });
    return items;
}

const ITEMS = Object.freeze(loadItems());
const BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

function itemDef(id) {
    return BY_ID.get(id) ?? null;
}

// Infinity Stones are the unique items: only one of each on the site.
const isStone = (def) => Boolean(def?.unique);

// What a set of item definitions does together: every effect key, added up
// (or the biggest, smallest, or any of them) as EFFECTS says. With
// `stonesOnly`, every item but the Infinity Stones is ignored (a Power or
// Soul Stone attack).
function combinedEffects(defs, { stonesOnly = false } = {}) {
    const result = {};
    for (const def of defs) {
        if (!def || (stonesOnly && !isStone(def))) continue;
        for (const [key, value] of Object.entries(def.effects)) {
            const how = EFFECTS[key];
            if (!(key in result)) result[key] = value;
            else if (how === "sum") result[key] += value;
            else if (how === "max") result[key] = Math.max(result[key], value);
            else if (how === "min") result[key] = Math.min(result[key], value);
            else result[key] = result[key] || value;
        }
    }
    return result;
}

module.exports = { ITEMS, EFFECTS, ITEMS_FILE, loadItems, problemWith, itemDef, isStone, combinedEffects };
