const crypto = require("crypto");
const { SCRATCH } = require("../../../shared/scratch/config.js");

// Box Office Scratch as plain functions, with no database: dealing a card,
// sealing it, and what one scratch reveals. The server (utils/scratch.js)
// and the simulation (scripts/simulate-scratch.js) both play the game with
// these, so the odds the simulation measures are the real game's.

const TILE_COUNT = SCRATCH.rows * SCRATCH.cols;
const STAR = "star";
const BLANK = "blank";
const GOLDEN = "golden";

// A scratch that isn't allowed. The routes send `message` back with `status`.
class ScratchError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// A new card's tiles: exactly SCRATCH.stars stars, the rest blank, and on one
// card in goldenTicketOneIn, a Golden Ticket on one of the blanks.
// `randomInt(max)` gives a whole number from 0 to max - 1: crypto.randomInt,
// which can't be predicted, unless a test passes its own.
function newLayout(randomInt = crypto.randomInt) {
    const layout = Array(TILE_COUNT).fill(BLANK);

    // Shuffle just far enough to pick the star positions (the first few of a
    // Fisher-Yates shuffle), so every set of positions is equally likely.
    const positions = [...Array(TILE_COUNT).keys()];
    for (let i = 0; i < SCRATCH.stars; i++) {
        const j = i + randomInt(TILE_COUNT - i);
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    for (const position of positions.slice(0, SCRATCH.stars)) layout[position] = STAR;

    if (randomInt(SCRATCH.goldenTicketOneIn) === 0) {
        const blanks = positions.slice(SCRATCH.stars);
        layout[blanks[randomInt(blanks.length)]] = GOLDEN;
    }

    return layout;
}

// The seal shown on a card from the moment it's bought: sha256 of the layout
// and a secret salt. Once the card is done, the layout and salt are revealed,
// and anyone can check they give the same seal, so the layout can't have
// been changed while the card was being scratched.
function hashLayout(layout, salt) {
    return crypto.createHash("sha256").update(JSON.stringify(layout) + salt).digest("hex");
}

function sealLayout(layout) {
    const salt = crypto.randomBytes(16).toString("hex");
    return { salt, hash: hashLayout(layout, salt) };
}

// The tier a win on scratch `scratchNumber` pays, or null.
function tierForScratch(scratchNumber) {
    return SCRATCH.tiers.find((tier) => tier.scratch === scratchNumber) ?? null;
}

function tierByKey(key) {
    return SCRATCH.tiers.find((tier) => tier.key === key) ?? null;
}

// One scratch of tile `tile` on `card` ({ layout, scratched, starsFound,
// tier }), checked. Returns what it reveals and what changes:
//   content        "star", "blank" or "golden"
//   scratchNumber  1 for the first scratch, and so on
//   starsFound     stars found after it
//   tier           the key of the tier this scratch locks in, or null. Only
//                  the scratch that finds the last needed star locks one; a
//                  card that already has a tier only hunts for the Golden
//                  Ticket after that, and further stars pay nothing extra.
//   golden         it found the Golden Ticket
//   last           it was the card's last scratch
function scratchTile(card, tile) {
    if (!Number.isInteger(tile) || tile < 0 || tile >= TILE_COUNT) {
        throw new ScratchError("Pick a tile on the card.");
    }
    if (card.scratched.includes(tile)) {
        throw new ScratchError("That tile is already scratched.", 409);
    }
    if (card.scratched.length >= SCRATCH.scratches) {
        throw new ScratchError("No scratches left on this card.", 409);
    }

    const content = card.layout[tile];
    const scratchNumber = card.scratched.length + 1;
    const starsFound = card.starsFound + (content === STAR ? 1 : 0);
    const locksTier = !card.tier && content === STAR && starsFound === SCRATCH.starsToWin;

    return {
        content,
        scratchNumber,
        starsFound,
        tier: locksTier ? tierForScratch(scratchNumber)?.key ?? null : null,
        golden: content === GOLDEN,
        last: scratchNumber === SCRATCH.scratches,
    };
}

module.exports = {
    TILE_COUNT,
    STAR,
    BLANK,
    GOLDEN,
    ScratchError,
    newLayout,
    hashLayout,
    sealLayout,
    tierForScratch,
    tierByKey,
    scratchTile,
};
