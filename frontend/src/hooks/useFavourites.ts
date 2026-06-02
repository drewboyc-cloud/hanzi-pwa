import { useState, useEffect, useCallback } from 'react'
import type { Word } from '../services/api'
import { api } from '../services/api'
import { STORE_FAVS } from '../services/database'

function openFavDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('hanzi-pwa', 3)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('characters')) {
        const s = db.createObjectStore('characters', { keyPath: 'id' })
        s.createIndex('char', 'char', { unique: false })
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
      if (!db.objectStoreNames.contains(STORE_FAVS)) db.createObjectStore(STORE_FAVS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains('words')) {
        const ws = db.createObjectStore('words', { keyPath: 'id' })
        ws.createIndex('simplified', 'simplified', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGetAll(): Promise<Word[]> {
  const db = await openFavDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_FAVS, 'readonly').objectStore(STORE_FAVS).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(word: Word): Promise<void> {
  const db = await openFavDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_FAVS, 'readwrite')
    t.objectStore(STORE_FAVS).put(word)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

async function idbDelete(id: number): Promise<void> {
  const db = await openFavDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_FAVS, 'readwrite')
    t.objectStore(STORE_FAVS).delete(id)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<Word[]>([])
  const [favIds, setFavIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function init() {
      // Load local first so UI is instant
      const local = await idbGetAll()
      if (local.length > 0) {
        setFavourites(local)
        setFavIds(new Set(local.map(w => w.id)))
      }

      // Then sync from server (restores after reinstall)
      try {
        const remote = await api.getFavourites()
        if (remote.length > 0) {
          // Merge: save all remote to local IDB
          await Promise.all(remote.map(w => idbPut(w)))
          setFavourites(remote)
          setFavIds(new Set(remote.map(w => w.id)))
        }
      } catch {
        // Offline — local data already loaded above
      }
    }
    init()
  }, [])

  const add = useCallback(async (word: Word) => {
    // Update UI immediately
    setFavourites(prev => [word, ...prev.filter(w => w.id !== word.id)])
    setFavIds(prev => new Set([...prev, word.id]))
    // Save locally
    await idbPut(word)
    // Save to server (silently ignore if offline)
    api.addFavourite(word).catch(() => {})
  }, [])

  const remove = useCallback(async (id: number) => {
    // Update UI immediately
    setFavourites(prev => prev.filter(w => w.id !== id))
    setFavIds(prev => { const s = new Set(prev); s.delete(id); return s })
    // Remove locally
    await idbDelete(id)
    // Remove from server (silently ignore if offline)
    api.removeFavourite(id).catch(() => {})
  }, [])

  const toggle = useCallback(async (word: Word) => {
    if (favIds.has(word.id)) await remove(word.id)
    else await add(word)
  }, [favIds, add, remove])

  return { favourites, favIds, toggle }
}
