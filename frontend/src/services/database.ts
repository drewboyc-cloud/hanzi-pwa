import type { Character } from './api'

const DB_NAME = 'hanzi-pwa'
const DB_VERSION = 1
const STORE_CHARS = 'characters'
const STORE_META = 'meta'

let _db: IDBDatabase | null = null

// Strip tone numbers (lao3 → lao) and tone diacritics (lǎo → lao) for flexible matching
function normalizePinyin(s: string): string {
  return s
    .replace(/[āáǎà]/g, 'a').replace(/[ēéěè]/g, 'e').replace(/[īíǐì]/g, 'i')
    .replace(/[ōóǒò]/g, 'o').replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜ]/g, 'u')
    .replace(/[1-5]/g, '')  // strip tone numbers
    .trim()
}

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_CHARS)) {
        const store = db.createObjectStore(STORE_CHARS, { keyPath: 'id' })
        store.createIndex('char', 'char', { unique: false })
        store.createIndex('pinyin', 'pinyin', { unique: false })
        store.createIndex('alphabetical', 'pinyin', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META)
      }
    }
    req.onsuccess = () => { _db = req.result; resolve(_db) }
    req.onerror = () => reject(req.error)
  })
}

function tx(storeName: string, mode: IDBTransactionMode = 'readonly') {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName))
}

export const idb = {
  async bulkPutCharacters(chars: Character[]): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE_CHARS, 'readwrite')
      const store = t.objectStore(STORE_CHARS)
      chars.forEach(c => store.put(c))
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
    })
  },

  async getCharacters(search = '', page = 1, limit = 50): Promise<{ items: Character[]; total: number }> {
    const store = await tx(STORE_CHARS)
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => {
        let all: Character[] = req.result
        if (search) {
          const s = normalizePinyin(search.toLowerCase().trim())
          // Split multi-syllable query (e.g. "lao shi") into individual syllables
          const syllables = s.split(/\s+/).filter(Boolean)
          all = all.filter(c => {
            const py = normalizePinyin(c.pinyin?.toLowerCase() ?? '')
            const en = c.english?.toLowerCase() ?? ''
            // Exact character match
            if (c.char === search) return true
            // English match
            if (en.includes(s)) return true
            // Pinyin: every syllable the user typed must appear in the character's pinyin
            if (syllables.every(syl => py.includes(syl))) return true
            return false
          })
        }
        all.sort((a, b) => {
          const pa = normalizePinyin(a.pinyin?.toLowerCase() ?? a.char)
          const pb = normalizePinyin(b.pinyin?.toLowerCase() ?? b.char)
          return pa.localeCompare(pb)
        })
        const total = all.length
        const items = all.slice((page - 1) * limit, page * limit)
        resolve({ items, total })
      }
      req.onerror = () => reject(req.error)
    })
  },

  async getCharacterById(id: string): Promise<Character | undefined> {
    const store = await tx(STORE_CHARS)
    return new Promise((resolve, reject) => {
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  },

  async getMeta(key: string): Promise<unknown> {
    const store = await tx(STORE_META)
    return new Promise((resolve, reject) => {
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  },

  async setMeta(key: string, value: unknown): Promise<void> {
    const store = await tx(STORE_META, 'readwrite')
    return new Promise((resolve, reject) => {
      const req = store.put(value, key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  },

  async count(): Promise<number> {
    const store = await tx(STORE_CHARS)
    return new Promise((resolve, reject) => {
      const req = store.count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  },
}
