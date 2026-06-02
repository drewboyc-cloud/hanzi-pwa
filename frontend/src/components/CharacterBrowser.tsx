import { useState, useEffect, useCallback, useRef } from 'react'
import { idb } from '../services/database'
import type { Character, Word } from '../services/api'
import { SearchBar } from './SearchBar'
import { PinyinDisplay } from './PinyinDisplay'
import { WordResults } from './WordResults'

interface Props {
  onSelect: (char: Character) => void
  onSelectWord: (word: Word) => void
  favIds: Set<number>
  onToggleFav: (word: Word) => void
}

const PAGE_SIZE = 100
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

// Detect tone-number pinyin like "ai2", "lao3 shi1"
function hasToneNumbers(s: string) {
  return /[1-5]/.test(s)
}

export function CharacterBrowser({ onSelect, onSelectWord, favIds, onToggleFav }: Props) {
  const [chars, setChars] = useState<Character[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pinyin, setPinyin] = useState('')
  const [english, setEnglish] = useState('')
  const [loading, setLoading] = useState(false)
  const [words, setWords] = useState<Word[]>([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [activeLetter, setActiveLetter] = useState('')
  const [pendingScrollLetter, setPendingScrollLetter] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Load single characters from IndexedDB
  const load = useCallback(async (py: string, en: string, p: number) => {
    // Only show character grid when not doing English search and no tone numbers
    if (en || hasToneNumbers(py)) {
      setChars([])
      setTotal(0)
      return
    }
    setLoading(true)
    try {
      const { items, total } = await idb.getCharacters(py, en, p, PAGE_SIZE)
      setChars(items)
      setTotal(total)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load word results — from IndexedDB (works offline)
  const loadWords = useCallback(async (py: string, en: string) => {
    if (!en && !hasToneNumbers(py)) {
      setWords([])
      return
    }
    setWordsLoading(true)
    try {
      const results = await idb.searchWords(en, py, 30)
      setWords(results)
    } catch {
      setWords([])
    } finally {
      setWordsLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    load(pinyin, english, 1)
    loadWords(pinyin, english)
  }, [pinyin, english, load, loadWords])

  useEffect(() => {
    load(pinyin, english, page)
  }, [page, pinyin, english, load])

  const pages = Math.ceil(total / PAGE_SIZE)

  const groups: Record<string, Character[]> = {}
  chars.forEach(c => {
    const key = (c.pinyin?.[0] ?? '#').toUpperCase()
    ;(groups[key] ??= []).push(c)
  })

  const isSearching = pinyin !== '' || english !== ''
  const showWords = english !== '' || hasToneNumbers(pinyin)
  const availableLetters = new Set(Object.keys(groups))

  async function jumpToLetter(letter: string) {
    setActiveLetter(letter)
    const el = sectionRefs.current[letter]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    const targetPage = await idb.getPageForLetter(letter, PAGE_SIZE)
    setPage(targetPage)
    setPendingScrollLetter(letter)
  }

  useEffect(() => {
    if (!pendingScrollLetter || loading) return
    const el = sectionRefs.current[pendingScrollLetter]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setPendingScrollLetter(null)
    }
  }, [chars, pendingScrollLetter, loading])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) setActiveLetter(e.target.getAttribute('data-letter') ?? '')
        })
      },
      { root: container, threshold: 0.3 }
    )
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [chars])

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <div className="px-4 py-3">
          <SearchBar
            pinyin={pinyin}
            english={english}
            onPinyinChange={v => { setPinyin(v); setEnglish('') }}
            onEnglishChange={v => { setEnglish(v); setPinyin('') }}
          />
          {!isSearching && (
            <p className="text-paper/30 text-xs mt-1 ml-1">{total.toLocaleString()} characters</p>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4 pr-8">

          {/* Word results (English search or tone-number pinyin) */}
          {showWords && (
            <WordResults
              words={words}
              favIds={favIds}
              onToggleFav={onToggleFav}
              onSelectWord={onSelectWord}
              loading={wordsLoading}
              emptyMessage="No words found — try a different spelling"
            />
          )}

          {/* Character grid (plain pinyin browse) */}
          {!showWords && (
            loading ? (
              <div className="flex items-center justify-center h-32 text-paper/40">Loading…</div>
            ) : chars.length === 0 ? (
              <div className="text-center text-paper/40 mt-12">No characters found</div>
            ) : (
              Object.entries(groups).map(([letter, group]) => (
                <div
                  key={letter}
                  data-letter={letter}
                  ref={el => { sectionRefs.current[letter] = el }}
                  className="mb-4"
                >
                  <div className="text-gold text-xs font-bold uppercase tracking-widest mb-2 sticky top-0 bg-ink/90 backdrop-blur-sm py-1">
                    {letter}
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {group.map(c => (
                      <button
                        key={c.id}
                        onClick={() => onSelect(c)}
                        className="card flex flex-col items-center py-3 active:scale-95 transition-transform hover:bg-white/20"
                      >
                        <span className="text-3xl font-hanzi leading-none">{c.char}</span>
                        <span className="mt-1 text-center">
                          <PinyinDisplay raw={c.pinyin?.split(' ')[0]} size="sm" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {!showWords && pages > 1 && (
          <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-white/10">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost disabled:opacity-30">←</button>
            <span className="text-paper/60 text-sm">{page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-ghost disabled:opacity-30">→</button>
          </div>
        )}
      </div>

      {/* A–Z sidebar — only when browsing, not searching */}
      {!isSearching && (
        <div className="flex flex-col justify-center py-2 px-1 gap-0.5 select-none">
          {LETTERS.map(letter => (
            <button
              key={letter}
              onClick={() => jumpToLetter(letter)}
              className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded transition-colors ${
                activeLetter === letter
                  ? 'text-white bg-cinnabar'
                  : availableLetters.has(letter)
                  ? 'text-paper/70 hover:text-cinnabar'
                  : 'text-paper/20'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
