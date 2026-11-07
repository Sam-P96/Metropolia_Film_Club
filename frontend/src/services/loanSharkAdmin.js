import { api } from './api'

// /SECRETloanshark (backend/routes/loanSharkAdminRouter.js), admins only:
// who King Loan Shark's jobs can pick. getJobLists resolves to
// { persuasion, reviewPersuasion, protected, targets, hidden, rules }; adding
// and removing resolve to the same, as it now is.

export function getJobLists() {
  return api('/loan-shark/admin/lists')
}

// Members whose username has `q` in it: [{ user, reviews, pvp, list }].
export function searchJobMembers(q) {
  return api(`/loan-shark/admin/search?q=${encodeURIComponent(q)}`)
}

// `list` is 'persuasion' or 'protected'. Adding to one takes them off the other.
export function addToJobList(list, userId) {
  return api(`/loan-shark/admin/lists/${list}`, { method: 'POST', body: { userId } })
}

export function removeFromJobList(list, userId) {
  return api(`/loan-shark/admin/lists/${list}/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}
