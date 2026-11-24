const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A pet's base form, made in Pet Forge (the admin panel; utils/petForge.js):
// its animations (each a GIF or PNG strip in models/petAssetModel.js), which
// of their colours are fur (recoloured by registered forms), which way the
// art faces, and how far it stands up or down on the ground. Its id is the
// one Pet Forge gave it (a short text, not an ObjectId).
const petBaseFormSchema = new Schema(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true, maxlength: 40 },
        // Each animation, by state ("idle", "sad", "angry", "love", "walk"):
        // { kind: "gif" | "png", file, frames, n?, asset, url }, and how it
        // moves: hover, shake, ushake, rlf (true or false), shakeAmt,
        // ushakeAmt, rlfN.
        anims: { type: Schema.Types.Mixed, default: {} },
        // The colours that are fur ("#rrggbb").
        fur: { type: [String], default: [] },
        facing: { type: String, enum: ["left", "right"], default: "left" },
        // Up (-) or down (+) on the ground, and left (-) or right (+) over
        // its shadow (in the way the art faces), in pixels.
        sink: { type: Number, default: 0 },
        nudge: { type: Number, default: 0 },
        // When Pet Forge made it (milliseconds), for its order.
        createdAt: { type: Number, default: () => Date.now() },
    },
    { versionKey: false, minimize: false }
);

module.exports = mongoose.model("PetBaseForm", petBaseFormSchema);
