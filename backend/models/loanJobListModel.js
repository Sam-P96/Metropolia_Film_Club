const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member an admin has put on one of the Loan Shark job lists by hand
// (/SECRETloanshark, utils/loanShark/jobLists.js). One each at most, so
// putting someone on one list takes them off the other.
//   persuasion  can be picked as X ("Convince X to...") for dislike and
//               steal jobs, even if they're active
//   protected   never picked as X for any job (they can still be the
//               target, Y, if they have PvP on)
const loanJobListSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true, unique: true},
    list: {type: String, enum: ["persuasion", "protected"], required: true},
    addedBy: {type: Schema.Types.ObjectId, ref: "User", default: null},
    addedAt: {type: Date, default: Date.now},
});

module.exports = mongoose.model("LoanJobList", loanJobListSchema);
