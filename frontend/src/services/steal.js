import { api } from './api'

// Steal and Defend (backend/utils/steal/). The server decides every
// question, timer, roll and amount; these only ask and send answers. A
// refusal's error.data.code says why (PVP_OFF, USED_TODAY, SOLD, FROZEN...).

// Every item in the game and the public feed: for anyone.
export const getStealItems = () => api('/steal/items')
export const getStealFeed = () => api('/steal/feed')

// Whether their PvP is on: { pvp, playerClass }.
export const getStealStatus = () => api('/steal/status')

// The hub: player, wallet, inventory, attack status, incoming attacks...
export const getStealHub = () => api('/steal/me')

// PVP is the profile's setting (services/users.js updateMe). What turning it
// off would take back: { steals, owed }.
export const getTakebackPreview = () => api('/steal/pvp/takeback')
export const setStealClass = (playerClass) => api('/steal/class', { method: 'POST', body: { playerClass } })

export const equipItem = (id) => api(`/steal/items/${id}/equip`, { method: 'POST' })
export const unequipItem = (id) => api(`/steal/items/${id}/unequip`, { method: 'POST' })
export const sellItem = (id) => api(`/steal/items/${id}/sell`, { method: 'POST' })

// The people they follow, each { user, available, reason, follow, amounts }.
export const getTargets = () => api('/steal/targets')
export const getStealHistory = () => api('/steal/history')

// Starts an attack; resolves to the attack as the attacker sees it.
export const startAttack = (victim, percent) => api('/steal/attacks', { method: 'POST', body: { victim, percent } })
export const getAttack = (id) => api(`/steal/attacks/${id}`)
// Resolves to { right, retry, attack }.
export const answerQuestion = (id, index, answer) => api(`/steal/attacks/${id}/answer`, { method: 'POST', body: { index, answer } })

export const getShop = () => api('/steal/shop')
export const buyListing = (id) => api(`/steal/shop/${id}/buy`, { method: 'POST' })

export const getMarket = () => api('/steal/market')
export const listItem = (item, price) => api('/steal/market', { method: 'POST', body: { item, price } })
export const cancelListing = (id) => api(`/steal/market/${id}`, { method: 'DELETE' })
export const buyFromMarket = (id) => api(`/steal/market/${id}/buy`, { method: 'POST' })

export const getTrades = () => api('/steal/trades')
export const offerTrade = (offer) => api('/steal/trades', { method: 'POST', body: offer })
export const acceptTrade = (id) => api(`/steal/trades/${id}/accept`, { method: 'POST' })
export const declineTrade = (id) => api(`/steal/trades/${id}/decline`, { method: 'POST' })
export const cancelTrade = (id) => api(`/steal/trades/${id}/cancel`, { method: 'POST' })
export const sendItemGift = (to, item) => api('/steal/gifts', { method: 'POST', body: { to, item } })
export const getPlayerItems = (userId) => api(`/steal/players/${userId}/items`)

// Admins.
export const getFlags = (status = 'open') => api(`/steal/admin/flags?status=${status}`)
export const dismissFlag = (id) => api(`/steal/admin/flags/${id}/dismiss`, { method: 'POST' })
export const getBans = () => api('/steal/admin/bans')
export const createBan = (ban) => api('/steal/admin/bans', { method: 'POST', body: ban })
export const liftBan = (id) => api(`/steal/admin/bans/${id}`, { method: 'DELETE' })
// "Reset steal timer": { reset: { at, by } } (null if never), and the reset itself.
export const getAttackReset = () => api('/steal/admin/attack-reset')
export const resetAttacks = () => api('/steal/admin/attack-reset', { method: 'POST' })
