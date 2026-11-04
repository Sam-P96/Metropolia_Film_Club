// A random id for this browser, kept in localStorage and sent with every
// request as X-Device-Id. Steal and Defend's moderation stores a hash of it
// (with one of the IP) for players with its PvP on, to spot two accounts
// played from one device. It says nothing about the device itself.
const KEY = 'deviceId'

export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return null
  }
}
