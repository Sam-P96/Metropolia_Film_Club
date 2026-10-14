const mongoose = require("mongoose");
const Event = require("../models/eventModel");

const FIELDS = "title startsAt location description film gifUrl";

// All of them, soonest first. The frontend splits upcoming from past, because
// "now" is a moment on the viewer's clock.
async function getEvents(req, res) {
    const events = await Event.find().select(FIELDS).sort({startsAt: 1}).lean();
    res.json(events);
}

async function getEvent(req, res) {
    const {id} = req.params;

    const event = mongoose.isValidObjectId(id)
        ? await Event.findById(id).select(FIELDS).lean()
        : null;

    if (!event) {
        return res.status(404).json({error: "Event not found."});
    }

    res.json(event);
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

module.exports = {getEvents, getEvent, createEvent, updateEvent, deleteEvent};
