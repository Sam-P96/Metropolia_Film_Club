const jwt = require("jsonwebtoken");

// Logins last 3 days. The frontend logs the member out when the server turns
// an expired one down (frontend/src/utils/currentUser.js).
function generateToken(_id) {
    return jwt.sign({ _id }, process.env.SECRET, { expiresIn: "3d" });
}

// What logging in, signing up and resetting a password send back, which the
// frontend keeps in localStorage as the logged-in member.
function sessionFor(user) {
    return {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        pvp: user.pvp ?? false,
        feedBackground: user.feedBackground ?? "default",
        token: generateToken(user._id),
    };
}

module.exports = { sessionFor };
