const mongoose = require("mongoose");
const User = require("../models/userModel");
const { WalletError } = require("../utils/wallet");
const loans = require("../utils/loanShark");

// Loan Shark's routes (routes/loanSharkRouter.js). Every rule is checked
// in utils/loanShark/, never trusted from the page; these only read the
// request and send back the page's new state (or the error).

// LoanError and WalletError both carry the status to send.
function handled(res, error) {
    if (error instanceof loans.LoanError || error instanceof WalletError) {
        res.status(error.status).json({ error: error.message });
        return true;
    }
    return false;
}

// Runs `work`, then answers with what it did and the page as it is now.
function act(work, status = 200) {
    return async (req, res) => {
        try {
            const done = await work(req);
            res.status(status).json({ done, view: await loans.loanSharkView(req.user) });
        } catch (error) {
            if (!handled(res, error)) throw error;
        }
    };
}

const amountOf = (req) => Number(req.body?.amount);

const getLoanShark = async (req, res) => {
    res.json(await loans.loanSharkView(req.user));
};

const borrowFromShark = act((req) => loans.sharkBorrow(req.user._id, amountOf(req)));
const payShark = act((req) => loans.sharkPay(req.user._id, amountOf(req)));
const postOffer = act(
    (req) =>
        loans.postOffer(req.user._id, {
            style: req.body?.style,
            amount: amountOf(req),
            rate: Number(req.body?.rate),
        }),
    201,
);
const takeDownOffer = act((req) => loans.takeDownOffer(req.user._id, req.params.id));
const borrowFromOffer = act((req) => loans.borrowFromOffer(req.user._id, req.params.id, amountOf(req)));
const payOffDebt = act((req) => loans.payOffDebt(req.user._id, req.params.id));

// Admins only: run the next 12:00 check now, for themselves or the member
// named in `username`.
const testCheck = act(async (req) => {
    const name = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    let target = req.user._id;
    if (name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const user = await User.findOne({ username: new RegExp(`^${escaped}$`, "i") }).select("_id").lean();
        if (!user) throw new loans.LoanError(`There's no member called ${name}.`, 404);
        target = user._id;
    }
    if (!mongoose.isValidObjectId(target)) throw new loans.LoanError("Pick a member.");
    return loans.testCheck(target);
});

module.exports = { getLoanShark, borrowFromShark, payShark, postOffer, takeDownOffer, borrowFromOffer, payOffDebt, testCheck };
