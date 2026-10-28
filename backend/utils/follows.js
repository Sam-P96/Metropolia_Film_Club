const Follow = require("../models/followModel");

// Two members who follow each other.
async function areFriends(a, b) {
    if (!a || !b || String(a) === String(b)) return false;

    const both = await Follow.countDocuments({
        $or: [
            { follower: a, following: b },
            { follower: b, following: a },
        ],
    });

    return both === 2;
}

// How much of `owner`'s Followers and Following lists `viewerId` may see:
// "all", "self" (just their own row: a friend, when the lists are set to
// "nobody"), or "none". Owners and friends can always open them.
function listAccess(owner, viewerId, isFriend) {
    if (viewerId && String(owner._id) === String(viewerId)) return "all";

    const setting = owner.followPrivacy ?? "public";
    if (setting === "public") return "all";
    if (isFriend) return setting === "friends" ? "all" : "self";
    return "none";
}

// Follower and following counts for `owner`, how `viewer` (or null) stands
// with them, and how much of their lists the viewer may open. For the
// profile page. `owner` needs _id and followPrivacy.
async function followState(owner, viewer) {
    const viewerId = viewer?._id ?? null;
    const other = viewerId && String(viewerId) !== String(owner._id);

    const [followerCount, followingCount, isFollowing, followsYou] = await Promise.all([
        Follow.countDocuments({ following: owner._id }),
        Follow.countDocuments({ follower: owner._id }),
        other ? Follow.exists({ follower: viewerId, following: owner._id }) : null,
        other ? Follow.exists({ follower: owner._id, following: viewerId }) : null,
    ]);

    const isFriend = Boolean(isFollowing && followsYou);

    return {
        followerCount,
        followingCount,
        isFollowing: Boolean(isFollowing),
        followsYou: Boolean(followsYou),
        isFriend,
        followListAccess: listAccess(owner, viewerId, isFriend),
    };
}

module.exports = { areFriends, listAccess, followState };
