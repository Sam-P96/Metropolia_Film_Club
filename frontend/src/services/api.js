import { getCurrentUser } from '../utils/currentUser'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Every request to our own backend goes through here, so the login token,
// JSON and error handling live in one place. Vite proxies /api to port 3000.
export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}

  const token = getCurrentUser()?.token
  if (token) headers.Authorization = `Bearer ${token}`

  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(data?.error ?? `Request failed (${response.status})`, response.status)
  }

  return data
}

// Lists that several components on one page ask for (events, members, film
// stats) are fetched once and shared for a minute, instead of once per
// component. Anything that changes them calls clearCache.
const CACHE_MS = 60 * 1000
const cache = new Map()

export function cachedApi(path) {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise

  const promise = api(path).catch((error) => {
    cache.delete(path) // don't keep a failure around
    throw error
  })

  cache.set(path, { at: Date.now(), promise })
  return promise
}

export function clearCache(path) {
  cache.delete(path)
}
