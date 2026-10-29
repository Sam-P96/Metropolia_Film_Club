// What moderators and admins can stop a member doing with the Ban Hammer,
// each on its own. Matches frontend/src/utils/bans.js.
const BAN_RIGHTS = ["reviews", "dislikeReviews", "comments", "dislikeComments", "reports", "cuts"];

const BAN_MESSAGES = {
    reviews: "You've been banned from posting reviews.",
    dislikeReviews: "You've been banned from disliking reviews.",
    comments: "You've been banned from commenting.",
    dislikeComments: "You've been banned from disliking comments.",
    reports: "You've been banned from reporting reviews.",
    cuts: "You've been banned from posting cuts.",
};

// Why `user` can't do `right` (one of BAN_RIGHTS), or null if they can.
function banRefusal(user, right) {
    return user?.bans?.[right] ? BAN_MESSAGES[right] : null;
}

// Every ban, true or false, for a member who may have none stored.
function bansOf(user) {
    return Object.fromEntries(BAN_RIGHTS.map((right) => [right, Boolean(user.bans?.[right])]));
}

module.exports = { BAN_RIGHTS, banRefusal, bansOf };
