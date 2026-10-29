const mongoose = require("mongoose");
const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const Comment = require("../models/commentModel");
const FilmLog = require("../models/filmLogModel");
const Event = require("../models/eventModel");
const PasswordReset = require("../models/passwordResetModel");
const bcrypt = require("bcryptjs");
const { sessionFor } = require("../utils/session");
const { MEMBER_FIELDS, userSummary, userProfile, restrictedProfile } = require("../utils/serialize");
const { withStanding } = require("../utils/level");
const { recountDislikes } = require("../utils/pvp");
const Follow = require("../models/followModel");
const { areFriends, followState } = require("../utils/follows");
const { forgetMember, noteEnabledPvp, forgetPvp } = require("../utils/notify");
const Report = require("../models/reportModel");
const { BAN_RIGHTS, bansOf } = require("../utils/bans");
const { hasRole, outranks } = require("../middleware/auth");
const { parseOffset } = require("../utils/paging");

const MAX_FAVOURITES = 4;
const MAX_USERNAME_LENGTH = 30;
const MAX_BIO_LENGTH = 300;
const BANNER_TYPES = ["color", "image"];
const BANNER_STYLES = ["glass", "translucent", "opaque"];
const LEVEL_EFFECTS = ["none", "shadow", "glow"];
const LEVEL_BACKINGS = ["none", "glass", "frosted"];
const LEVEL_SHAPES = ["round", "rounded", "sharp"];
// Matches frontend/src/utils/levelStyle.js.
const LEVEL_FONTS = ["default", "bebas", "cinzel", "playfair", "orbitron", "pixel", "monoton", "pacifico", "marker"];
const PRIVACY_OPTIONS = ["public", "friends", "private"];
const FOLLOW_PRIVACY_OPTIONS = ["public", "friends", "nobody"];
const FEED_BACKGROUNDS = ["default", "white", "dark"];

// Bump this when the privacy policy text changes, so a member's stored
// consent records which version they agreed to. Matches frontend/src/pages/Privacy.jsx.
const PRIVACY_POLICY_VERSION = "2026-10-23";

const signupUser = async (req, res) => {
    const { username, email, password, acceptedPrivacyPolicy } = req.body;
    try {
        //Check missing info
        if (!username || !email || !password) {
            res.status(400);
            throw new Error("Please add all fields");
        }

        // GDPR: no account without explicit agreement to the privacy policy.
        if (!acceptedPrivacyPolicy) {
            res.status(400);
            throw new Error("Please accept the privacy policy to sign up.");
        }

        // Is the email taken?
        const userExists = await User.findOne({email})

        if (userExists) {
            res.status(400);
            throw new Error("User already exists")
        }

        // Hash the password, remember to use genSalt and NOT genSalt**Sync**
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            consent: {
                acceptedPrivacyPolicy: true,
                acceptedAt: new Date(),
                policyVersion: PRIVACY_POLICY_VERSION,
            },
        });

        // Send back a token
        if (user) {
            res.status(201).json(sessionFor(user))
        } else {
            res.status(400);
            throw new Error("Invalid user data");
        }
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}


const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.status(200).json(sessionFor(user));
        } else {
            res.status(400);
            throw new Error("Invalid credentials")
        }
    }
    catch (error) {
        res.status(400).json({ error: error.message })
    }
}

// Everyone in the club, A to Z. Used by the members page and the search.
const getUsers = async (req, res) => {
    const users = await User.find()
        .select("-password -email")
        .collation({ locale: "en" })
        .sort({ username: 1 })
        .lean();

    res.json(users.map(userSummary));
}

// Finds the profile in the URL, and works out whether the person asking may
// see all of it: its owner, anyone if it's public, and friends (members who
// follow each other) if it's friends only.
async function loadProfile(req) {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return { user: null };

    const user = await User.findById(id).select("-password -email").lean();
    if (!user) return { user: null };

    const isOwner = req.user && String(req.user._id) === String(user._id);
    const privacy = user.privacy ?? "public";
    const visible =
        isOwner ||
        privacy === "public" ||
        (privacy === "friends" && (await areFriends(req.user?._id, user._id)));

    return { user, visible };
}

const getUser = async (req, res) => {
    const { user, visible } = await loadProfile(req);

    if (!user) {
        return res.status(404).json({ error: "There is no member with that id." });
    }

    // Follow counts and the Follow button show on private profiles too, or
    // nobody could ever become friends with a friends-only member.
    const follows = await followState(user, req.user);

    // Moderators and admins see a member's bans, and the Ban Hammer if they
    // outrank them. Admins can also delete the account from there.
    const staff = hasRole(req.user, "moderator")
        ? {
            bans: bansOf(user),
            canBan: outranks(req.user, user),
            canDelete: hasRole(req.user, "admin") && outranks(req.user, user),
        }
        : {};

    res.json(
        visible
            ? { ...(await withStanding(userProfile(user))), ...follows, ...staff }
            : { ...restrictedProfile(user), ...follows, ...staff }
    );
}

// The Ban Hammer: moderators and admins switching a member's bans on or off,
// one or more at a time ({ comments: true }), on members they outrank.
// Resolves to { bans }.
const setBans = async (req, res) => {
    const { id } = req.params;
    const target = mongoose.isValidObjectId(id) ? await User.findById(id).select("role").lean() : null;

    if (!target) {
        return res.status(404).json({ error: "There is no member with that id." });
    }

    if (!outranks(req.user, target)) {
        return res.status(403).json({ error: "You can only ban members below you." });
    }

    const set = {};
    for (const right of BAN_RIGHTS) {
        if (!(right in (req.body ?? {}))) continue;
        if (typeof req.body[right] !== "boolean") {
            return res.status(400).json({ error: `${right} must be true or false.` });
        }
        set[`bans.${right}`] = req.body[right];
    }

    if (Object.keys(set).length === 0) {
        return res.status(400).json({ error: "Nothing to change." });
    }

    const user = await User.findByIdAndUpdate(id, { $set: set }, { returnDocument: "after" }).select("bans").lean();
    res.json({ bans: bansOf(user) });
}

// The Banned List, for moderators and admins: everyone with at least one
// ban, A to Z, 10 at a time. { users, total, hasMore, next }.
const getBanned = async (req, res) => {
    const filter = { $or: BAN_RIGHTS.map((right) => ({ [`bans.${right}`]: true })) };
    const skip = parseOffset(req.query.skip);

    const [users, total] = await Promise.all([
        User.find(filter)
            .select(`${MEMBER_FIELDS} bans`)
            .collation({ locale: "en" })
            .sort({ username: 1 })
            .skip(skip)
            .limit(10)
            .lean(),
        User.countDocuments(filter),
    ]);

    res.json({
        users: users.map((user) => ({ ...userSummary(user), bans: bansOf(user) })),
        total,
        hasMore: skip + users.length < total,
        next: skip + users.length,
    });
}

// Reviews show up around the site whatever the profile's privacy setting,
// so these are public too.
const getUserReviews = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(404).json({ error: "There is no member with that id." });
    }

    const reviews = await Review.find({ user: id }).sort({ createdAt: -1 }).lean();
    const withVotes = await Review.withMyVote(reviews, req.user);
    res.json(withVotes.map((review) => ({ ...review, userId: review.user })));
}

// Their film list is part of the profile, so it follows the privacy setting.
const getUserFilms = async (req, res) => {
    const { user, visible } = await loadProfile(req);

    if (!user) {
        return res.status(404).json({ error: "There is no member with that id." });
    }

    if (!visible) {
        return res.status(403).json({ error: "This profile is private." });
    }

    const [entries, reviews] = await Promise.all([
        FilmLog.find({ user: user._id }).lean(),
        Review.find({ user: user._id }).select("tmdbId").lean(),
    ]);

    // Which entries have a written review to link to.
    const reviewIds = new Map(reviews.map((review) => [review.tmdbId, review._id]));

    res.json(
        entries.map((entry) => ({
            ...entry,
            userId: entry.user,
            reviewId: reviewIds.get(entry.tmdbId) ?? null,
        }))
    );
}

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

// Turns the request body into a $set, keeping only the fields a member may
// change about themselves. Returns { error } for the first bad value.
function profileChanges(body, me) {
    const set = {};

    // Only checked when it actually changes, so a name picked before these
    // rules existed doesn't stop the member saving anything else.
    if ("username" in body) {
        const username = String(body.username ?? "").trim();

        if (username !== me.username) {
            if (!username || username.length > MAX_USERNAME_LENGTH) {
                return { error: `Your username must be 1 to ${MAX_USERNAME_LENGTH} characters.` };
            }
            set.username = username;
        }
    }

    if ("bio" in body) {
        const bio = String(body.bio ?? "").trim();
        if (bio.length > MAX_BIO_LENGTH) return { error: `Your bio can be at most ${MAX_BIO_LENGTH} characters.` };
        set.bio = bio;
    }

    if ("privacy" in body) {
        if (!PRIVACY_OPTIONS.includes(body.privacy)) return { error: "Unknown privacy setting." };
        set.privacy = body.privacy;
    }

    if ("feedBackground" in body) {
        if (!FEED_BACKGROUNDS.includes(body.feedBackground)) return { error: "Unknown Notifications background." };
        set.feedBackground = body.feedBackground;
    }

    if ("followPrivacy" in body) {
        if (!FOLLOW_PRIVACY_OPTIONS.includes(body.followPrivacy)) {
            return { error: "Unknown setting for who can see your followers." };
        }
        set.followPrivacy = body.followPrivacy;
    }

    if ("memberTitle" in body) {
        const title = String(body.memberTitle ?? "").trim();
        if (!title || title.length > 40) return { error: "Your title must be 1 to 40 characters." };
        set.memberTitle = title;
    }

    if ("avatarUrl" in body) {
        const url = String(body.avatarUrl ?? "").trim() || null;
        if (url && !isHttpUrl(url)) return { error: "The avatar link must start with http:// or https://." };
        set.avatarUrl = url;
    }

    if ("reviewCardBanner" in body) {
        const banner = body.reviewCardBanner ?? {};
        const imageUrl = String(banner.imageUrl ?? "").trim() || null;

        if (!BANNER_TYPES.includes(banner.type)) return { error: "Unknown banner type." };
        if (!BANNER_STYLES.includes(banner.style ?? "opaque")) return { error: "Unknown banner style." };
        if (!/^#[0-9a-f]{6}$/i.test(banner.color ?? "")) return { error: "The banner colour must look like #2D1B47." };
        if (imageUrl && !isHttpUrl(imageUrl)) return { error: "The banner image link must start with http:// or https://." };

        set.reviewCardBanner = {
            type: banner.type,
            color: banner.color,
            imageUrl,
            style: banner.style ?? "opaque",
        };
    }

    for (const field of ["pvp", "allowComments", "showRank"]) {
        if (field in body) {
            if (typeof body[field] !== "boolean") return { error: `${field} must be true or false.` };
            set[field] = body[field];
        }
    }

    if ("levelStyle" in body) {
        const style = body.levelStyle ?? {};

        if (!/^#[0-9a-f]{6}$/i.test(style.textColor ?? "")) return { error: "The level text colour must look like #FFFFFF." };
        if (!/^#[0-9a-f]{6}$/i.test(style.effectColor ?? "")) return { error: "The level effect colour must look like #000000." };
        if (!LEVEL_EFFECTS.includes(style.effect)) return { error: "Unknown level effect." };
        if (!LEVEL_FONTS.includes(style.font)) return { error: "Unknown level font." };
        if (!LEVEL_BACKINGS.includes(style.backing)) return { error: "Unknown level backing." };
        if (!LEVEL_SHAPES.includes(style.shape)) return { error: "Unknown level backing shape." };

        set.levelStyle = {
            textColor: style.textColor,
            effect: style.effect,
            effectColor: style.effectColor,
            backing: style.backing,
            shape: style.shape,
            font: style.font,
        };
    }

    if ("favouriteFilms" in body) {
        const films = Array.isArray(body.favouriteFilms) ? body.favouriteFilms : [];
        if (films.length > MAX_FAVOURITES) return { error: `Pick at most ${MAX_FAVOURITES} favourite films.` };

        const cleaned = films.map((film) => ({
            tmdbId: Number(film?.tmdbId),
            title: String(film?.title ?? "").trim(),
            posterPath: film?.posterPath ? String(film.posterPath) : null,
        }));

        if (cleaned.some((film) => !Number.isInteger(film.tmdbId) || !film.title)) {
            return { error: "One of the favourite films is missing its id or title." };
        }

        set.favouriteFilms = cleaned;
    }

    return { set };
}

const updateMe = async (req, res) => {
    const { set, error } = profileChanges(req.body ?? {}, req.user);

    if (error) {
        return res.status(400).json({ error });
    }

    // Two members with the same name would be impossible to tell apart, so
    // case doesn't count: "sam" can't take "Sam".
    if (set.username) {
        const taken = await User.exists({ username: set.username, _id: { $ne: req.user._id } })
            .collation({ locale: "en", strength: 2 });

        if (taken) {
            return res.status(400).json({ error: "That username is already taken." });
        }
    }

    // $unset clears the flattened banner colour older accounts still carry.
    // `value` isn't in the schema any more, so Mongoose would drop it from the
    // update unless strict is off. Everything in `set` is already whitelisted.
    await User.updateOne(
        { _id: req.user._id },
        { $set: set, $unset: { value: "" } },
        { runValidators: true, strict: false }
    );

    // Their dislikes only count while PVP is on, and everyone hears when
    // they turn it on (and stops hearing it if they turn it off).
    if ("pvp" in set && set.pvp !== Boolean(req.user.pvp)) {
        await recountDislikes({ dislikedBy: req.user._id });
        await (set.pvp ? noteEnabledPvp(req.user._id) : forgetPvp(req.user._id));
    }

    const user = await User.findById(req.user._id).select("-password -email").lean();
    res.json({ ...(await withStanding(userProfile(user))), ...(await followState(user, req.user)) });
}

// GDPR right of access / portability: everything we hold about the member,
// as a JSON download. Includes their email (it's their own data); never the
// password hash.
const exportMe = async (req, res) => {
    const userId = req.user._id;

    const [account, reviews, comments, filmLogs] = await Promise.all([
        User.findById(userId).select("-password").lean(),
        Review.find({ user: userId }).lean(),
        Comment.find({ user: userId }).lean(),
        FilmLog.find({ user: userId }).lean(),
    ]);

    if (!account) {
        return res.status(404).json({ error: "Account not found." });
    }

    res.json({
        exportedAt: new Date().toISOString(),
        account,
        reviews,
        comments,
        filmLogs,
    });
}

// Deletes an account and everything tied to it: their reviews (with the
// comments under them), comments, film logs, follows, reports, password
// reset requests and notifications, and their likes and dislikes on everyone
// else's reviews and comments, so the counts stay right. They leave every
// event's Attending and Interested lists and seat plan; events they posted
// stay. `user` needs _id and pvp. Irreversible.
async function deleteAccount(user) {
    const userId = user._id;

    await Review.removeVotesBy(user);
    await Comment.removeVotesBy(user);

    const ownReviewIds = (await Review.find({ user: userId }).select("_id").lean()).map((review) => review._id);
    await Comment.deleteMany({ $or: [{ user: userId }, { review: { $in: ownReviewIds } }] });

    await forgetMember(userId, ownReviewIds);
    await Report.deleteMany({ $or: [{ reporter: userId }, { review: { $in: ownReviewIds } }] });
    await Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] });
    await Event.updateMany(
        { $or: [{ attending: userId }, { interested: userId }, { "seats.user": userId }] },
        { $pull: { attending: userId, interested: userId, seats: { user: userId } } },
        { timestamps: false }
    );
    await PasswordReset.deleteMany({ user: userId });

    await Review.deleteMany({ user: userId });
    await FilmLog.deleteMany({ user: userId });
    await User.deleteOne({ _id: userId });
}

// GDPR right to erasure: the member deleting their own account.
const deleteMe = async (req, res) => {
    try {
        await deleteAccount(req.user);
        res.json({ deleted: true });
    } catch (error) {
        res.status(500).json({ error: "Could not delete your account. Please try again." });
    }
}

// Admins deleting someone else's account from the Ban Hammer, after
// confirming three times. Only members they outrank, so never another admin.
const deleteUser = async (req, res) => {
    const { id } = req.params;
    const target = mongoose.isValidObjectId(id) ? await User.findById(id).select("username role pvp").lean() : null;

    if (!target) {
        return res.status(404).json({ error: "There is no member with that id." });
    }

    if (!outranks(req.user, target)) {
        return res.status(403).json({ error: "You can only delete members below you." });
    }

    try {
        await deleteAccount(target);
        res.json({ deleted: true });
    } catch (error) {
        res.status(500).json({ error: `Could not delete ${target.username}'s account. Please try again.` });
    }
}

module.exports = {
    signupUser,
    loginUser,
    getUsers,
    getUser,
    setBans,
    getBanned,
    getUserReviews,
    getUserFilms,
    updateMe,
    exportMe,
    deleteMe,
    deleteUser,
}