import { api } from './api'
import { walletChanged } from './wallet'

// The Black Market (backend/routes/blackMarketRouter.js). getBlackMarket
// resolves to { ppp, reviews, owned: [item ids], wearing: { name, border } };
// buying and wearing resolve to { done, view }: what happened, and that again
// as it now is. The items themselves are in shared/cosmetics/catalogue.js.

export function getBlackMarket() {
  return api('/black-market')
}

// Buys an item with P-PP: { item, price, ppp }.
export async function buyCosmetic(itemId) {
  const result = await api('/black-market/buy', { method: 'POST', body: { itemId } })
  walletChanged()
  return result
}

// Wears an owned item as the name style or border, or takes it off (null).
export function wearCosmetic(type, itemId) {
  return api('/black-market/wear', { method: 'PUT', body: { type, itemId } })
}

// Admins only: may the developer test tool open? 403 if not.
export function checkDevAccess() {
  return api('/black-market/dev')
}
