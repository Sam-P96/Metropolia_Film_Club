const mongoose = require("mongoose");
const WheelEntry = require("../models/EntryModel");
const WheelSettings = require("../models/wheelSettingsModel");
const WheelActivity = require("../models/wheelActivityModel");
const { hasRole } = require("../middleware/auth");

// The Club Wheel, on the Club Events page. Everyone sees it; moderators and
// admins add, weigh, remove and clear. An admin can open it, and then every
// member can add films too, up to the weight an admin allows each of them.
// What everyone does shows in its public activity box.

const MAX_ENTRIES = 60;
const MAX_WEIGHT = 1000;
const ACTIVITY_SHOWN = 50;
const SETTINGS_ID = "club";

// Films from before weights existed have none: they count as 1.
const weightOf = (entry) => entry.weight ?? 1;

const toDto = (e) => ({ id: e._id.toString(), title: e.title, weight: weightOf(e) });

const activityDto = (a) => ({
  id: a._id.toString(),
  action: a.action,
  title: a.title ?? null,
  weight: a.weight ?? null,
  user: a.user?.username ?? "Someone",
  at: a.createdAt,
});

// A whole number from 1 to MAX_WEIGHT, or null.
function parseWeight(value) {
  const weight = Number(value);
  return Number.isInteger(weight) && weight >= 1 && weight <= MAX_WEIGHT ? weight : null;
}

const BAD_WEIGHT = `Weight must be a whole number from 1 to ${MAX_WEIGHT}.`;

async function readSettings() {
  const doc = await WheelSettings.findById(SETTINGS_ID).lean();
  return {
    open: doc?.open ?? false,
    // Missing: the default of 1. null: an admin chose no limit.
    memberWeight: doc?.memberWeight === undefined ? 1 : doc.memberWeight,
  };
}

// How much weight this member has on the wheel, over every film.
function weightSpentBy(entries, userId) {
  let spent = 0;
  for (const entry of entries) {
    for (const backer of entry.backers ?? []) {
      if (String(backer.user) === String(userId)) spent += backer.weight ?? 0;
    }
  }
  return spent;
}

function log(user, action, details = {}) {
  return WheelActivity.create({ user: user._id, action, ...details });
}

// The wheel as `user` sees it (null: logged out): its films, its settings,
// what they may do, and the latest activity.
async function wheelState(user) {
  const [entries, settings, activity] = await Promise.all([
    WheelEntry.find().sort({ createdAt: 1 }).lean(),
    readSettings(),
    WheelActivity.find().sort({ createdAt: -1, _id: -1 }).limit(ACTIVITY_SHOWN).populate("user", "username").lean(),
  ]);

  const canEdit = hasRole(user, "moderator");
  const limited = Boolean(user) && !canEdit && settings.memberWeight !== null;

  return {
    entries: entries.map(toDto),
    open: settings.open,
    memberWeight: settings.memberWeight,
    maxWeight: MAX_WEIGHT,
    you: {
      canAdd: canEdit || (Boolean(user) && settings.open),
      canEdit,
      canManage: hasRole(user, "admin"),
      // How much more weight they can add (null: no limit).
      weightLeft: limited ? Math.max(0, settings.memberWeight - weightSpentBy(entries, user._id)) : null,
    },
    activity: activity.map(activityDto),
  };
}

async function getEntries(req, res) {
  res.json(await wheelState(req.user));
}

// Add a film, with a weight (1 if none is given). A film that's already on
// the wheel gets the weight added to its own.
async function addEntry(req, res) {
  const title = String(req.body.title ?? "").trim();
  if (!title || title.length > 100) {
    return res.status(400).json({ error: "Enter a movie title (max 100 characters)." });
  }

  const weight = parseWeight(req.body.weight ?? 1);
  if (!weight) return res.status(400).json({ error: BAD_WEIGHT });

  if (!hasRole(req.user, "moderator")) {
    const settings = await readSettings();
    if (!settings.open) {
      return res.status(403).json({ error: "The Club Wheel is closed. Only moderators and admins can add to it right now." });
    }
    if (settings.memberWeight !== null) {
      const mine = await WheelEntry.find({ "backers.user": req.user._id }).select("backers").lean();
      const left = settings.memberWeight - weightSpentBy(mine, req.user._id);
      if (weight > left) {
        const error = left > 0
          ? `You can add ${left} more weight to the wheel.`
          : "You've added all the weight you can to this wheel.";
        return res.status(409).json({ error });
      }
    }
  }

  const titleKey = title.toLowerCase();
  const backer = { user: req.user._id, weight };

  if (await WheelEntry.exists({ titleKey })) {
    // A film from before weights has none yet: it starts from 1.
    await WheelEntry.updateOne({ titleKey, weight: { $exists: false } }, { $set: { weight: 1 } });
    const backed = await WheelEntry.findOneAndUpdate(
      { titleKey, weight: { $lte: MAX_WEIGHT - weight } },
      { $inc: { weight }, $push: { backers: backer } },
      { returnDocument: "after" }
    ).lean();
    if (!backed) {
      return res.status(409).json({ error: `That film is on the wheel already, and can't go over ${MAX_WEIGHT} weight.` });
    }
    await log(req.user, "back", { title: backed.title, weight });
    return res.status(201).json(await wheelState(req.user));
  }

  if ((await WheelEntry.countDocuments()) >= MAX_ENTRIES) {
    return res.status(409).json({ error: "The wheel is full." });
  }

  try {
    await WheelEntry.create({ title, titleKey, weight, addedBy: req.user._id, backers: [backer] });
  } catch (err) {
    // Someone added the same film a moment ago.
    if (err.code === 11000) {
      return res.status(409).json({ error: "Someone just added that film. Try again to add your weight to it." });
    }
    throw err;
  }
  await log(req.user, "add", { title, weight });
  res.status(201).json(await wheelState(req.user));
}

// Moderators and admins: set a film's weight.
async function setWeight(req, res) {
  const weight = parseWeight(req.body.weight);
  if (!weight) return res.status(400).json({ error: BAD_WEIGHT });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "That film isn't on the wheel." });

  const before = await WheelEntry.findByIdAndUpdate(req.params.id, { $set: { weight } }, { returnDocument: "before" }).lean();
  if (!before) return res.status(404).json({ error: "That film isn't on the wheel." });

  if (weightOf(before) !== weight) await log(req.user, "weight", { title: before.title, weight });
  res.json(await wheelState(req.user));
}

// Moderators and admins: take one film off.
async function removeEntry(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "That film isn't on the wheel." });

  const removed = await WheelEntry.findByIdAndDelete(req.params.id).lean();
  if (!removed) return res.status(404).json({ error: "That film isn't on the wheel." });

  await log(req.user, "remove", { title: removed.title });
  res.json(await wheelState(req.user));
}

// Moderators and admins: start a new round. Everyone's weight is theirs to
// add again.
async function clearEntries(req, res) {
  const { deletedCount } = await WheelEntry.deleteMany({});
  if (deletedCount > 0) await log(req.user, "clear");
  res.json(await wheelState(req.user));
}

// Admins: open or close the wheel to members ({ open }), and how much
// weight each member may add ({ memberWeight }, null for no limit).
async function updateSettings(req, res) {
  const changes = {};

  if (req.body.open !== undefined) {
    if (typeof req.body.open !== "boolean") return res.status(400).json({ error: "open must be true or false." });
    changes.open = req.body.open;
  }
  if (req.body.memberWeight !== undefined) {
    const memberWeight = req.body.memberWeight === null ? null : parseWeight(req.body.memberWeight);
    if (memberWeight === null && req.body.memberWeight !== null) return res.status(400).json({ error: BAD_WEIGHT });
    changes.memberWeight = memberWeight;
  }
  if (!Object.keys(changes).length) return res.status(400).json({ error: "Nothing to change." });

  const before = await readSettings();
  await WheelSettings.updateOne({ _id: SETTINGS_ID }, { $set: changes }, { upsert: true });

  if (changes.open !== undefined && changes.open !== before.open) {
    await log(req.user, changes.open ? "open" : "close");
  }
  if (changes.memberWeight !== undefined && changes.memberWeight !== before.memberWeight) {
    await log(req.user, "memberWeight", { weight: changes.memberWeight });
  }
  res.json(await wheelState(req.user));
}

module.exports = { getEntries, addEntry, setWeight, removeEntry, clearEntries, updateSettings, MAX_WEIGHT };
