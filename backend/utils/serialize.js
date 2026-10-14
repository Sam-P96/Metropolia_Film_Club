// Shapes database documents into what the frontend reads. Every function here
// takes a plain object (a .lean() result), never a Mongoose document.

const DEFAULT_BANNER = { type: "color", color: "#2D1B47", imageUrl: null, style: "opaque" };

// Accounts created before the banner became an object stored it flattened:
// reviewCardBanner: "color", value: "#2D1B47". Read both shapes.
function bannerOf(user) {
    const banner = user.reviewCardBanner;

    if (banner && typeof banner === "object") {
        return { ...DEFAULT_BANNER, ...banner };
    }

    return { ...DEFAULT_BANNER, color: user.value || DEFAULT_BANNER.color };
}

// Older accounts have no joinedAt either, but every ObjectId carries the
// moment it was created.
function joinedAtOf(user) {
    return user.joinedAt ?? user._id.getTimestamp();
}

// Enough to draw a name, avatar and review card. Safe to show anyone.
function userSummary(user) {
    if (!user) return null;

    return {
        _id: user._id,
        username: user.username,
        role: user.role ?? "user",
        memberTitle: user.memberTitle ?? "Member",
        avatarUrl: user.avatarUrl ?? null,
        reviewCardBanner: bannerOf(user),
    };
}

// The full profile page. Never includes the email or password.
function userProfile(user) {
    return {
        ...userSummary(user),
        bio: user.bio ?? "",
        privacy: user.privacy ?? "public",
        favouriteFilms: user.favouriteFilms ?? [],
        joinedAt: joinedAtOf(user),
    };
}

// What a private profile shows to everyone but its owner.
function restrictedProfile(user) {
    return {
        ...userSummary(user),
        privacy: user.privacy,
        restricted: true,
    };
}

// A review with its author attached, the shape ReviewCard expects.
// `review.user` must already be populated.
function reviewWithUser(review) {
    const { user, ...rest } = review;

    return { ...rest, userId: user?._id ?? null, user: userSummary(user) };
}

module.exports = {
    userSummary,
    userProfile,
    restrictedProfile,
    reviewWithUser,
};
