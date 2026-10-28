// How many to skip, for "load more". Anything odd counts as 0.
function parseOffset(value) {
    const offset = Number(value);
    return Number.isInteger(offset) && offset > 0 ? offset : 0;
}

module.exports = { parseOffset };
