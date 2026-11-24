const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A registered form, made in Pet Forge (the admin panel; utils/petForge.js):
// a base form's recolour with a name and a rarity. It's what a pet looks like
// in Catflix No Chill, and what booster pack cards are. Only the colour
// changes are kept: { "#original": "#new" }, a few hundred bytes. Its id is
// the one Pet Forge gave it (a short text, not an ObjectId).
const petFormSchema = new Schema(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true, maxlength: 40 },
        baseFormId: { type: String, required: true, ref: "PetBaseForm" },
        rarity: { type: String, enum: ["common", "uncommon", "rare", "epic", "legendary"], default: "common" },
        // Which of Pet Forge's coats it started from ("Original", "Cream"...),
        // or "custom".
        look: { type: String, default: "custom", maxlength: 40 },
        changes: { type: Schema.Types.Mixed, default: {} },
        // Milliseconds, as Pet Forge sends them.
        createdAt: { type: Number, default: () => Date.now() },
        updatedAt: { type: Number, default: null },
    },
    { versionKey: false, minimize: false }
);

petFormSchema.index({ baseFormId: 1 });

module.exports = mongoose.model("PetForm", petFormSchema);
