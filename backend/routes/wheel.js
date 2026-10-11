const express = require("express");
const { getEntries, addEntry, clearEntries } = require("../controllers/wheelController");

const router = express.Router();

// No auth for now: anyone can view, add, and clear.
router.get("/", getEntries);
router.post("/", addEntry);
router.delete("/", clearEntries);

module.exports = router;