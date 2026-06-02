import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { idb } from '../services/database'

export function useCharacterDB() {
  const [ready, setReady] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncLabel, setSyncLabel] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function init() {
      const count = await idb.count()
      const wordCount = await idb.wordCount()
      const lastSync = await idb.getMeta('lastSync') as number | undefined

      const oneWeek = 7 * 24 * 60 * 60 * 1000
      const needsSync = count === 0 || wordCount === 0 || !lastSync || Date.now() - lastSync > oneWeek

      if (needsSync) {
        setSyncing(true)
        try {
          // Sync characters
          setSyncLabel('Downloading characters…')
          const chars = await api.getAllCharacters()
          await idb.bulkPutCharacters(chars)
          setTotal(chars.length)

          // Sync words (125K entries — needed for offline search)
          setSyncLabel('Downloading dictionary…')
          const words = await api.getAllWords()
          await idb.bulkPutWords(words)

          await idb.setMeta('lastSync', Date.now())
        } catch (err) {
          console.error('Sync failed, using cached data:', err)
        } finally {
          setSyncing(false)
          setSyncLabel('')
        }
      } else {
        setTotal(count)
      }
      setReady(true)
    }
    init()
  }, [])

  return { ready, syncing, syncLabel, total }
}
