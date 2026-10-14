const mongoose = require("mongoose");
const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const FilmLog = require("../models/filmLogModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { userSummary, userProfile, restrictedProfile } = require("../utils/serialize");

const MAX_FAVOURITES = 4;
const BANNER_TYPES = ["color", "image"];
const BANNER_STYLES = ["glass", "translucent", "opaque"];
const PRIVACY_OPTIONS = ["public", "friends", "private"];

const generateToken = (_id) => {
    return jwt.sign({ _id }, process.env.SECRET, {
        expiresIn: "3d"
    })
}

const signupUser = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        //Check missing info
        if (!username || !email || !password) {
            res.status(400);
            throw new Error("Please add all fields");
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
        });

        // Send back a token
        if (user) {
            const token = generateToken(user._id);
            res.status(201).json({ _id: user._id, username: user.username, email, role: user.role, token })
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
            const token = generateToken(user._id);
            res.status(200).json({ _id: user._id, username: user.username, email, role: user.role, token });
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
// see all of it. "friends" behaves like "private" until a friends system exists.
async function loadProfile(req) {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return { user: null };

    const user = await User.findById(id).select("-password -email").lean();
    if (!user) return { user: null };

    const isOwner = req.user && String(req.user._id) === String(user._id);
    const visible = isOwner || (user.privacy ?? "public") === "public";

    return { user, visible };
}

const getUser = async (req, res) => {
    const { user, visible } = await loadProfile(req);

    if (!user) {
        return res.status(404).json({ error: "There is no member with that id." });
    }

    res.json(visible ? userProfile(user) : restrictedProfile(user));
}

// Reviews show up around the site whatever the profile's privacy setting,
// so these are public too.
const getUserReviews = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(404).json({ error: "There is no member with that id." });
    }

    const reviews = await Review.find({ user: id }).sort({ createdAt: -1 }).lean();
    res.json(reviews.map((review) => ({ ...review, userId: review.user })));
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
function profileChanges(body) {
    const set = {};

    if ("bio" in body) {
        const bio = String(body.bio ?? "").trim();
        if (bio.length > 500) return { error: "Your bio can be at most 500 characters." };
        set.bio = bio;
    }

    if ("privacy" in body) {
        if (!PRIVACY_OPTIONS.includes(body.privacy)) return { error: "Unknown privacy setting." };
        set.privacy = body.privacy;
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
    const { set, error } = profileChanges(req.body ?? {});

    if (error) {
        return res.status(400).json({ error });
    }

    // $unset clears the flattened banner colour older accounts still carry.
    // `value` isn't in the schema any more, so Mongoose would drop it from the
    // update unless strict is off. Everything in `set` is already whitelisted.
    await User.updateOne(
        { _id: req.user._id },
        { $set: set, $unset: { value: "" } },
        { runValidators: true, strict: false }
    );

    const user = await User.findById(req.user._id).select("-password -email").lean();
    res.json(userProfile(user));
}

module.exports = {
    signupUser,
    loginUser,
    getUsers,
    getUser,
    getUserReviews,
    getUserFilms,
    updateMe,
}