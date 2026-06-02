import type { Word } from '../services/api'
import { PinyinDisplay } from './PinyinDisplay'

interface Props {
  words: Word[]
  favIds: Set<number>
  onToggleFav: (word: Word) => void
  onSelectWord: (word: Word) => void
  loading?: boolean
  emptyMessage?: string
}

export function WordResults({ words, favIds, onToggleFav, onSelectWord, loading, emptyMessage }: Props) {
  if (loading) {
    return <div className="text-paper/40 text-sm px-1 py-3">Searching…</div>
  }

  if (words.length === 0 && emptyMessage) {
    return <div className="text-paper/40 text-sm px-1 py-3">{emptyMessage}</div>
  }

  if (words.length === 0) return null

  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="text-paper/40 text-xs uppercase tracking-wider px-1 mb-1">
        Words ({words.length})
      </div>
      {words.map(word => (
        <div key={word.id} className="flex items-center gap-3 card py-2.5 px-3">

          {/* Tappable area → Word Detail */}
          <button
            onClick={() => onSelectWord(word)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
          >
            <span className="text-3xl font-hanzi leading-none shrink-0 w-14 text-center">
              {word.simplified}
            </span>
            <div className="flex-1 min-w-0">
              <PinyinDisplay raw={word.pinyin} size="sm" showNumber={true} />
              <p className="text-paper/60 text-xs mt-0.5 leading-snug line-clamp-2">
                {word.english}
              </p>
            </div>
          </button>

          {/* Favourite star — separate from tap area */}
          <button
            onClick={e => { e.stopPropagation(); onToggleFav(word) }}
            className={`text-xl shrink-0 transition-colors ${
              favIds.has(word.id) ? 'text-gold' : 'text-paper/20 hover:text-paper/50'
            }`}
            aria-label={favIds.has(word.id) ? 'Remove from favourites' : 'Add to favourites'}
          >
            {favIds.has(word.id) ? '★' : '☆'}
          </button>
        </div>
      ))}
    </div>
  )
}
