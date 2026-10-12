const WheelEntry = require("../models/EntryModel");

const MAX_ENTRIES = 60;
const toDto = (e) => ({ id: e._id.toString(), title: e.title });

async function getEntries(req, res) {
  const entries = await WheelEntry.find().sort({ createdAt: 1 });
  res.json({ entries: entries.map(toDto) });
}

async function addEntry(req, res) {
  const title = String(req.body.title ?? "").trim();

  if (!title || title.length > 100) {
    return res.status(400).json({ error: "Enter a movie title (max 100 characters)." });
  }
  if ((await WheelEntry.countDocuments()) >= MAX_ENTRIES) {
    return res.status(409).json({ error: "The wheel is full." });
  }

  try {
    await WheelEntry.create({ title, titleKey: title.toLowerCase() });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "That movie is already on the wheel." });
    }
    throw err;
  }
}

// Start a new round. Open to everyone for now (no auth yet).
async function clearEntries(req, res) {
  await WheelEntry.deleteMany({});
  res.json({ ok: true });
}

module.exports = { getEntries, addEntry, clearEntries };