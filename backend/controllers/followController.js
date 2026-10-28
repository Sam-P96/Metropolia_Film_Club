const mongoose = require("mongoose");
const User = require("../models/userModel");
const Follow = require("../models/followModel");
const { MEMBER_FIELDS, userSummary } = require("../utils/serialize");
const { areFriends, listAccess, followState } = require("../utils/follows");
const { parseOffset } = require("../utils/paging");
const { noteFollow, forgetFollow } = require("../utils/notify");

const PAGE_SIZE = 10;

async function findMember(id) {
    return mongoose.isValidObjectId(id)
        ? User.findById(id).select("username followPrivacy").lean()
        : null;
}

// Follow or unfollow the member in the URL. A new follow goes into their
// Notifications; unfollowing quietly takes it out again. Resolves to their new
// follow state (see utils/follows.js), counts included.
async function setFollow(req, res, follow) {
    const owner = await findMember(req.params.id);

    if (!owner) {
        return res.status(404).json({ error: "There is no member with that id." });
    }

    if (String(owner._id) === String(req.user._id)) {
        return res.status(400).json({ error: "You can't follow yourself." });
    }

    const pair = { follower: req.user._id, following: owner._id };

    if (follow) {
        try {
            const result = await Follow.updateOne(pair, { $setOnInsert: pair }, { upsert: true });
            if (result.upsertedCount === 1) await noteFollow(req.user._id, owner._id);
        } catch (error) {
            // Two clicks at once: the other one already followed.
            if (error.code !== 11000) throw error;
        }
    } else {
        const result = await Follow.deleteOne(pair);
        if (result.deletedCount === 1) await forgetFollow(req.user._id, owner._id);
    }

    res.json(await followState(owner, req.user));
}

const followUser = (req, res) => setFollow(req, res, true);
const unfollowUser = (req, res) => setFollow(req, res, false);

// A page of a member's Followers ("followers") or the members they follow
// ("following"), newest first, as far as their followPrivacy lets the
// viewer see. { owner, access, users, total, hasMore, next }: `next` is the
// skip for the next page.
async function listFollows(req, res, kind) {
    const owner = await findMember(req.params.id);

    if (!owner) {
        return res.status(404).json({ error: "There is no member with that id." });
    }

    const viewerId = req.user?._id ?? null;
    const access = listAccess(owner, viewerId, await areFriends(viewerId, owner._id));

    if (access === "none") {
        return res.status(403).json({ error: `${owner.username} keeps this list private.` });
    }

    // Followers: rows following the owner, listing each follower. Following:
    // rows the owner follows, listing who.
    const ownerSide = kind === "followers" ? "following" : "follower";
    const listed = kind === "followers" ? "follower" : "following";
    const filter = { [ownerSide]: owner._id, ...(access === "self" ? { [listed]: viewerId } : {}) };
    const skip = parseOffset(req.query.skip);

    const [rows, total] = await Promise.all([
        Follow.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(PAGE_SIZE)
            .populate(listed, MEMBER_FIELDS)
            .lean(),
        Follow.countDocuments(filter),
    ]);

    res.json({
        owner: { _id: owner._id, username: owner.username },
        access,
        users: rows.map((row) => row[listed]).filter(Boolean).map(userSummary),
        total,
        hasMore: skip + rows.length < total,
        next: skip + rows.length,
    });
}

const getFollowers = (req, res) => listFollows(req, res, "followers");
const getFollowing = (req, res) => listFollows(req, res, "following");

module.exports = { followUser, unfollowUser, getFollowers, getFollowing };
