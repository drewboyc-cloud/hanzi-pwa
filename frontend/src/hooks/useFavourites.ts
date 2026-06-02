import { useState, useEffect, useCallback } from 'react'
import type { Word } from '../services/api'

const DB_NAME = 'hanzi-pwa'
const STORE = 'favourites'

function openFavDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2) // bump version to add store
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<Word[]>([])
  const [favIds, setFavIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const db = await openFavDB()
    const t = db.transaction(STORE, 'readonly')
    const store = t.objectStore(STORE)
    const req = store.getAll()
    req.onsuccess = () => {
      const items: Word[] = req.result
      setFavourites(items)
      setFavIds(new Set(items.map(w => w.id)))
    }
  }

  const add = useCallback(async (word: Word) => {
    const db = await openFavDB()
    const t = db.transaction(STORE, 'readwrite')
    t.objectStore(STORE).put(word)
    t.oncomplete = () => {
      setFavourites(prev => [word, ...prev.filter(w => w.id !== word.id)])
      setFavIds(prev => new Set([...prev, word.id]))
    }
  }, [])

  const remove = useCallback(async (id: number) => {
    const db = await openFavDB()
    const t = db.transaction(STORE, 'readwrite')
    t.objectStore(STORE).delete(id)
    t.oncomplete = () => {
      setFavourites(prev => prev.filter(w => w.id !== id))
      setFavIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
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
