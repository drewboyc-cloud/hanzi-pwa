/**
 * Loads all stroke data from the single bundled all-strokes.json file.
 * Fetched once, cached by the service worker, works fully offline.
 */

let cache: Record<string, unknown> | null = null
let loading: Promise<Record<string, unknown>> | null = null

export async function getStrokeData(char: string): Promise<unknown> {
  if (!cache) {
    if (!loading) {
      loading = fetch('/hanzi-pwa/hanzi-data/all-strokes.json')
        .then(r => {
          if (!r.ok) throw new Error('Failed to load stroke data')
          return r.json()
        })
        .then(data => {
          cache = data
          loading = null
          return data
        })
    }
    await loading
  }
  return cache?.[char] ?? null
}
