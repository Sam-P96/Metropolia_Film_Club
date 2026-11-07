// Undoes payouts used up by Loan Shark's admin test button ("Run the next
// 12:00 check"), which pays a future day's payout early and marks that day
// paid, so the real 12:00 payout skips it. If the member was at their PP
// cap when they pressed it, that early payout gave them nothing at all.
//
// With no member named: every member marked paid for a day after today
// goes back to yesterday, and gets today's payout now.
// With --member NAME: that member goes back to yesterday and gets today's
// payout now, as long as no payout reached them at today's 12:00 run (so
// nobody is ever paid twice for a day).
//
// They keep anything the test presses gave them. Their Loan Shark check
// days are left alone: those days' checks already ran during the test,
// and running them again would double any missed-payment penalties.
//
// From backend/, on the database in .env (MONGO_URI):
//   node scripts/reset-payout-days.js                        what it would change
//   node scripts/reset-payout-days.js --apply                change it, and pay today
//   node scripts/reset-payout-days.js --member Sam-P96       the same, for one member
//   node scripts/reset-payout-days.js --member Sam-P96 --apply
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), quiet: true });
const mongoose = require("mongoose");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const memberName = args.includes("--member") ? args[args.indexOf("--member") + 1] : null;

async function main() {
    // No index building on connect: this only touches wallets.
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
    const { helsinkiDay, payMember } = require("../utils/wallet");
    const { addDays, noonOf } = require("../utils/loanShark/math");
    const { lockedInOffers } = require("../utils/loanShark/daily");
    const Review = require("../models/reviewModel");
    const users = mongoose.connection.db.collection("users");
    const receipts = mongoose.connection.db.collection("wallettxes");

    const today = helsinkiDay();
    const yesterday = addDays(today, -1);
    console.log(`Today is ${today} in Helsinki.`);

    // Where everyone's payouts are at, and today's receipts.
    const days = await users.aggregate([{ $group: { _id: "$wallet.lastPayoutDay", members: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 6 }]).toArray();
    console.log(`Members by the last day they were paid: ${days.map((row) => `${row._id ?? "never"}: ${row.members}`).join(", ")}`);
    const paidSinceNoon = { reason: "dailyPayout", at: { $gte: noonOf(today) } };
    console.log(`Payout receipts since 12:00 today: ${await receipts.countDocuments(paidSinceNoon)}.`);

    let targets;
    if (memberName) {
        const user = await users.findOne(
            { username: memberName },
            { projection: { username: 1, "wallet.lastPayoutDay": 1 }, collation: { locale: "en", strength: 2 } },
        );
        if (!user) {
            console.log(`There's no member called ${memberName}.`);
            return;
        }
        console.log(`  ${user.username}: marked paid up to ${user.wallet?.lastPayoutDay ?? "never"}`);
        if (await receipts.findOne({ ...paidSinceNoon, user: user._id })) {
            console.log("  Today's 12:00 payout already reached them. Nothing to do.");
            return;
        }
        if ((user.wallet?.lastPayoutDay ?? "") < today) {
            console.log("  They aren't marked paid for today, so the payout isn't blocked: it'll reach them at the next run (or a server restart after 12:00).");
            return;
        }
        targets = [user];
    } else {
        targets = await users.find({ "wallet.lastPayoutDay": { $gt: today } }).project({ username: 1, "wallet.lastPayoutDay": 1 }).toArray();
        if (targets.length === 0) {
            console.log("Nobody is paid ahead. Nothing to do.");
            return;
        }
        for (const user of targets) console.log(`  ${user.username}: marked paid up to ${user.wallet.lastPayoutDay}`);
    }

    if (!apply) {
        console.log(`Dry run: nothing changed. Run with --apply to set ${targets.length === 1 ? "them" : `these ${targets.length}`} back to ${yesterday} and pay today.`);
        return;
    }

    const locked = await lockedInOffers();
    for (const user of targets) {
        await users.updateOne({ _id: user._id, "wallet.lastPayoutDay": user.wallet.lastPayoutDay }, { $set: { "wallet.lastPayoutDay": yesterday } });
        const reviews = await Review.countDocuments({ user: user._id });
        const result = await payMember(user._id, today, { reviews, locked: locked.get(String(user._id)) ?? 0 });
        console.log(
            result
                ? `  ${user.username}: back to ${yesterday}, then paid today: ${result.credited} into the wallet (${result.daily} daily PP, ${result.deducted} to loans).`
                : `  ${user.username}: back to ${yesterday}; today's payout had already reached them.`,
        );
    }
}

main()
    .catch((error) => {
        console.error("Reset failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
