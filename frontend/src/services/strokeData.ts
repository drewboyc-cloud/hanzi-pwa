/**
 * Loads all stroke data from all-strokes.json and stores in IndexedDB.
 * On first use: fetches ~29MB file from GitHub Pages, saves to IndexedDB.
 * All subsequent uses (online OR offline): reads from IndexedDB instantly.
 */

const DB_NAME = 'hanzi-strokes'
const DB_VERSION = 1
const STORE = 'strokes'
const META_KEY = 'loaded'

let memoryCache: Record<string, unknown> | null = null
let loadingPromise: Promise<Record<string, unknown>> | null = null

function openStrokeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function loadFromIDB(): Promise<Record<string, unknown> | null> {
  const db = await openStrokeDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly')
    const req = t.objectStore(STORE).get(META_KEY)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function saveToIDB(data: Record<string, unknown>): Promise<void> {
  const db = await openStrokeDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite')
    t.objectStore(STORE).put(data, META_KEY)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

async function loadAllStrokes(): Promise<Record<string, unknown>> {
  // 1. Check memory cache
  if (memoryCache) return memoryCache

  // 2. Check IndexedDB
  const cached = await loadFromIDB()
  if (cached) {
    memoryCache = cached
    return cached
  }

  // 3. Fetch from network and save to IndexedDB
  const res = await fetch('/hanzi-pwa/hanzi-data/all-strokes.json')
  if (!res.ok) throw new Error('Failed to fetch stroke data')
  const data = await res.json()
  memoryCache = data

  // Save to IndexedDB in background (don't block the animation)
  saveToIDB(data).catch(err => console.warn('Failed to save strokes to IDB:', err))

  return data
}

export async function getStrokeData(char: string): Promise<unknown> {
  if (!loadingPromise) {
    loadingPromise = loadAllStrokes().catch(err => {
      loadingPromise = null
      throw err
    })
  }
  const all = await loadingPromise
  return all[char] ?? null
}
