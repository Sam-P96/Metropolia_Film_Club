const { LoanError } = require("../utils/loanShark/account");
const { adminLists, searchMembers, addToList, removeFromList } = require("../utils/loanShark/admin");

// The admin page /SECRETloanshark (routes/loanSharkAdminRouter.js): who
// King Loan Shark's jobs can pick. Adding and removing answer with every
// column as it now is, so the page updates straight away.

async function handle(res, work) {
    try {
        await work();
    } catch (error) {
        if (!(error instanceof LoanError)) throw error;
        res.status(error.status).json({ error: error.message });
    }
}

const getLists = (req, res) => handle(res, async () => res.json(await adminLists()));

const search = (req, res) => handle(res, async () => res.json(await searchMembers(req.query.q)));

const addMember = (req, res) =>
    handle(res, async () => {
        await addToList(req.params.list, req.body?.userId, req.user._id);
        res.status(201).json(await adminLists());
    });

const removeMember = (req, res) =>
    handle(res, async () => {
        await removeFromList(req.params.list, req.params.userId);
        res.json(await adminLists());
    });

module.exports = { getLists, search, addMember, removeMember };
