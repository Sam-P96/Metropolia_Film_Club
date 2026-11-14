const fs = require("fs");
const mongoose = require("mongoose");
const Event = require("../models/eventModel");

// What WhatsApp, Discord and the like show for a shared link. Their preview
// bots don't run the site's JavaScript, so it has to be in the HTML the
// server sends. Every page has the site's own (the block between these
// markers in frontend/index.html); an event's page gets the event's: its
// title, when and where, the start of its description, and its image.
const START = "<!-- link preview";
const END = "<!-- /link preview -->";
const SITE = "Kino Kaverit";
const DESCRIPTION_LENGTH = 150;

// /club_events/:eventId (the event page in frontend/src/App.jsx).
const EVENT_PAGE = /^\/club_events\/([^/]+)\/?$/;

// Members write these titles and descriptions, so nothing goes into the
// page's HTML without this.
const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// "Fri 21 Nov, 18:00", in Helsinki time, like the event page.
const when = (date) =>
    new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Helsinki",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);

// `text` on one line, cut at a word to at most `length` characters.
function shorten(text, length) {
    const flat = String(text ?? "").replace(/\s+/g, " ").trim();
    if (flat.length <= length) return flat;
    const cut = flat.slice(0, length - 1);
    return `${cut.slice(0, cut.lastIndexOf(" ") > length / 2 ? cut.lastIndexOf(" ") : cut.length).trimEnd()}…`;
}

// An event's preview, or null if there's no such event. Only reads it.
async function eventPreview(eventId) {
    if (!mongoose.isValidObjectId(eventId)) return null;
    const event = await Event.findById(eventId).select("title startsAt location description gifUrl").lean();
    if (!event) return null;

    const whenWhere = [event.startsAt ? when(event.startsAt) : null, event.location || null].filter(Boolean).join(" · ");
    const about = shorten(event.description, DESCRIPTION_LENGTH);
    return {
        title: event.title,
        description: [whenWhere, about].filter(Boolean).join(" — ") || SITE,
        // Only a web address: the image the organiser linked for the event.
        image: /^https?:\/\//i.test(event.gifUrl ?? "") ? event.gifUrl : null,
    };
}

// The block of tags for a preview.
function previewTags({ title, description, image, url }) {
    return [
        `<!-- link preview: this event's own (backend/utils/linkPreview.js) -->`,
        `<title>${escape(title)} · ${SITE}</title>`,
        `<meta name="description" content="${escape(description)}" />`,
        `<meta property="og:site_name" content="${SITE}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:title" content="${escape(title)}" />`,
        `<meta property="og:description" content="${escape(description)}" />`,
        `<meta property="og:url" content="${escape(url)}" />`,
        ...(image ? [`<meta property="og:image" content="${escape(image)}" />`, `<meta name="twitter:image" content="${escape(image)}" />`] : []),
        `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
        END,
    ].join("\n    ");
}

// The page for `req`: `template` (the built index.html) as it is, or with an
// event's preview on its page. Anything amiss (no such event, the database
// slow to answer) and it's the page as it is: a preview is never worth an error.
async function pageHtml(template, req) {
    const page = EVENT_PAGE.exec(req.path);
    const start = template.indexOf(START);
    const end = template.indexOf(END);
    if (!page || start < 0 || end < start) return template;

    try {
        const preview = await eventPreview(page[1]);
        if (!preview) return template;
        const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
        return template.slice(0, start) + previewTags({ ...preview, url }) + template.slice(end + END.length);
    } catch (error) {
        console.error("Link preview:", error.message);
        return template;
    }
}

// The handler for every address that's a page of the site (app.js): the
// built index.html, with the right preview, always checked again by the
// browser so a new deploy shows at once.
function sendPage(indexPath) {
    return async (req, res) => {
        const template = await fs.promises.readFile(indexPath, "utf8");
        res.set("Cache-Control", "no-cache").type("html").send(await pageHtml(template, req));
    };
}

module.exports = { sendPage, pageHtml };
