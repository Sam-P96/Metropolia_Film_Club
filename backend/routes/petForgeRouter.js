const path = require("path");
const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const forge = require("../utils/petForge");

// Pet Forge (utils/petForge.js), under /api/pet-forge:
//   /app/                  the page itself (public/pet-forge/), for anyone:
//                          it's only code, and everything it saves needs an
//                          admin. Checked for changes on every visit, so an
//                          update reaches the admin panel straight away.
//   GET /assets/:id        an animation file, for anyone (the game draws
//                          pets from them). Never changes, so cached for good.
// Admins only:
//   GET /                  every base form and registered form
//   PUT /baseForms/:id     save a base form       DELETE /baseForms/:id
//   PUT /registeredForms/:id                      DELETE /registeredForms/:id
//   POST /assets           upload an animation file ({ type, data: base64 })
//   DELETE /assets/:id     a file no base form uses any more
const router = express.Router();

router.use("/app", express.static(path.join(__dirname, "..", "public", "pet-forge"), { maxAge: 0 }));

router.get("/assets/:id", async (req, res) => {
    const asset = await forge.assetById(req.params.id);
    if (!asset) return res.status(404).json({ error: "That file doesn't exist." });
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.type(asset.type).send(Buffer.from(asset.data.buffer ?? asset.data));
});

router.use(requireAuth, requireRole("admin"));

// Runs `work`, and answers with what it gives, or with why not.
const handle = (work) => async (req, res) => {
    try {
        res.json((await work(req)) ?? { ok: true });
    } catch (error) {
        if (error instanceof forge.PetForgeError) return res.status(error.status).json({ error: error.message });
        throw error;
    }
};

router.get("/", handle(() => forge.everything()));
router.put("/baseForms/:id", handle(async (req) => ({ doc: await forge.saveBaseForm(req.params.id, req.body) })));
router.delete("/baseForms/:id", handle((req) => forge.deleteBaseForm(req.params.id)));
router.put("/registeredForms/:id", handle(async (req) => ({ doc: await forge.saveRegisteredForm(req.params.id, req.body) })));
router.delete("/registeredForms/:id", handle((req) => forge.deleteRegisteredForm(req.params.id)));
router.post("/assets", handle((req) => forge.uploadAsset(req.body, req.user._id)));
router.delete("/assets/:id", handle((req) => forge.deleteAsset(req.params.id)));

module.exports = router;
