const crypto = require("crypto");
const Review = require("../../models/reviewModel");
const OrcaPlayer = require("../../models/orcaPlayerModel");
const OrcaJob = require("../../models/orcaJobModel");
const SCRIPTS = require("../../data/lordGangOrcaScripts");
const { LORD_GANG_ORCA } = require("../../config/lordGangOrca");
const { WalletError, changeWallet, dailyPp, ppCap } = require("../wallet");
const { clockOf, isOpen, nextMidnight, nextOpening, today } = require("./clock");
const jobs = require("./jobs");

// Lord Gang Orca, the mob boss on the Games page: members beg him for PP
// (three times a day, an hour apart, while he's open), now and then he asks
// a question instead, and once a member's begs reach their secret
// threshold, he wants favours (jobs.js) before he pays again. He never
// takes anything back. Everything is decided here, on the server: the page
// is sent what to show, never the threshold or a question's answer.

const BEG = LORD_GANG_ORCA.beg;
const FAVOUR = LORD_GANG_ORCA.favour;

class OrcaError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Random numbers from crypto for everything he decides.
const secure = () => crypto.randomInt(2 ** 32) / 2 ** 32;
const pickFrom = (items, random = secure) => items[Math.floor(random() * items.length)];
const shuffled = (items, random = secure) => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
};

// A new secret threshold: a whole number from 150 to 300.
const rollThreshold = (random = secure) => FAVOUR.thresholdMin + Math.floor(random() * (FAVOUR.thresholdMax - FAVOUR.thresholdMin + 1));

// What he says, as a script step.
const orcaSays = (text) => ({ type: "bubble", speaker: "orca", text });
const line = (group, random = secure) => orcaSays(pickFrom(SCRIPTS.lines[group], random));

// A member's record, made the first time they visit.
async function playerOf(userId) {
    return OrcaPlayer.findOneAndUpdate(
        { user: userId },
        { $setOnInsert: { user: userId, threshold: rollThreshold() } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean();
}

const reviewsOf = (userId) => Review.countDocuments({ user: userId });

// One beg's worth: 10% of their daily PP, rounded up, at least 1.
const begAmount = (reviews) => Math.max(1, Math.ceil(dailyPp(reviews) * BEG.share));

// Pays a beg: `pp` in PP, never past their PP cap (reviews x 3, counting PP
// up in loan offers, like the daily payout), and `ppp` in P-PP. Resolves to
// what was paid, { pp, ppp }.
async function pay(userId, reviews, pp, ppp = 0) {
    const { lockedInOffers } = require("../loanShark/daily");
    const locked = (await lockedInOffers()).get(String(userId)) ?? 0;
    const change = await changeWallet(
        userId,
        (wallet) => {
            const room = Math.max(0, ppCap(reviews) - wallet.pp - locked);
            const paid = { pp: Math.min(pp, room), ppp };
            return paid.pp > 0 || paid.ppp > 0 ? paid : null;
        },
        { reason: "orcaBeg" }
    );
    return { pp: change?.pp ?? 0, ppp: change?.ppp ?? 0 };
}

// After a beg is paid: +10 towards the threshold (only the PP part counts),
// and favour mode if it's reached. Returns whether favour mode started.
async function buildUp(userId, now = new Date()) {
    const after = await OrcaPlayer.findOneAndUpdate({ user: userId }, { $inc: { built: FAVOUR.perBeg } }, { returnDocument: "after" }).lean();
    if (!after || after.favour.on || after.built < after.threshold) return false;
    const started = await OrcaPlayer.findOneAndUpdate(
        { user: userId, "favour.on": false },
        { $set: { "favour.on": true, "favour.startedAt": now, "favour.done": 0, "favour.jobsDay": null } },
        { returnDocument: "after" }
    ).lean();
    if (!started) return false;
    await jobs.dealJobs(userId, { now });
    return true;
}

// The question waiting on an answer, as the page sees it: never the answer.
const questionView = (question) => (question ? { question: SCRIPTS.questions[question.index].question, options: question.options } : null);

// Ask the boss: a beg, or why not. Resolves to { steps, paid?, question? }.
async function beg(userId, { now = new Date(), random = secure } = {}) {
    const reviews = await reviewsOf(userId);
    let player = await playerOf(userId);
    if (reviews < 1) return { steps: [line("noReviews", random)] };
    if (!isOpen(clockOf(now, player.fakeClock))) throw new OrcaError("He's not in. Come back Monday to Friday, from 16:00.", 409);
    if (player.question) return { steps: [orcaSays(SCRIPTS.questions[player.question.index].question)], question: questionView(player.question) };
    if (player.favour.on) return { steps: [line("favourMode", random)] };

    // A new day: the count starts again.
    const day = today(now);
    if (player.day !== day) {
        player = (await OrcaPlayer.findOneAndUpdate({ user: userId, day: player.day }, { $set: { day, begs: 0 } }, { returnDocument: "after" }).lean()) ?? (await playerOf(userId));
    }
    if (player.begs >= BEG.perDay) return { steps: [line("dailyLimit", random)] };
    const ready = new Date(now.getTime() - BEG.cooldownMs);
    if (player.lastBegAt && player.lastBegAt > ready) {
        return { steps: [line("cooldown", random)], cooldownUntil: new Date(player.lastBegAt.getTime() + BEG.cooldownMs) };
    }

    // Claimed, so two clicks can't both beg.
    const amount = begAmount(reviews);
    const asking = player.forceQuestion || random() < BEG.questionChance;
    let question = null;
    if (asking) {
        const choices = SCRIPTS.questions.map((_, index) => index).filter((index) => index !== player.lastQuestion);
        const index = pickFrom(choices, random);
        question = { index, options: shuffled(SCRIPTS.questions[index].options, random), amount, askedAt: now };
    }
    const claimed = await OrcaPlayer.findOneAndUpdate(
        {
            user: userId,
            day,
            begs: { $lt: BEG.perDay },
            question: null,
            "favour.on": false,
            $or: [{ lastBegAt: null }, { lastBegAt: { $lte: ready } }],
        },
        {
            $inc: { begs: 1 },
            $set: { lastBegAt: now, ...(question && { question, lastQuestion: question.index, forceQuestion: false }) },
        },
        { returnDocument: "after" }
    ).lean();
    if (!claimed) return beg(userId, { now, random });

    if (question) return { steps: [orcaSays(SCRIPTS.questions[question.index].question)], question: questionView(question) };

    const paid = await pay(userId, reviews, amount);
    const steps = [line("beg", random)];
    if (await buildUp(userId, now)) steps.push(line("favourStart", random));
    return { steps, paid };
}

// The answer to his question: `option` is one of the options' text. Right:
// the beg in PP and the same again in P-PP. Wrong: the beg in PP.
async function answer(userId, option, { now = new Date() } = {}) {
    const player = await OrcaPlayer.findOne({ user: userId }).lean();
    if (!player?.question) throw new OrcaError("He hasn't asked you anything.", 409);
    const question = SCRIPTS.questions[player.question.index];
    if (!player.question.options.includes(option)) throw new OrcaError("That wasn't one of the answers.");

    // Answered once only.
    const taken = await OrcaPlayer.findOneAndUpdate({ user: userId, "question.askedAt": player.question.askedAt }, { $set: { question: null } }).lean();
    if (!taken) throw new OrcaError("You've answered that already.", 409);

    const right = option === question.correct;
    const reviews = await reviewsOf(userId);
    const amount = player.question.amount;
    const paid = await pay(userId, reviews, amount, right ? amount : 0);
    const steps = [orcaSays(right ? question.right : question.wrong)];
    if (await buildUp(userId, now)) steps.push(line("favourStart"));
    return { steps, paid, right };
}

// What his page shows. `news`: the lines waiting since their last visit
// (jobs done), shown now and then forgotten. `admin`: their testing tools'
// state too.
async function statusOf(userId, { now = new Date(), takeNews = false, admin = false } = {}) {
    let player = await playerOf(userId);
    if (player.favour.on && player.favour.jobsDay !== today(now)) {
        await jobs.dealJobs(userId, { now });
        player = await playerOf(userId);
    }
    const reviews = await reviewsOf(userId);
    const clock = clockOf(now, player.fakeClock);
    const open = isOpen(clock);
    const begs = player.day === today(now) ? player.begs : 0;
    const cooldownUntil = player.lastBegAt && player.lastBegAt.getTime() + BEG.cooldownMs > now.getTime() ? new Date(player.lastBegAt.getTime() + BEG.cooldownMs) : null;

    let steps = [];
    if (!open) {
        const story = clock.weekday === 0 || clock.weekday === 6 ? SCRIPTS.closed.weekend : SCRIPTS.closed[clock.weekday];
        steps = story.steps;
    } else {
        steps = [line(reviews < 1 ? "noReviews" : "greeting")];
    }
    let news = [];
    if (takeNews && player.news.length > 0) {
        const taken = await OrcaPlayer.findOneAndUpdate({ user: userId }, { $set: { news: [] } }).lean();
        news = (taken?.news ?? []).map((kind) => line(kind));
    }

    return {
        open,
        speaker: open ? "orca" : clock.weekday === 0 || clock.weekday === 6 ? "kaveri" : "dolphine",
        story: open ? null : (clock.weekday === 0 || clock.weekday === 6 ? SCRIPTS.closed.weekend : SCRIPTS.closed[clock.weekday]).title,
        steps,
        news,
        names: SCRIPTS.names,
        reviews,
        begAmount: begAmount(reviews),
        begs: { used: begs, perDay: BEG.perDay },
        cooldownUntil,
        nextOpening: open ? null : nextOpening(now),
        question: questionView(player.question),
        favour: {
            on: player.favour.on,
            done: player.favour.done,
            needed: FAVOUR.needed,
            jobs: player.favour.on ? await jobs.jobsFor(userId, now) : [],
            jobTexts: SCRIPTS.jobs,
            refreshAt: nextMidnight(now),
        },
        ...(admin && {
            debug: {
                fakeClock: player.fakeClock,
                forceQuestion: player.forceQuestion,
                built: player.built,
            },
        }),
    };
}

// The Games page's box: open or not, begs left, the cooldown, favours.
async function summaryOf(userId, now = new Date()) {
    const player = await OrcaPlayer.findOne({ user: userId }).lean();
    const clock = clockOf(now, player?.fakeClock);
    const begs = player?.day === today(now) ? player.begs : 0;
    const cooldownUntil = player?.lastBegAt && player.lastBegAt.getTime() + BEG.cooldownMs > now.getTime() ? new Date(player.lastBegAt.getTime() + BEG.cooldownMs) : null;
    return {
        open: isOpen(clock),
        begs: { used: begs, perDay: BEG.perDay },
        cooldownUntil,
        favour: { on: Boolean(player?.favour?.on), done: player?.favour?.done ?? 0, needed: FAVOUR.needed },
    };
}

// --- admins' testing tools (routes check the admin) ---

const WEEKDAY_OK = (n) => Number.isInteger(n) && n >= 0 && n <= 6;
const HOUR_OK = (n) => Number.isInteger(n) && n >= 0 && n <= 23;

async function debug(userId, action, payload = {}, now = new Date()) {
    await playerOf(userId);
    switch (action) {
        case "clock": {
            const fake = payload.weekday === null || payload.weekday === undefined ? null : { weekday: Number(payload.weekday), hour: Number(payload.hour) };
            if (fake && (!WEEKDAY_OK(fake.weekday) || !HOUR_OK(fake.hour))) throw new OrcaError("A weekday 0 to 6 and an hour 0 to 23.");
            await OrcaPlayer.updateOne({ user: userId }, { $set: { fakeClock: fake } });
            break;
        }
        case "skipCooldown":
            await OrcaPlayer.updateOne({ user: userId }, { $set: { lastBegAt: null } });
            break;
        case "resetBegs":
            await OrcaPlayer.updateOne({ user: userId }, { $set: { begs: 0, lastBegAt: null } });
            break;
        case "forceQuestion":
            await OrcaPlayer.updateOne({ user: userId }, { $set: { forceQuestion: true } });
            break;
        case "forceFavour":
            await OrcaPlayer.updateOne({ user: userId }, { $set: { "favour.on": true, "favour.startedAt": now, "favour.done": 0, "favour.jobsDay": null, question: null } });
            await jobs.dealJobs(userId, { now });
            break;
        case "regenerateJobs":
            await OrcaPlayer.updateOne({ user: userId }, { $set: { "favour.on": true } });
            await jobs.dealJobs(userId, { now, force: true });
            break;
        case "completeJob": {
            const job = await OrcaJob.findOne({ player: userId, status: "open" }).sort({ createdAt: 1 }).lean();
            if (!job) throw new OrcaError("No open job to complete.", 409);
            await jobs.completeJob(job, now);
            break;
        }
        case "endFavour":
            await OrcaPlayer.updateOne({ user: userId }, { $set: { "favour.on": false, "favour.done": 0, "favour.jobsDay": null, built: 0, threshold: rollThreshold() } });
            await OrcaJob.updateMany({ player: userId, status: "open" }, { $set: { status: "cancelled" } });
            break;
        default:
            throw new OrcaError("Unknown testing tool.");
    }
}

// --- their data, and leaving ---

async function orcaDataOf(userId) {
    const [player, jobList] = await Promise.all([
        OrcaPlayer.findOne({ user: userId }).select("-_id -user -fakeClock -forceQuestion").lean(),
        OrcaJob.find({ player: userId }).select("-_id -player").sort({ createdAt: -1 }).lean(),
    ]);
    return { player, jobs: jobList };
}

async function forgetOrcaPlayer(userId) {
    await OrcaPlayer.deleteOne({ user: userId });
    await OrcaJob.deleteMany({ player: userId });
    // Their part in other members' open jobs: those can't be done any more.
    await OrcaJob.updateMany({ status: "open", $or: [{ x: userId }, { y: userId }] }, { $set: { status: "cancelled" } });
}

module.exports = { OrcaError, WalletError, rollThreshold, begAmount, beg, answer, statusOf, summaryOf, debug, orcaDataOf, forgetOrcaPlayer };
