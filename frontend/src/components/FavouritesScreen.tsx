import { useState } from 'react'
import type { Word } from '../services/api'
import { PinyinDisplay } from './PinyinDisplay'

interface Props {
  favourites: Word[]
  onToggleFav: (word: Word) => void
  onSelectWord: (word: Word) => void
}

export function FavouritesScreen({ favourites, onToggleFav, onSelectWord }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? favourites.filter(w =>
        w.simplified.includes(search) ||
        w.english?.toLowerCase().includes(search.toLowerCase()) ||
        w.pinyin?.toLowerCase().includes(search.toLowerCase())
      )
    : favourites

  if (favourites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-paper/40 gap-3 px-8 text-center">
        <span className="text-5xl">☆</span>
        <p className="text-lg">No favourites yet</p>
        <p className="text-sm">Search for a word and tap ☆ to save it here for offline access</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search within favourites */}
      <div className="px-4 py-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter favourites…"
          className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-paper placeholder:text-paper/30 outline-none focus:ring-2 focus:ring-gold"
        />
        <p className="text-paper/30 text-xs mt-1 ml-1">{filtered.length} of {favourites.length} saved words</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        {filtered.map(word => (
          <div key={word.id} className="card flex items-center gap-3 py-2.5 px-3">
            <button
              onClick={() => onSelectWord(word)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
            >
              <span className="text-4xl font-hanzi leading-none shrink-0 w-14 text-center">
                {word.simplified}
              </span>
              <div className="flex-1 min-w-0">
                <PinyinDisplay raw={word.pinyin} size="md" showNumber={true} />
                <p className="text-paper/60 text-sm mt-0.5 leading-snug line-clamp-2">
                  {word.english}
                </p>
                {word.traditional && word.traditional !== word.simplified && (
                  <p className="text-paper/30 text-xs mt-0.5 font-hanzi">
                    Traditional: {word.traditional}
                  </p>
                )}
              </div>
            </button>
            <button
              onClick={() => onToggleFav(word)}
              className="text-2xl text-gold shrink-0"
              aria-label="Remove from favourites"
            >
              ★
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
