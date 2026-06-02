import type { Character, Word } from './api'

const DB_NAME = 'hanzi-pwa'
const DB_VERSION = 3          // v3: add words store
const STORE_CHARS = 'characters'
const STORE_META = 'meta'
const STORE_WORDS = 'words'
export const STORE_FAVS = 'favourites'

let _db: IDBDatabase | null = null

// Strip tone numbers (lao3 → lao) and tone diacritics (lǎo → lao) for flexible matching
function normalizePinyin(s: string): string {
  return s
    .replace(/[āáǎà]/g, 'a').replace(/[ēéěè]/g, 'e').replace(/[īíǐì]/g, 'i')
    .replace(/[ōóǒò]/g, 'o').replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜ]/g, 'u')
    .replace(/[1-5]/g, '')
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
      if (!db.objectStoreNames.contains(STORE_FAVS)) {
        db.createObjectStore(STORE_FAVS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_WORDS)) {
        const ws = db.createObjectStore(STORE_WORDS, { keyPath: 'id' })
        ws.createIndex('simplified', 'simplified', { unique: false })
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

  async bulkPutWords(words: Word[]): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE_WORDS, 'readwrite')
      const store = t.objectStore(STORE_WORDS)
      words.forEach(w => store.put(w))
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
    })
  },

  async searchWords(english: string, pinyin: string, limit = 30): Promise<Word[]> {
    const store = await tx(STORE_WORDS)
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => {
        let all: Word[] = req.result
        if (english) {
          const en = english.toLowerCase().trim()
          all = all.filter(w => w.english?.toLowerCase().includes(en))
        }
        if (pinyin) {
          const norm = normalizePinyin(pinyin.toLowerCase().trim())
          const syllables = norm.split(/\s+/).filter(Boolean)
          const hasTone = /[1-5]/.test(pinyin)
          all = all.filter(w => {
            const wNorm = normalizePinyin(w.pinyin?.toLowerCase() ?? '')
            if (hasTone) {
              // Tone number search: match full pinyin with tones
              return w.pinyin?.toLowerCase().includes(pinyin.toLowerCase()) ?? false
            }
            return syllables.every(syl => wNorm.includes(syl))
          })
        }
        // Sort: shorter words first (more common)
        all.sort((a, b) => (a.charCount ?? 9) - (b.charCount ?? 9))
        resolve(all.slice(0, limit))
      }
      req.onerror = () => reject(req.error)
    })
  },

  async wordCount(): Promise<number> {
    const store = await tx(STORE_WORDS)
    return new Promise((resolve, reject) => {
      const req = store.count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  },

  async getCharacters(pinyin = '', english = '', page = 1, limit = 50): Promise<{ items: Character[]; total: number }> {
    const store = await tx(STORE_CHARS)
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => {
        let all: Character[] = req.result
        if (pinyin) {
          const syllables = normalizePinyin(pinyin.toLowerCase().trim()).split(/\s+/).filter(Boolean)
          all = all.filter(c => {
            if (c.char === pinyin) return true
            const pySyllables = normalizePinyin(c.pinyin?.toLowerCase() ?? '').split(/\s+/)
            return syllables.every(syl => pySyllables.some(stored => stored.startsWith(syl)))
          })
        }
        if (english) {
          const en = english.toLowerCase().trim()
          all = all.filter(c => c.english?.toLowerCase().includes(en))
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

  async getPageForLetter(letter: string, limit: number): Promise<number> {
    const store = await tx(STORE_CHARS)
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => {
        const all: Character[] = req.result
        all.sort((a, b) => {
          const pa = normalizePinyin(a.pinyin?.toLowerCase() ?? a.char)
          const pb = normalizePinyin(b.pinyin?.toLowerCase() ?? b.char)
          return pa.localeCompare(pb)
        })
        const target = letter === '#' ? '#' : letter.toLowerCase()
        const idx = all.findIndex(c => {
          const first = normalizePinyin(c.pinyin?.toLowerCase() ?? c.char)[0] ?? '#'
          return letter === '#' ? !/[a-z]/.test(first) : first === target
        })
        resolve(idx < 0 ? 1 : Math.floor(idx / limit) + 1)
      }
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
