const mongoose = require("mongoose");
const Event = require("../models/eventModel");
const {userSummary} = require("../utils/serialize");
const {hasRole} = require("../middleware/auth");

const FIELDS = "title startsAt location description film gifUrl official createdBy";

// What userSummary needs to draw a member, plus privacy to decide who's named.
const MEMBER_FIELDS = "username role memberTitle avatarUrl reviewCardBanner value privacy";

const RSVPS = ["attending", "interested"];

// Events from before member screenings have no `official` value. Only
// moderators could make events then, so they're official.
function withDefaults(event) {
    return {...event, official: event.official !== false};
}

// Moderators and admins can change any event. A member can change their own
// member screening, but not once it's been made official.
function canManage(user, event) {
    if (hasRole(user, "moderator")) return true;
    return event.official === false && String(event.createdBy) === String(user._id);
}

// All of them, soonest first. The frontend splits upcoming from past, because
// "now" is a moment on the viewer's clock.
async function getEvents(req, res) {
    const events = await Event.find().select(FIELDS).sort({startsAt: 1}).lean();
    res.json(events.map(withDefaults));
}

// One event with its host and the members attending and interested filled in.
function findWithPeople(id) {
    return Event.findById(id)
        .select(`${FIELDS} attending interested`)
        .populate("createdBy attending interested", MEMBER_FIELDS)
        .lean();
}

// Who's going and who's interested, for `viewer` (the member asking, or null).
// Members with a private profile count but aren't named, unless it's the
// viewer: the same rule as "Who wants to see this" on a film.
function attendance(event, viewer) {
    const viewerId = viewer ? String(viewer._id) : null;
    const isViewer = (member) => String(member._id) === viewerId;

    // Deleted accounts populate as null. Events from before RSVPs have no lists.
    const attending = (event.attending ?? []).filter(Boolean);
    const interested = (event.interested ?? []).filter(Boolean);

    const named = (members) =>
        members
            .filter((member) => isViewer(member) || (member.privacy ?? "public") === "public")
            // The viewer first, then in the order they joined.
            .sort((a, b) => isViewer(b) - isViewer(a))
            .map(userSummary);

    let myRsvp = null;
    if (attending.some(isViewer)) myRsvp = "attending";
    if (interested.some(isViewer)) myRsvp = "interested";

    return {
        attending: named(attending),
        interested: named(interested),
        attendingCount: attending.length,
        interestedCount: interested.length,
        myRsvp,
    };
}

async function getEvent(req, res) {
    const {id} = req.params;
    const event = mongoose.isValidObjectId(id) ? await findWithPeople(id) : null;

    if (!event) {
        return res.status(404).json({error: "Event not found."});
    }

    // createdBy stays an id, as in the list; host is who to show. Null if
    // their account has since been deleted.
    const host = event.createdBy;

    res.json({
        ...withDefaults(event),
        createdBy: host?._id ?? null,
        host: userSummary(host),
        ...attendance(event, req.user),
    });
}

// The Attend and Interested buttons. Picking one takes the member out of the
// other; null takes them out of both. Only for events that haven't happened
// yet. Doesn't touch updatedAt, which means "last edited".
async function setEventRsvp(req, res) {
    const {id} = req.params;
    const rsvp = req.body?.rsvp ?? null;

    if (rsvp !== null && !RSVPS.includes(rsvp)) {
        return res.status(400).json({error: "Choose attending, interested, or neither."});
    }

    const event = mongoose.isValidObjectId(id)
        ? await Event.findById(id).select("startsAt").lean()
        : null;

    if (!event) {
        return res.status(404).json({error: "Event not found."});
    }

    if (event.startsAt <= new Date()) {
        return res.status(400).json({error: "This event has already happened."});
    }

    const me = req.user._id;
    let update;

    if (rsvp === "attending") {
        update = {$addToSet: {attending: me}, $pull: {interested: me}};
    } else if (rsvp === "interested") {
        update = {$addToSet: {interested: me}, $pull: {attending: me}};
    } else {
        update = {$pull: {attending: me, interested: me}};
    }

    await Event.updateOne({_id: id}, update, {timestamps: false});

    const updated = await findWithPeople(id);

    if (!updated) {
        return res.status(404).json({error: "Event not found."});
    }

    res.json(attendance(updated, req.user));
}

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

// Turns a request body into event fields, or { error } for the first bad
// value. Creating and editing send the same complete form, so they share it.
function eventFields(body) {
    const title = String(body.title ?? "").trim();
    const startsAt = new Date(body.startsAt);
    const location = String(body.location ?? "").trim();
    const description = String(body.description ?? "").trim();
    const gifUrl = String(body.gifUrl ?? "").trim() || null;

    if (!title || title.length > 120) {
        return {error: "The event needs a title (max 120 characters)."};
    }

    if (Number.isNaN(startsAt.getTime())) {
        return {error: "Pick a date and a time."};
    }

    if (gifUrl && !isHttpUrl(gifUrl)) {
        return {error: "The image link must start with http:// or https://."};
    }

    const filmTitle = String(body.film?.title ?? "").trim();
    const filmTmdbId = Number(body.film?.tmdbId);

    const film = filmTitle
        ? {title: filmTitle, tmdbId: Number.isInteger(filmTmdbId) && filmTmdbId > 0 ? filmTmdbId : null}
        : null;

    return {fields: {title, startsAt, location, description, film, gifUrl}};
}

function validationMessage(error) {
    return error.name === "ValidationError" ? Object.values(error.errors)[0].message : null;
}

const NOT_YOURS = "Only moderators can change this event. Members can change their own member screenings.";

// Any logged-in member. What a member makes is a member screening; a
// moderator's or admin's event is official unless they untick the box.
async function createEvent(req, res) {
    const {fields, error} = eventFields(req.body ?? {});

    if (error) {
        return res.status(400).json({error});
    }

    const official = hasRole(req.user, "moderator") && req.body.official !== false;

    try {
        const event = await Event.create({...fields, official, createdBy: req.user._id});
        res.status(201).json(withDefaults(event.toObject()));
    } catch (err) {
        const message = validationMessage(err);
        if (message) return res.status(400).json({error: message});
        throw err;
    }
}

// Replaces every editable field: the edit form always sends the whole event.
// Whether it's official is changed with the promote button, not here.
async function updateEvent(req, res) {
    const {id} = req.params;
    const event = mongoose.isValidObjectId(id) ? await Event.findById(id) : null;

    if (!event) {
        return res.status(404).json({error: "Event not found."});
    }

    if (!canManage(req.user, event)) {
        return res.status(403).json({error: NOT_YOURS});
    }

    const {fields, error} = eventFields(req.body ?? {});

    if (error) {
        return res.status(400).json({error});
    }

    Object.assign(event, fields);

    try {
        await event.save();
        res.json(withDefaults(event.toObject()));
    } catch (err) {
        const message = validationMessage(err);
        if (message) return res.status(400).json({error: message});
        throw err;
    }
}

async function deleteEvent(req, res) {
    const {id} = req.params;
    const event = mongoose.isValidObjectId(id)
        ? await Event.findById(id).select("official createdBy").lean()
        : null;

    if (!event) {
        return res.status(404).json({error: "Event not found."});
    }

    if (!canManage(req.user, event)) {
        return res.status(403).json({error: NOT_YOURS});
    }

    await Event.deleteOne({_id: id});
    res.json({ok: true});
}

// "Promote to official" and "Demote to member screening". Moderators and
// admins only; the router checks. Doesn't touch updatedAt, which means
// "last edited".
async function setEventOfficial(req, res) {
    const {id} = req.params;

    const event = mongoose.isValidObjectId(id)
        ? await Event.findByIdAndUpdate(
            id,
            {$set: {official: Boolean(req.body?.official)}},
            {returnDocument: "after", timestamps: false}
        ).select("official").lean()
        : null;

    if (!event) {
        return res.status(404).json({error: "Event not found."});
    }

    res.json({official: event.official});
}

module.exports = {
    getEvents,
    getEvent,
    setEventRsvp,
    setEventOfficial,
    createEvent,
    updateEvent,
    deleteEvent,
};
