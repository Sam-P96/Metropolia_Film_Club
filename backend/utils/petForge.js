const mongoose = require("mongoose");
const PetBaseForm = require("../models/petBaseFormModel");
const PetForm = require("../models/petFormModel");
const PetAsset = require("../models/petAssetModel");

// Pet Forge, the admin panel's tool for making Catflix No Chill's pets
// (routes/petForgeRouter.js; the page itself is public/pet-forge/). What it
// saves on the server: base forms (animations, fur colours, facing, ground),
// the animation files, and registered forms (a base form's recolour, with a
// name and a rarity). Everything else on its page stays in the admin's
// browser. Each save is checked here, whoever sends it: names, states,
// rarities and colours from fixed lists, and every link (a form's base form,
// an animation's file) to something that exists.

class PetForgeError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Pet Forge's own ids: short letters and digits (forge.js newId).
const ID = /^[a-z0-9]{4,40}$/i;
const HEX = /^#[0-9a-f]{6}$/i;
// A pet's animations, and the rarities of registered forms (as forge.js has them).
const STATES = ["idle", "sad", "angry", "love", "walk"];
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];
// The biggest animation file, and the most colours a form can have.
const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const MAX_COLOURS = 256;
// An animation file's address, for the page and (later) the game.
const assetUrl = (id) => `/api/pet-forge/assets/${id}`;

function checkId(id) {
    if (typeof id !== "string" || !ID.test(id)) throw new PetForgeError("That id isn't one of Pet Forge's.");
    return id;
}

function cleanName(value) {
    const name = typeof value === "string" ? value.trim() : "";
    if (!name) throw new PetForgeError("Give it a name.");
    return name.slice(0, 40);
}

const whole = (value, min, max, fallback) => (Number.isInteger(value) && value >= min && value <= max ? value : fallback);
const when = (value) => (Number.isFinite(value) && value > 0 ? Math.round(value) : Date.now());

// The fur colours: "#rrggbb", each once.
function cleanFur(value) {
    if (!Array.isArray(value)) return [];
    if (value.length > MAX_COLOURS) throw new PetForgeError("Too many fur colours.");
    if (!value.every((colour) => typeof colour === "string" && HEX.test(colour))) throw new PetForgeError("Fur colours are #rrggbb.");
    return [...new Set(value.map((colour) => colour.toLowerCase()))];
}

// One animation: { kind, file, frames, n?, asset, url }, its file uploaded.
function cleanAnim(state, meta) {
    if (!meta || typeof meta !== "object") throw new PetForgeError(`The ${state} animation is missing its details.`);
    if (meta.kind !== "gif" && meta.kind !== "png") throw new PetForgeError(`The ${state} animation is a GIF or a PNG.`);
    if (typeof meta.asset !== "string" || !mongoose.isValidObjectId(meta.asset)) throw new PetForgeError(`The ${state} animation's file hasn't been uploaded.`);
    const anim = {
        kind: meta.kind,
        file: typeof meta.file === "string" ? meta.file.slice(0, 80) : `${state}.${meta.kind}`,
        frames: whole(meta.frames, 1, 5000, 1),
        asset: meta.asset,
        url: assetUrl(meta.asset),
    };
    // A PNG strip: how many frames it's cut into.
    if (meta.n !== undefined) anim.n = whole(meta.n, 1, 1000, 1);
    // How it moves, ticked in the Studio: bob up and down (hover), shake
    // left and right (shake) or up and down (ushake), and repeat its last
    // frames (rlf: the last rlfN of them).
    for (const flag of ["hover", "shake", "ushake", "rlf"]) if (meta[flag] !== undefined) anim[flag] = meta[flag] === true;
    for (const key of ["shakeAmt", "ushakeAmt"]) {
        if (Number.isFinite(meta[key])) anim[key] = Math.round(Math.min(2, Math.max(0.1, meta[key])) * 10) / 10;
    }
    if (meta.rlfN !== undefined) anim.rlfN = whole(meta.rlfN, 1, 5000, 1);
    // Its size, set in the Studio: how many times wider (x) and taller (y)
    // than its file it's drawn (an animation uploaded at 256 px, set to 64 px
    // to match the others: 0.25). Left out at its own size.
    if (meta.resize && typeof meta.resize === "object") {
        const [x, y] = [Number(meta.resize.x), Number(meta.resize.y)];
        if (!Number.isFinite(x) || !Number.isFinite(y)) throw new PetForgeError(`The ${state} animation's size is two numbers.`);
        const keep = (value) => Math.round(Math.min(8, Math.max(0.1, value)) * 10000) / 10000;
        if (keep(x) !== 1 || keep(y) !== 1) anim.resize = { x: keep(x), y: keep(y) };
    }
    return anim;
}

// A base form as Pet Forge sends it, checked, with its files' existence.
async function cleanBaseForm(id, body) {
    const anims = {};
    for (const [state, meta] of Object.entries(body?.anims ?? {})) {
        if (!STATES.includes(state)) throw new PetForgeError(`"${state}" isn't an animation pets have.`);
        anims[state] = cleanAnim(state, meta);
    }
    const files = [...new Set(Object.values(anims).map((anim) => anim.asset))];
    if (files.length > 0 && (await PetAsset.countDocuments({ _id: { $in: files } })) !== files.length) {
        throw new PetForgeError("An animation's file is gone: upload it again.");
    }
    return {
        _id: checkId(id),
        name: cleanName(body?.name),
        anims,
        fur: cleanFur(body?.fur),
        facing: body?.facing === "right" ? "right" : "left",
        sink: whole(body?.sink, -16, 16, 0),
        nudge: whole(body?.nudge, -16, 16, 0),
        createdAt: when(body?.createdAt),
    };
}

// The colour changes: { "#original": "#new" }.
function cleanChanges(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const entries = Object.entries(value);
    if (entries.length > MAX_COLOURS) throw new PetForgeError("Too many colour changes.");
    if (!entries.every(([from, to]) => HEX.test(from) && typeof to === "string" && HEX.test(to))) throw new PetForgeError("Colour changes are #rrggbb to #rrggbb.");
    return Object.fromEntries(entries.map(([from, to]) => [from.toLowerCase(), to.toLowerCase()]));
}

async function cleanRegisteredForm(id, body) {
    const baseFormId = checkId(body?.baseFormId);
    if (!(await PetBaseForm.exists({ _id: baseFormId }))) throw new PetForgeError("Its base form is gone.");
    return {
        _id: checkId(id),
        name: cleanName(body?.name),
        baseFormId,
        rarity: RARITIES.includes(body?.rarity) ? body.rarity : "common",
        look: typeof body?.look === "string" && body.look ? body.look.slice(0, 40) : "custom",
        changes: cleanChanges(body?.changes),
        createdAt: when(body?.createdAt),
        updatedAt: Number.isFinite(body?.updatedAt) ? Math.round(body.updatedAt) : null,
    };
}

// A document as Pet Forge keeps it: everything but the id, which is its key.
const asDoc = ({ _id, ...doc }) => doc;

// Everything Pet Forge saves: { baseForms: { id: doc }, registeredForms }.
async function everything() {
    const [bases, forms] = await Promise.all([PetBaseForm.find().lean(), PetForm.find().lean()]);
    return {
        baseForms: Object.fromEntries(bases.map((doc) => [doc._id, asDoc(doc)])),
        registeredForms: Object.fromEntries(forms.map((doc) => [doc._id, asDoc(doc)])),
    };
}

// Saves a base form (new or changed): resolves to it as saved.
async function saveBaseForm(id, body) {
    const doc = await cleanBaseForm(id, body);
    await PetBaseForm.replaceOne({ _id: doc._id }, doc, { upsert: true });
    return asDoc(doc);
}

// Whether any base form uses the file `assetId` for an animation.
const assetInUse = (assetId, except = null) =>
    PetBaseForm.exists({ ...(except && { _id: { $ne: except } }), $or: STATES.map((state) => ({ [`anims.${state}.asset`]: assetId })) });

// Deletes a base form, if no registered form is made from it, and any of its
// files no other base form uses.
async function deleteBaseForm(id) {
    checkId(id);
    const uses = await PetForm.countDocuments({ baseFormId: id });
    if (uses > 0) throw new PetForgeError(`${uses} registered form${uses === 1 ? " is" : "s are"} made from it: delete ${uses === 1 ? "it" : "them"} first.`, 409);
    const doc = await PetBaseForm.findOneAndDelete({ _id: id }).lean();
    if (!doc) throw new PetForgeError("That base form is gone already.", 404);
    for (const anim of Object.values(doc.anims ?? {})) {
        if (anim?.asset && !(await assetInUse(anim.asset))) await PetAsset.deleteOne({ _id: anim.asset });
    }
}

async function saveRegisteredForm(id, body) {
    const doc = await cleanRegisteredForm(id, body);
    await PetForm.replaceOne({ _id: doc._id }, doc, { upsert: true });
    return asDoc(doc);
}

async function deleteRegisteredForm(id) {
    checkId(id);
    const { deletedCount } = await PetForm.deleteOne({ _id: id });
    if (deletedCount === 0) throw new PetForgeError("That registered form is gone already.", 404);
}

// An uploaded animation file: { type, data } with `data` in base64. Only a
// real GIF or PNG (its first bytes say which), up to MAX_ASSET_BYTES.
// Resolves to { id, url }.
async function uploadAsset({ type, data } = {}, userId = null) {
    if (type !== "image/gif" && type !== "image/png") throw new PetForgeError("Animations are GIFs or PNGs.");
    if (typeof data !== "string" || !data) throw new PetForgeError("The file is empty.");
    const bytes = Buffer.from(data, "base64");
    if (bytes.length === 0) throw new PetForgeError("The file is empty.");
    if (bytes.length > MAX_ASSET_BYTES) throw new PetForgeError(`That file is over ${MAX_ASSET_BYTES / 1024 / 1024} MB.`, 413);
    const gif = bytes.subarray(0, 4).toString("latin1") === "GIF8";
    const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if ((type === "image/gif" && !gif) || (type === "image/png" && !png)) throw new PetForgeError("That file isn't the GIF or PNG it says it is.");
    const asset = await PetAsset.create({ type, data: bytes, size: bytes.length, by: userId });
    return { id: String(asset._id), url: assetUrl(asset._id) };
}

// Deletes a file no base form uses (one that was replaced by a new upload).
async function deleteAsset(id) {
    if (!mongoose.isValidObjectId(id)) throw new PetForgeError("That file doesn't exist.", 404);
    if (await assetInUse(id)) throw new PetForgeError("A base form still uses that file.", 409);
    const { deletedCount } = await PetAsset.deleteOne({ _id: id });
    if (deletedCount === 0) throw new PetForgeError("That file is gone already.", 404);
}

// A file to send: { type, data }, or null.
function assetById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return PetAsset.findById(id).select("type data").lean();
}

module.exports = {
    PetForgeError,
    STATES,
    RARITIES,
    MAX_ASSET_BYTES,
    assetUrl,
    everything,
    saveBaseForm,
    deleteBaseForm,
    saveRegisteredForm,
    deleteRegisteredForm,
    uploadAsset,
    deleteAsset,
    assetById,
};
