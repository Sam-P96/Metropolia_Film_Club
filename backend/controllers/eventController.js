const mongoose = require("mongoose");
const Event = require("../models/eventModel");
const {userSummary} = require("../utils/serialize");

const FIELDS = "title startsAt location description film gifUrl";

// What userSummary needs to draw a member, plus privacy to decide who's named.
const MEMBER_FIELDS = "username role memberTitle avatarUrl reviewCardBanner value privacy";

const RSVPS = ["attending", "interested"];

// All of them, soonest first. The frontend splits upcoming from past, because
// "now" is a moment on the viewer's clock.
async function getEvents(req, res) {
    const events = await Event.find().select(FIELDS).sort({startsAt: 1}).lean();
    res.json(events);
}

// One event with the members attending and interested filled in.
function findWithPeople(id) {
    return Event.findById(id)
        .select(`${FIELDS} attending interested`)
        .populate("attending interested", MEMBER_FIELDS)
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

    res.json({...event, ...attendance(event, req.user)});
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

// Moderators and admins only; the router checks that before any of these run.
async function createEvent(req, res) {
    const {fields, error} = eventFields(req.body ?? {});

    if (error) {
        return res.status(400).json({error});
    }

    try {
        const event = await Event.create({...fields, createdBy: req.user._id});
        res.status(201).json(event.toObject());
    } catch (err) {
        const message = validationMessage(err);
        if (message) return res.status(400).json({error: message});
        throw err;
    }
}

// Replaces every editable field: the edit form always sends the whole event.
async function updateEvent(req, res) {
    const {id} = req.params;
    const event = mongoose.isValidObjectId(id) ? await Event.findById(id) : null;

    if (!event) {
        return res.status(404).json({error: "Event not found."});
    }

    const {fields, error} = eventFields(req.body ?? {});

    if (error) {
        return res.status(400).json({error});
    }

    Object.assign(event, fields);

    try {
        await event.save();
        res.json(event.toObject());
    } catch (err) {
        const message = validationMessage(err);
        if (message) return res.status(400).json({error: message});
        throw err;
    }
}

async function deleteEvent(req, res) {
    const {id} = req.params;
    const event = mongoose.isValidObjectId(id) ? await Event.findByIdAndDelete(id) : null;

    if (!event) {
        return res.status(404).json({error: "Event not found."});
    }

    res.json({ok: true});
}

module.exports = {getEvents, getEvent, setEventRsvp, createEvent, updateEvent, deleteEvent};
