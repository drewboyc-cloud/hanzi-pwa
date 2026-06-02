import { useState, useEffect, useCallback } from 'react'
import type { Word } from '../services/api'
import { STORE_FAVS } from '../services/database'

// Re-use the same DB instance via a simple helper
function openFavDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('hanzi-pwa', 2)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('characters')) {
        const s = db.createObjectStore('characters', { keyPath: 'id' })
        s.createIndex('char', 'char', { unique: false })
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta')
      }
      if (!db.objectStoreNames.contains(STORE_FAVS)) {
        db.createObjectStore(STORE_FAVS, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<Word[]>([])
  const [favIds, setFavIds] = useState<Set<number>>(new Set())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const db = await openFavDB()
    const t = db.transaction(STORE_FAVS, 'readonly')
    const store = t.objectStore(STORE_FAVS)
    const req = store.getAll()
    req.onsuccess = () => {
      const items: Word[] = req.result
      setFavourites(items)
      setFavIds(new Set(items.map(w => w.id)))
    }
  }

  const add = useCallback(async (word: Word) => {
    const db = await openFavDB()
    return new Promise<void>((resolve) => {
      const t = db.transaction(STORE_FAVS, 'readwrite')
      t.objectStore(STORE_FAVS).put(word)
      t.oncomplete = () => {
        setFavourites(prev => [word, ...prev.filter(w => w.id !== word.id)])
        setFavIds(prev => new Set([...prev, word.id]))
        resolve()
      }
    })
  }, [])

  const remove = useCallback(async (id: number) => {
    const db = await openFavDB()
    return new Promise<void>((resolve) => {
      const t = db.transaction(STORE_FAVS, 'readwrite')
      t.objectStore(STORE_FAVS).delete(id)
      t.oncomplete = () => {
        setFavourites(prev => prev.filter(w => w.id !== id))
        setFavIds(prev => { const s = new Set(prev); s.delete(id); return s })
        resolve()
      }
    })
  }, [])

  const toggle = useCallback(async (word: Word) => {
    if (favIds.has(word.id)) {
      await remove(word.id)
    } else {
      await add(word)
    }
  }, [favIds, add, remove])

  return { favourites, favIds, toggle }
}
