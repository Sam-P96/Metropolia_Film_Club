const mongoose = require("mongoose");
const CatflixPet = require("../../models/catflixPetModel");
const CatflixPlayer = require("../../models/catflixPlayerModel");
const { CATFLIX } = require("../../../shared/catflix/rules.js");
const { CatflixError, changePet } = require("./pets");

// Catflix No Chill's toys (shared/catflix/rules.js toys): balls bought in the
// shop (shop.js), dropped in a pet room on the page, where the pets knock
// them about. The page plays the pets and the ball; every knock it reports
// counts here: +5 happiness for the pet that knocked it (and, for someone
// else's pet on a Play Date, +1 to its love for whoever owns the ball), and one knock off
// the ball, which is gone once it has none left. At most one knock is
// counted a player every knockEveryMs, so knocks can't be hurried along.

const TOYS = CATFLIX.toys;
const isBall = (kind) => typeof kind === "string" && Object.hasOwn(TOYS.balls, kind);

// `petId` knocked `actorId`'s `kind` ball about: their pet at home, or the
// pet they're visiting (or their own, tagging along). Resolves to { pet,
// left }: the pet as it is now, and the knocks the ball has left (0: worn
// out, and gone).
async function knock(actorId, petId, kind, now = new Date()) {
    if (!isBall(kind)) throw new CatflixError("There's no ball like that.");
    if (!mongoose.isValidObjectId(petId) || !(await CatflixPet.exists({ _id: petId }))) throw new CatflixError("That pet doesn't exist.", 404);
    const path = `balls.${kind}`;
    const claimed = await CatflixPlayer.findOneAndUpdate(
        { user: actorId, [path]: { $gte: 1 }, $or: [{ knockedAt: null }, { knockedAt: { $lte: new Date(now.getTime() - TOYS.knockEveryMs) } }] },
        { $inc: { [path]: -1 }, $set: { knockedAt: now } },
        { returnDocument: "after" }
    ).lean();
    if (!claimed) {
        const player = await CatflixPlayer.findOne({ user: actorId }).select("balls").lean();
        if (!(player?.balls?.[kind] >= 1)) throw new CatflixError(`You don't have a ${TOYS.balls[kind].name}: buy one in the shop.`, 409);
        throw new CatflixError("One knock at a time.", 429);
    }

    let pet;
    try {
        pet = await changePet(
            { _id: petId },
            (current) => {
                const meters = { ...current.meters, happiness: Math.min(CATFLIX.meterMax, current.meters.happiness + TOYS.happiness) };
                if (String(current.owner) === String(actorId)) return { meters };
                // Someone else's pet (a Play Date): it loves the one whose ball it is a little more.
                const loveBy = new Map(current.loveBy instanceof Map ? current.loveBy : Object.entries(current.loveBy ?? {}));
                loveBy.set(String(actorId), Math.min(CATFLIX.meterMax, (loveBy.get(String(actorId)) ?? 0) + TOYS.loveForVisitor));
                return { meters, loveBy };
            },
            now
        );
    } catch (error) {
        await CatflixPlayer.updateOne({ user: actorId }, { $inc: { [path]: 1 } });
        throw error;
    }
    const left = claimed.balls[kind];
    if (left <= 0) await CatflixPlayer.updateOne({ user: actorId, [path]: { $lte: 0 } }, { $set: { [path]: null } });
    return { pet, left: Math.max(0, left) };
}

module.exports = { knock };
