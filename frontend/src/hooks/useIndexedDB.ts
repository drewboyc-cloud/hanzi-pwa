import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { idb } from '../services/database'

export function useCharacterDB() {
  const [ready, setReady] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function init() {
      const count = await idb.count()
      const lastSync = await idb.getMeta('lastSync') as number | undefined

      const oneWeek = 7 * 24 * 60 * 60 * 1000
      const needsSync = count === 0 || !lastSync || Date.now() - lastSync > oneWeek

      if (needsSync) {
        setSyncing(true)
        try {
          const chars = await api.getAllCharacters()
          await idb.bulkPutCharacters(chars)
          await idb.setMeta('lastSync', Date.now())
          setTotal(chars.length)
        } catch (err) {
          console.error('Sync failed, using cached data:', err)
        } finally {
          setSyncing(false)
        }
      } else {
        setTotal(count)
      }
      setReady(true)
    }
    init()
  }, [])

  return { ready, syncing, total }
}
