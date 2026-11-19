const User = require("../models/userModel");
const { MAX_MENTIONS, findMentions } = require("../../shared/mentions.js");

// The members tagged in a cut's `text` (shared/mentions.js: "@" and their
// username, the longest that fits): [{ user, name }], `name` as written in
// the text, in the order they come, each member once, never its author
// (`authorId`), at most MAX_MENTIONS.
async function mentionsIn(text, authorId) {
    if (!text.includes("@")) return [];
    const users = await User.find().select("username").lean();
    const byName = new Map(users.map((user) => [user.username, user._id]));
    const lowerToName = new Map();
    for (const user of users) if (!lowerToName.has(user.username.toLowerCase())) lowerToName.set(user.username.toLowerCase(), user.username);

    const tagged = [];
    const seen = new Set([String(authorId)]);
    for (const found of findMentions(text, users.map((user) => user.username))) {
        const written = text.slice(found.start + 1, found.end);
        // The same case first; otherwise whoever has that name in any case.
        const id = byName.get(written) ?? byName.get(lowerToName.get(written.toLowerCase())) ?? byName.get(found.name);
        if (!id || seen.has(String(id))) continue;
        seen.add(String(id));
        tagged.push({ user: id, name: written });
        if (tagged.length === MAX_MENTIONS) break;
    }
    return tagged;
}

module.exports = { mentionsIn };
