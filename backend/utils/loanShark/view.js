const User = require("../../models/userModel");
const LoanOffer = require("../../models/loanOfferModel");
const PlayerDebt = require("../../models/playerDebtModel");
const LoanJob = require("../../models/loanJobModel");
const { LOAN_SHARK } = require("../../config/loanShark");
const { dailyPp } = require("../wallet");
const { MEMBER_FIELDS, userSummary } = require("../serialize");
const { loadAccount } = require("./account");
const { reviewsOf, sharkCap } = require("./shark");
const { MAX_RATE: PLAYER_MAX_RATE, playerCap } = require("./player");
const {
    MAX_RATE,
    START_RATE,
    ceilShare,
    checkState,
    debtOwed,
    drawInterest,
    firstUncoveredDay,
    nextCheckDay,
    noonOf,
    percentOf,
    sharkMinimum,
    sharkOwed,
    sharkTotal,
} = require("./math");

// Everything the Loan Shark page shows a member (GET /api/loan-shark),
// worked out here so the page never has to do the sums.

const POSTINGS_LIMIT = 60;

// The numbers from config/loanShark.js the page needs, as whole percent.
function rules() {
    const { shark, jobs, player } = LOAN_SHARK;
    return {
        sharkCapTimesDaily: shark.capTimesDaily,
        sharkStartRate: START_RATE,
        sharkMaxRate: MAX_RATE,
        minimumPayment: percentOf(shark.minimumPayment),
        collectorTake: percentOf(shark.collectorTake),
        jobReduction: percentOf(jobs.reduction),
        jobsPerLoan: jobs.perLoan,
        dislikeHours: jobs.dislikeHours,
        playerCapTimesDaily: player.capTimesDaily,
        maxLenders: player.maxLenders,
        autoRepay: percentOf(player.autoRepay),
        tax: percentOf(player.tax),
        maxOffers: player.maxOffers,
        minDraw: player.minDraw,
        playerMaxRate: PLAYER_MAX_RATE,
        maxOffer: player.maxOffer,
    };
}

async function membersById(ids) {
    const unique = [...new Set(ids.filter(Boolean).map(String))];
    const users = await User.find({ _id: { $in: unique } }).select(MEMBER_FIELDS).lean();
    return new Map(users.map((user) => [String(user._id), userSummary(user)]));
}

const FORMER = { _id: null, username: "A former member", avatarUrl: null };

// The shark box: the debt, the countdown, the state the speech bubble and
// warnings go by, and the jobs.
async function sharkView(account, reviews, now) {
    const shark = account.shark;
    const cap = sharkCap(reviews);
    const base = {
        borrowed: shark.borrowed,
        maxBorrow: Math.max(0, cap - shark.borrowed),
        cap,
    };

    if (shark.borrowed === 0) {
        return { ...base, state: "clear", rate: START_RATE, owed: 0, total: 0, paid: 0, jobReduction: 0, minimum: 0, jobs: [] };
    }

    const owed = sharkOwed(shark);
    const nextDay = nextCheckDay(now, account.lastCheckDay);
    const next = checkState(shark, nextDay);
    const dueNext = next.due && !next.covered;
    const collector = shark.rate >= MAX_RATE;
    const state = collector ? "collector" : shark.rate > START_RATE ? "missed" : dueNext ? "due" : "covered";
    const minimum = sharkMinimum(shark);

    const jobs = await LoanJob.find({ borrower: account._id, loan: shark.loan }).sort({ createdAt: 1 }).lean();
    const people = await membersById(jobs.flatMap((job) => [job.x, job.y]));

    return {
        ...base,
        state,
        rate: shark.rate,
        owed,
        total: sharkTotal(shark),
        paid: shark.paid,
        jobReduction: shark.jobReduction,
        minimum,
        credit: shark.credit,
        // What still has to be paid to cover the next check.
        toCoverNext: dueNext ? Math.max(0, minimum - shark.credit) : 0,
        nextCheckAt: noonOf(nextDay),
        // "King Loan Shark leaves you alone for": Kaveri comes every day at
        // the top rate; otherwise, until the first check not paid for.
        leavesAloneUntil: collector ? noonOf(nextDay) : noonOf(firstUncoveredDay(account, now)),
        paidUntil: shark.paidUntil,
        firstDueAt: shark.firstDueAt,
        startedAt: shark.startedAt,
        missed: shark.missed,
        nextRate: Math.min(MAX_RATE, shark.rate * 2),
        warnings: { due: dueNext, missed: shark.rate > START_RATE, collector },
        collectorTakes: collector ? ceilShare(dailyPp(reviews), LOAN_SHARK.shark.collectorTake) : 0,
        // What the next job done would take off.
        jobValue: ceilShare(shark.borrowed, LOAN_SHARK.jobs.reduction),
        jobs: jobs.map((job) => ({
            _id: job._id,
            type: job.type,
            status: job.status,
            x: people.get(String(job.x)) ?? FORMER,
            y: job.y ? (people.get(String(job.y)) ?? FORMER) : null,
            review: job.review,
            filmTitle: job.filmTitle,
            reduction: job.reduction,
            doneAt: job.doneAt,
        })),
    };
}

// The member's player loans, both ways, and everyone else's offers.
async function playerView(userId, reviews, account) {
    const [borrowing, lendingDebts, myOffers, postings] = await Promise.all([
        PlayerDebt.find({ borrower: userId, status: "active" }).sort({ createdAt: 1 }).lean(),
        PlayerDebt.find({ lender: userId, status: "active" }).sort({ createdAt: 1 }).lean(),
        LoanOffer.find({ lender: userId, status: "active" }).sort({ createdAt: -1 }).lean(),
        LoanOffer.find({ status: "active", lender: { $ne: userId } }).sort({ createdAt: -1 }).limit(POSTINGS_LIMIT).lean(),
    ]);

    const people = await membersById([
        ...borrowing.map((debt) => debt.lender),
        ...lendingDebts.map((debt) => debt.borrower),
        ...postings.map((offer) => offer.lender),
    ]);
    const daily = dailyPp(reviews);
    const cap = playerCap(reviews);
    const autoShare = ceilShare(daily, LOAN_SHARK.player.autoRepay);
    const debtView = (debt, who) => ({
        _id: debt._id,
        [who]: people.get(String(debt[who])) ?? FORMER,
        owed: debtOwed(debt),
        principal: debt.principal,
        interest: debt.interest,
        paid: debt.principalPaid + debt.interestPaid,
        taxBurned: debt.taxBurned,
        draws: debt.draws.length,
        since: debt.createdAt,
    });
    const offerView = (offer) => {
        const example = offer.style === "fixed" ? offer.available : Math.min(LOAN_SHARK.player.minDraw, offer.available);
        return {
            _id: offer._id,
            style: offer.style,
            amount: offer.amount,
            available: offer.available,
            rate: offer.rate,
            createdAt: offer.createdAt,
            example: { borrow: example, payBack: example + drawInterest(example, offer.rate) },
        };
    };

    return {
        owed: account.player.owed,
        cap,
        room: Math.max(0, cap - account.player.owed),
        lenders: account.player.lenders.length,
        autoRepayEach: Math.min(autoShare, daily),
        borrowing: borrowing.map((debt) => debtView(debt, "lender")),
        lending: {
            offers: myOffers.map(offerView),
            borrowers: lendingDebts.map((debt) => debtView(debt, "borrower")),
        },
        postings: postings
            .filter((offer) => people.has(String(offer.lender)))
            .map((offer) => ({ ...offerView(offer), lender: people.get(String(offer.lender)) })),
    };
}

async function loanSharkView(user, now = new Date()) {
    const [account, reviews] = await Promise.all([loadAccount(user._id), reviewsOf(user._id)]);
    const [shark, player] = await Promise.all([sharkView(account, reviews, now), playerView(user._id, reviews, account)]);
    return {
        rules: rules(),
        me: { reviews, dailyPp: dailyPp(reviews), canBorrow: reviews > 0, isAdmin: user.role === "admin" },
        shark,
        player,
        now,
    };
}

module.exports = { rules, loanSharkView };
