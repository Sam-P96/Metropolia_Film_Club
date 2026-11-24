const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One animation file uploaded in Pet Forge (a GIF, or a PNG strip): the bytes
// themselves, kept in the database so they're never lost with the server's
// disk. Never changed once saved (a new upload is a new asset), so it can be
// cached for good. Served at /api/pet-forge/assets/:id (routes/petForgeRouter.js).
const petAssetSchema = new Schema(
    {
        type: { type: String, enum: ["image/gif", "image/png"], required: true },
        data: { type: Buffer, required: true },
        size: { type: Number, required: true },
        by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

module.exports = mongoose.model("PetAsset", petAssetSchema);
