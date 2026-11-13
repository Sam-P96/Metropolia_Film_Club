// The admin "Send P-PP" tool's limits, read by the server
// (backend/utils/admin.js) and the form (frontend components/admin/SendPpp.jsx).
//   max      the most one send can be, so a slip of the finger can't add a
//            zero too many
//   maxNote  the longest note the member sees with it, in characters
export const ADMIN_GRANT = Object.freeze({ max: 1_000_000, maxNote: 200 })
