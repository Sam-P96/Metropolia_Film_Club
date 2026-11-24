import { api } from './api'

// Catflix No Chill over HTTP (backend/routes/catflixRouter.js). The game
// itself is its own page (pages/Catflix.jsx frames it); the site only needs
// pets' looks, for the Games page, profiles and the leaderboard.

// Every pet's looks (Pet Forge's base forms and registered forms), asked
// for once a visit: they only change when an admin makes a new pet.
let forms = null
export function getCatflixForms() {
  forms ??= api('/catflix/forms').catch((error) => {
    forms = null
    throw error
  })
  return forms
}

// Yours: { pet (null before your egg hatches), player, prices, points }.
export function getCatflixMe() {
  return api('/catflix/me')
}

// Pets of these members: { pets: { userId: { _id, name, skinId, aura } } }.
export function getCatflixPets(userIds) {
  return api(`/catflix/pets?users=${userIds.map(encodeURIComponent).join(',')}`)
}

// One member's pet, or null, for the leaderboards' top 3 (LeaderboardRow).
// The rows of a list each ask for their own, so the asks made together go
// to the server as one request, and each answer is kept for a minute.
const PET_MS = 60 * 1000
const petCache = new Map()
let asking = null

export function getCatflixPet(userId) {
  const hit = petCache.get(userId)
  if (hit && Date.now() - hit.at < PET_MS) return hit.promise

  if (!asking) {
    asking = new Map()
    setTimeout(() => {
      const asked = asking
      asking = null
      getCatflixPets([...asked.keys()]).then(
        ({ pets }) => asked.forEach(({ resolve }, id) => resolve(pets?.[id] ?? null)),
        (error) =>
          asked.forEach(({ reject }, id) => {
            petCache.delete(id) // don't keep a failure around
            reject(error)
          })
      )
    })
  }

  const promise = new Promise((resolve, reject) => asking.set(userId, { resolve, reject }))
  petCache.set(userId, { at: Date.now(), promise })
  return promise
}
